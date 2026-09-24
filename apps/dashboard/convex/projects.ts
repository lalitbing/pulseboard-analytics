import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';

export const byApiKey = internalQuery({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    return await ctx.db
      .query('projects')
      .withIndex('by_apiKey', (q) => q.eq('apiKey', apiKey))
      .unique();
  },
});

// Run from the CLI: npx convex run projects:create '{"name":"Default Project","apiKey":"<key>"}'
export const create = internalMutation({
  args: { name: v.string(), apiKey: v.string() },
  handler: async (ctx, { name, apiKey }) => {
    if (apiKey.length < 24) throw new Error('apiKey must be at least 24 characters');
    const existing = await ctx.db
      .query('projects')
      .withIndex('by_apiKey', (q) => q.eq('apiKey', apiKey))
      .unique();
    if (existing) throw new Error('apiKey already in use');
    return await ctx.db.insert('projects', { name, apiKey });
  },
});
