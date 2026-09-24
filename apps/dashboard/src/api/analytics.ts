import { api } from '../../convex/_generated/api';
import { API_KEY, convex } from '../lib/convex';

export type Range = { from: string; to: string };

// The dashboard subscribes to its stats with `useQuery` (see App.tsx). This one-shot read is
// for the CSV export when the Events page (and its live subscription) isn't open.
export const getEvents = (range: Range) => convex.query(api.stats.events, { apiKey: API_KEY, ...range });

export const trackEvent = (eventName: string, queued: boolean = false, properties?: Record<string, unknown>) =>
  convex.mutation(api.events.track, { apiKey: API_KEY, event: { event: eventName, properties }, queued });
