import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, mutation, type MutationCtx } from './_generated/server';
import { MAX_BATCH_SIZE, requireProject, resolveCreatedAt, trackInput, utcDay, validateTrackInput, type TrackInput } from './lib';

type Ingest = {
  projectId: Id<'projects'>;
  eventName: string;
  userId?: string;
  sessionId?: string;
  properties?: unknown;
  createdAt: number;
};

async function insertEvent(ctx: MutationCtx, e: Ingest) {
  await ctx.db.insert('events', e);

  const day = utcDay(e.createdAt);
  const stat = await ctx.db
    .query('dailyStats')
    .withIndex('by_project_day_event', (q) => q.eq('projectId', e.projectId).eq('day', day).eq('eventName', e.eventName))
    .unique();

  if (stat) {
    await ctx.db.patch(stat._id, { count: stat.count + 1, lastSeen: Math.max(stat.lastSeen, e.createdAt) });
  } else {
    await ctx.db.insert('dailyStats', { projectId: e.projectId, day, eventName: e.eventName, count: 1, lastSeen: e.createdAt });
  }
}

// The async path: events are handed to the Convex scheduler (a durable queue) and written
// by `ingest` shortly after, instead of in the request's own transaction.
export const ingest = internalMutation({
  args: {
    projectId: v.id('projects'),
    eventName: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    properties: v.optional(v.any()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await insertEvent(ctx, args);
  },
});

export async function recordEvents(ctx: MutationCtx, projectId: Id<'projects'>, events: TrackInput[], queued: boolean) {
  if (events.length > MAX_BATCH_SIZE) throw new ConvexError(`At most ${MAX_BATCH_SIZE} events per batch`);
  for (const e of events) {
    const err = validateTrackInput(e);
    if (err) throw new ConvexError(err);
  }

  const now = Date.now();
  for (const e of events) {
    const row: Ingest = {
      projectId,
      eventName: e.event.trim(),
      userId: e.userId,
      sessionId: e.sessionId,
      properties: e.properties,
      createdAt: resolveCreatedAt(e.ts, now),
    };
    if (queued) {
      await ctx.scheduler.runAfter(0, internal.events.ingest, row);
    } else {
      await insertEvent(ctx, row);
    }
  }
}

// Used by the HTTP endpoints, which resolve the API key first.
export const record = internalMutation({
  args: { projectId: v.id('projects'), events: v.array(trackInput), queued: v.boolean() },
  handler: async (ctx, { projectId, events, queued }) => {
    await recordEvents(ctx, projectId, events, queued);
  },
});

// Used by the dashboard's "Track custom event" modal.
export const track = mutation({
  args: { apiKey: v.string(), event: trackInput, queued: v.optional(v.boolean()) },
  handler: async (ctx, { apiKey, event, queued }) => {
    const project = await requireProject(ctx, apiKey);
    await recordEvents(ctx, project._id, [event], queued ?? false);
    return { success: true, queued: queued ?? false };
  },
});
