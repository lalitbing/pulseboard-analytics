import { ConvexError, v, type Infer } from 'convex/values';
import type { QueryCtx } from './_generated/server';

export const MAX_EVENT_NAME_LENGTH = 200;
export const MAX_BATCH_SIZE = 100;

// Client-supplied timestamps (e.g. SDK offline buffer) are accepted within this window.
const MAX_PAST_SKEW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export const trackInput = v.object({
  event: v.string(),
  userId: v.optional(v.string()),
  sessionId: v.optional(v.string()),
  properties: v.optional(v.any()),
  ts: v.optional(v.number()),
});

export type TrackInput = Infer<typeof trackInput>;

export async function requireProject(ctx: QueryCtx, apiKey: string) {
  const project = await ctx.db
    .query('projects')
    .withIndex('by_apiKey', (q) => q.eq('apiKey', apiKey))
    .unique();
  if (!project) throw new ConvexError('Invalid API key');
  return project;
}

// Returns an error message, or null when the event is valid.
export function validateTrackInput(e: TrackInput): string | null {
  if (typeof e.event !== 'string' || !e.event.trim()) return '`event` is required';
  if (e.event.length > MAX_EVENT_NAME_LENGTH) return `\`event\` must be at most ${MAX_EVENT_NAME_LENGTH} characters`;
  if (e.properties !== undefined && (e.properties === null || typeof e.properties !== 'object' || Array.isArray(e.properties))) {
    return '`properties` must be a JSON object';
  }
  return null;
}

export function resolveCreatedAt(ts: number | undefined, now: number) {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return now;
  if (ts < now - MAX_PAST_SKEW_MS || ts > now + MAX_FUTURE_SKEW_MS) return now;
  return ts;
}

export const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// `from`/`to` are `YYYY-MM-DD` (UTC day boundaries) or full ISO timestamps.
export function parseRange(from?: string, to?: string) {
  if (!from || !to) return null;
  const start = from.includes('T') ? Date.parse(from) : Date.parse(`${from}T00:00:00.000Z`);
  const end = to.includes('T') ? Date.parse(to) : Date.parse(`${to}T23:59:59.999Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) throw new ConvexError('Invalid date range');
  return { start, end, fromDay: utcDay(start), toDay: utcDay(end) };
}
