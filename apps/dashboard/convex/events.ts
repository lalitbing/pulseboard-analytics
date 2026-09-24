import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, mutation, type MutationCtx } from './_generated/server';
import { rateLimiter } from './rateLimits';
import { MAX_BATCH_SIZE, requireProject, resolveCreatedAt, trackInput, reportDay, validateTrackInput, type TrackInput } from './lib';

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

  const day = reportDay(e.createdAt);
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
  await rateLimiter.limit(ctx, 'trackEvents', { key: projectId, count: events.length, throws: true });

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

// Maintenance: recompute dailyStats from raw events (e.g. after changing the reporting time zone).
// Reads every event in one transaction, so it only suits small datasets.
// Run: npx convex run events:rebuildDailyStats
export const rebuildDailyStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const s of await ctx.db.query('dailyStats').collect()) {
      await ctx.db.delete(s._id);
    }

    const rows = new Map<string, { projectId: Id<'projects'>; day: string; eventName: string; count: number; lastSeen: number }>();
    for (const e of await ctx.db.query('events').collect()) {
      const day = reportDay(e.createdAt);
      const key = `${e.projectId}|${day}|${e.eventName}`;
      const row = rows.get(key);
      if (row) {
        row.count += 1;
        row.lastSeen = Math.max(row.lastSeen, e.createdAt);
      } else {
        rows.set(key, { projectId: e.projectId, day, eventName: e.eventName, count: 1, lastSeen: e.createdAt });
      }
    }
    for (const row of rows.values()) {
      await ctx.db.insert('dailyStats', row);
    }
    return { rows: rows.size };
  },
});
