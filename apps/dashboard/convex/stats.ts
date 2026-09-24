import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { query, type QueryCtx } from './_generated/server';
import { parseRange, requireProject } from './lib';

const RECENT_LIMIT = 8;
const MAX_EVENTS_LIMIT = 500;

const rangeArgs = { apiKey: v.string(), from: v.optional(v.string()), to: v.optional(v.string()) };

export async function buildSummary(ctx: QueryCtx, projectId: Id<'projects'>, from?: string, to?: string) {
  const range = parseRange(from, to);

  const stats = await ctx.db
    .query('dailyStats')
    .withIndex('by_project_day_event', (q) =>
      range ? q.eq('projectId', projectId).gte('day', range.fromDay).lte('day', range.toDay) : q.eq('projectId', projectId)
    )
    .collect();

  const daily = new Map<string, number>();
  const byName = new Map<string, { count: number; lastSeen: number }>();
  for (const s of stats) {
    daily.set(s.day, (daily.get(s.day) ?? 0) + s.count);
    const prev = byName.get(s.eventName);
    byName.set(s.eventName, {
      count: (prev?.count ?? 0) + s.count,
      lastSeen: Math.max(prev?.lastSeen ?? 0, s.lastSeen),
    });
  }

  // Sort by frequency (descending), then recency (descending), then name (ascending)
  const top = [...byName.entries()]
    .map(([event_name, s]) => ({ event_name, count: s.count, last_seen: new Date(s.lastSeen).toISOString() }))
    .sort((a, b) => b.count - a.count || b.last_seen.localeCompare(a.last_seen) || a.event_name.localeCompare(b.event_name));

  return {
    total: stats.reduce((n, s) => n + s.count, 0),
    daily: [...daily.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    top,
  };
}

async function latestEvents(ctx: QueryCtx, projectId: Id<'projects'>, limit: number, from?: string, to?: string) {
  const range = parseRange(from, to);
  const rows = await ctx.db
    .query('events')
    .withIndex('by_project_createdAt', (q) =>
      range ? q.eq('projectId', projectId).gte('createdAt', range.start).lte('createdAt', range.end) : q.eq('projectId', projectId)
    )
    .order('desc')
    .take(limit);
  return rows.map((e) => ({
    event_name: e.eventName,
    created_at: new Date(e.createdAt).toISOString(),
    properties: e.properties ?? null,
  }));
}

// KPIs, chart and top events for the Overview page, plus the latest few events.
export const summary = query({
  args: rangeArgs,
  handler: async (ctx, { apiKey, from, to }) => {
    const project = await requireProject(ctx, apiKey);
    const s = await buildSummary(ctx, project._id, from, to);
    return { ...s, recent: await latestEvents(ctx, project._id, RECENT_LIMIT, from, to) };
  },
});

// Raw events for the Events page and CSV export, newest first.
export const events = query({
  args: { ...rangeArgs, limit: v.optional(v.number()) },
  handler: async (ctx, { apiKey, from, to, limit }) => {
    const project = await requireProject(ctx, apiKey);
    const n = Math.min(Math.max(1, Math.floor(limit ?? MAX_EVENTS_LIMIT)), MAX_EVENTS_LIMIT);
    return await latestEvents(ctx, project._id, n, from, to);
  },
});

// Returns null (rather than throwing) for an unknown key, so the dashboard can show a status
// instead of crashing its live queries.
export const projectInfo = query({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_apiKey', (q) => q.eq('apiKey', apiKey))
      .unique();
    return project ? { id: project._id, name: project.name } : null;
  },
});
