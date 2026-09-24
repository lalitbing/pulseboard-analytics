export type Properties = Record<string, unknown>

export interface AnalyticsOptions {
  /** Send events through the server's async queue (Convex scheduler) by default. */
  queued?: boolean
  /** Start a new session after this much inactivity. Default: 30 minutes. */
  sessionTimeoutMs?: number
  /** Log SDK activity to the console. */
  debug?: boolean
}

export interface TrackOptions {
  /** Overrides `AnalyticsOptions.queued` for this event. */
  queued?: boolean
}

/** An event as sent to the API (and as stored in the offline buffer). */
export interface TrackPayload {
  event: string
  properties?: Properties
  userId?: string
  sessionId?: string
  /** Client timestamp (ms). The server accepts it if it's within the last 7 days. */
  ts: number
  queued?: boolean
}
