import { ConvexReactClient } from 'convex/react';

const convexUrl = import.meta.env.VITE_CONVEX_URL || '';

export const API_KEY: string = import.meta.env.VITE_API_KEY || '';

// Public REST API (Convex HTTP actions), shown in the Integration snippets.
export const API_URL = `${import.meta.env.VITE_CONVEX_SITE_URL || convexUrl.replace(/\.cloud$/, '.site')}/api`;

export const isConvexConfigured = Boolean(convexUrl && API_KEY);

// ConvexReactClient requires an absolute URL; fall back to a placeholder so the UI can
// still render its "missing config" state instead of crashing on import.
export const convex = new ConvexReactClient(convexUrl || 'https://missing-config.convex.cloud');
