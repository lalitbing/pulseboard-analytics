import type { AnalyticsOptions, Properties, TrackOptions } from "./types.js";
export declare class Analytics {
    readonly apiKey: string;
    readonly endpoint: string;
    private readonly options;
    private readonly buffer;
    private userId;
    private flushing;
    private retryTimer;
    private retryAttempt;
    private readonly cleanups;
    /**
     * @param apiKey Project API key.
     * @param endpoint Track URL, e.g. `https://<deployment>.convex.site/api/track`.
     */
    constructor(apiKey: string, endpoint: string, options?: AnalyticsOptions);
    /** Attach a user id to all following events (persisted across reloads in browsers). */
    identify(userId: string): void;
    /** Forget the user and start a new session, e.g. on logout. */
    reset(): void;
    /**
     * Track an event. Resolves once the event is delivered or safely buffered; it never throws.
     * Events that can't be sent now (offline, network error, rate limit, server error) are buffered
     * and retried with backoff. Events the API rejects (e.g. invalid key) are dropped with a warning.
     */
    track(event: string, properties?: Properties, options?: TrackOptions): Promise<void>;
    /** Send buffered events now. Concurrent calls share one flush. */
    flush(): Promise<void>;
    /** Remove listeners and timers (e.g. when unmounting in a single-page app). */
    destroy(): void;
    private drain;
    private enqueue;
    private post;
    private scheduleRetry;
    private withFlushLock;
    private sessionId;
    private log;
}
