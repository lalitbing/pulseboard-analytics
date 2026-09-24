import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  projects: defineTable({
    name: v.string(),
    apiKey: v.string(),
  }).index('by_apiKey', ['apiKey']),

  // Raw events. `createdAt` is the time the API received the event (ms since epoch),
  // so queued events keep their receive time rather than their processing time.
  events: defineTable({
    projectId: v.id('projects'),
    eventName: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    properties: v.optional(v.any()),
    createdAt: v.number(),
  }).index('by_project_createdAt', ['projectId', 'createdAt']),

  // Daily rollup per (project, IST day, event name). The dashboard reads these instead of
  // scanning raw events, which keeps reads small enough for the Convex free tier.
  dailyStats: defineTable({
    projectId: v.id('projects'),
    day: v.string(), // YYYY-MM-DD (IST)
    eventName: v.string(),
    count: v.number(),
    lastSeen: v.number(),
  }).index('by_project_day_event', ['projectId', 'day', 'eventName']),
});
