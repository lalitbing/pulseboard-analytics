import { httpRouter } from 'convex/server';
import { ConvexError } from 'convex/values';
import { api, internal } from './_generated/api';
import { httpAction, type ActionCtx } from './_generated/server';
import type { TrackInput } from './lib';

// Public REST API, served at https://<deployment>.convex.site/api/...
// Same paths as the old Express API so the SDK and curl snippets keep working.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  'Access-Control-Max-Age': '86400',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const errorMessage = (err: unknown) =>
  err instanceof ConvexError ? String(err.data) : 'Internal error';

async function resolveProject(ctx: ActionCtx, req: Request) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return { error: json({ error: 'API key missing' }, 401) };
  const project = await ctx.runQuery(internal.projects.byApiKey, { apiKey });
  if (!project) return { error: json({ error: 'Invalid API key' }, 403) };
  return { project, apiKey };
}

type Body = Record<string, unknown> | null;

async function readJson(req: Request): Promise<Body> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

// `queued` (or the legacy `useRedis`) routes the event through the Convex scheduler.
const isQueued = (req: Request, body: Body) => {
  const q = new URL(req.url).searchParams;
  return body?.queued === true || body?.useRedis === true || q.get('queued') === 'true' || q.get('useRedis') === 'true';
};

const toTrackInput = (raw: unknown): TrackInput => {
  const e = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    event: typeof e.event === 'string' ? e.event : '',
    userId: typeof e.userId === 'string' ? e.userId : undefined,
    sessionId: typeof e.sessionId === 'string' ? e.sessionId : undefined,
    properties: e.properties,
    ts: typeof e.ts === 'number' ? e.ts : undefined,
  };
};

async function recordFromRequest(ctx: ActionCtx, req: Request, getEvents: (body: Body) => unknown) {
  const resolved = await resolveProject(ctx, req);
  if (resolved.error) return resolved.error;

  const body = await readJson(req);
  const events = getEvents(body);
  if (!Array.isArray(events) || events.length === 0) return json({ error: 'No events in request body' }, 400);

  const queued = isQueued(req, body);
  try {
    await ctx.runMutation(internal.events.record, {
      projectId: resolved.project._id,
      events: events.map(toTrackInput),
      queued,
    });
  } catch (err) {
    if (err instanceof ConvexError) return json({ error: errorMessage(err) }, 400);
    throw err;
  }
  return json({ success: true, queued });
}

const http = httpRouter();

http.route({
  path: '/api/track',
  method: 'POST',
  handler: httpAction((ctx, req) => recordFromRequest(ctx, req, (body) => (body ? [body] : null))),
});

http.route({
  path: '/api/track/batch',
  method: 'POST',
  handler: httpAction((ctx, req) => recordFromRequest(ctx, req, (body) => body?.events)),
});

const statsHandler = (pick: 'events' | 'top-events') =>
  httpAction(async (ctx, req) => {
    const resolved = await resolveProject(ctx, req);
    if (resolved.error) return resolved.error;

    const q = new URL(req.url).searchParams;
    try {
      const s = await ctx.runQuery(api.stats.summary, {
        apiKey: resolved.apiKey,
        from: q.get('from') ?? undefined,
        to: q.get('to') ?? undefined,
      });
      return pick === 'events'
        ? json({ total: s.total, daily: s.daily })
        : json({ top: s.top.slice(0, 5), total: s.total });
    } catch (err) {
      if (err instanceof ConvexError) return json({ error: errorMessage(err) }, 400);
      throw err;
    }
  });

http.route({ path: '/api/stats/events', method: 'GET', handler: statsHandler('events') });
http.route({ path: '/api/stats/top-events', method: 'GET', handler: statsHandler('top-events') });

http.route({
  path: '/api/project-info',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const resolved = await resolveProject(ctx, req);
    if (resolved.error) return resolved.error;
    return json({ id: resolved.project._id, project_id: resolved.project._id, name: resolved.project.name });
  }),
});

http.route({
  path: '/api/health',
  method: 'GET',
  handler: httpAction(async () => json({ status: 'ok' })),
});

http.route({
  pathPrefix: '/api/',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS })),
});

export default http;
