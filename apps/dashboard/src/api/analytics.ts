import { api } from '../../convex/_generated/api';
import { API_KEY, convex } from '../lib/convex';

export type Range = { from: string; to: string };

// One-shot reads, used when Real-time mode is off. Real-time mode subscribes to the
// same queries with `useQuery` instead (see App.tsx).
export const getSummary = (range: Range) => convex.query(api.stats.summary, { apiKey: API_KEY, ...range });

export const getEvents = (range: Range) => convex.query(api.stats.events, { apiKey: API_KEY, ...range });

export const getProjectInfo = () => convex.query(api.stats.projectInfo, { apiKey: API_KEY });

export const trackEvent = (eventName: string, queued: boolean = false, properties?: Record<string, unknown>) =>
  convex.mutation(api.events.track, { apiKey: API_KEY, event: { event: eventName, properties }, queued });
