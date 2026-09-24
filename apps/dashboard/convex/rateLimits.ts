import { MINUTE, RateLimiter, isRateLimitError } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';

// Limits are per project (keyed by project id), since the API key is the caller's identity.
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Each tracked event costs one token, so a full batch of 100 uses the whole burst.
  trackEvents: { kind: 'token bucket', rate: 100, period: MINUTE, capacity: 100 },
  // Stats reads over the public HTTP API. The dashboard's own queries aren't limited.
  apiReads: { kind: 'token bucket', rate: 60, period: MINUTE, capacity: 30 },
});

export { isRateLimitError };
