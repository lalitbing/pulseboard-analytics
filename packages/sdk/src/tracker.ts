import { EventBuffer, type StoredEvent } from "./buffer.js"
import type { AnalyticsOptions, Properties, TrackOptions, TrackPayload } from "./types.js"

const BATCH_SIZE = 100 // server maximum per /batch request
const MAX_EVENT_NAME_LENGTH = 200
const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000
const BASE_RETRY_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 60 * 1000
// Browsers reject keepalive requests with bodies over 64 KiB.
const KEEPALIVE_MAX_BYTES = 60 * 1024

const USER_KEY = "pulseboard:userId"
const SESSION_KEY = "pulseboard:session"
const FLUSH_LOCK = "pulseboard:flush"

type SendResult =
  | { kind: "ok" }
  | { kind: "retry"; retryAfterMs?: number } // network error, 429, 5xx
  | { kind: "drop"; status: number; error: string } // other 4xx: retrying won't help

const isBrowser = typeof window !== "undefined"
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false

// localStorage with an in-memory fallback (storage can be disabled or throw in private modes).
const memoryStorage = new Map<string, string>()
const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key)
    } catch {
      return memoryStorage.get(key) ?? null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      memoryStorage.set(key, value)
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key)
    } catch {
      memoryStorage.delete(key)
    }
  },
}

const randomId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

function parseRetryAfter(header: string | null) {
  if (!header) return undefined
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(header)
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now())
}

function validate(event: unknown, properties: unknown): string | null {
  if (typeof event !== "string" || !event.trim()) return "event name must be a non-empty string"
  if (event.length > MAX_EVENT_NAME_LENGTH) return `event name must be at most ${MAX_EVENT_NAME_LENGTH} characters`
  if (properties !== undefined && (properties === null || typeof properties !== "object" || Array.isArray(properties))) {
    return "properties must be a plain object"
  }
  return null
}

export class Analytics {
  readonly apiKey: string
  readonly endpoint: string
  private readonly options: Required<Pick<AnalyticsOptions, "queued" | "sessionTimeoutMs" | "debug">>
  // Only browsers get an offline buffer; on the server, failed events are dropped with a warning.
  private readonly buffer: EventBuffer | null
  private userId: string | undefined
  private flushing: Promise<void> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private retryAttempt = 0
  private readonly cleanups: (() => void)[] = []

  /**
   * @param apiKey Project API key.
   * @param endpoint Track URL, e.g. `https://<deployment>.convex.site/api/track`.
   */
  constructor(apiKey: string, endpoint: string, options: AnalyticsOptions = {}) {
    this.apiKey = apiKey
    this.endpoint = endpoint.replace(/\/+$/, "")
    this.options = {
      queued: options.queued ?? false,
      sessionTimeoutMs: options.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS,
      debug: options.debug ?? false,
    }
    this.buffer = isBrowser ? new EventBuffer((...args) => this.log(...args)) : null
    this.userId = isBrowser ? storage.get(USER_KEY) ?? undefined : undefined

    if (isBrowser) {
      const onOnline = () => void this.flush()
      window.addEventListener("online", onOnline)
      this.cleanups.push(() => window.removeEventListener("online", onOnline))

      if (typeof document !== "undefined") {
        const onHidden = () => {
          if (document.visibilityState === "hidden") void this.flush()
        }
        document.addEventListener("visibilitychange", onHidden)
        this.cleanups.push(() => document.removeEventListener("visibilitychange", onHidden))
      }

      // Deliver anything left over from a previous page load.
      void this.flush()
    }
  }

  /** Attach a user id to all following events (persisted across reloads in browsers). */
  identify(userId: string) {
    this.userId = userId
    if (isBrowser) storage.set(USER_KEY, userId)
  }

  /** Forget the user and start a new session, e.g. on logout. */
  reset() {
    this.userId = undefined
    if (isBrowser) {
      storage.remove(USER_KEY)
      storage.remove(SESSION_KEY)
    }
  }

  /**
   * Track an event. Resolves once the event is delivered or safely buffered; it never throws.
   * Events that can't be sent now (offline, network error, rate limit, server error) are buffered
   * and retried with backoff. Events the API rejects (e.g. invalid key) are dropped with a warning.
   */
  async track(event: string, properties?: Properties, options: TrackOptions = {}): Promise<void> {
    const invalid = validate(event, properties)
    if (invalid) {
      console.warn(`[pulseboard] Event not tracked: ${invalid}`)
      return
    }

    const payload: TrackPayload = {
      event,
      properties,
      userId: this.userId,
      sessionId: this.sessionId(),
      ts: Date.now(),
      queued: options.queued ?? this.options.queued,
    }

    if (isOffline()) {
      await this.enqueue(payload)
      return
    }

    const result = await this.post(this.endpoint, payload)
    if (result.kind === "retry") {
      await this.enqueue(payload)
      this.scheduleRetry(result.retryAfterMs)
    } else if (result.kind === "drop") {
      console.warn(`[pulseboard] Event "${event}" rejected (${result.status}): ${result.error}`)
    }
  }

  /** Send buffered events now. Concurrent calls share one flush. */
  flush(): Promise<void> {
    if (!this.buffer) return Promise.resolve()
    if (!this.flushing) {
      this.flushing = this.withFlushLock(() => this.drain())
        .catch((err) => this.log("Flush failed", err))
        .finally(() => {
          this.flushing = null
        })
    }
    return this.flushing
  }

  /** Remove listeners and timers (e.g. when unmounting in a single-page app). */
  destroy() {
    for (const cleanup of this.cleanups.splice(0)) cleanup()
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
  }

  private async drain() {
    const buffer = this.buffer!
    while (!isOffline()) {
      const rows = await buffer.read(BATCH_SIZE)
      if (!rows.length) {
        this.retryAttempt = 0
        return
      }

      // The API takes one `queued` flag per request, so send each flag's events separately.
      for (const group of [rows.filter((r) => !r.value.queued), rows.filter((r) => r.value.queued)]) {
        if (!group.length) continue
        const result = await this.post(`${this.endpoint}/batch`, {
          events: group.map((r: StoredEvent) => r.value),
          queued: group[0].value.queued ?? false,
        })
        if (result.kind === "retry") {
          this.scheduleRetry(result.retryAfterMs)
          return
        }
        if (result.kind === "drop") {
          console.warn(`[pulseboard] Dropped ${group.length} buffered events (${result.status}): ${result.error}`)
        }
        await buffer.remove(group)
        this.log(`Flushed ${group.length} buffered events`)
      }
    }
  }

  private async enqueue(payload: TrackPayload) {
    if (!this.buffer) {
      console.warn(`[pulseboard] Event "${payload.event}" could not be sent and there is no offline buffer outside the browser`)
      return
    }
    try {
      await this.buffer.add(payload)
      this.log(`Buffered "${payload.event}"`)
    } catch (err) {
      console.warn(`[pulseboard] Failed to buffer "${payload.event}"`, err)
    }
  }

  private async post(url: string, body: unknown): Promise<SendResult> {
    const json = JSON.stringify(body)
    let res: Response
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": this.apiKey },
        body: json,
        // Lets the request finish if the page is closing.
        keepalive: json.length < KEEPALIVE_MAX_BYTES,
      })
    } catch (err) {
      this.log("Network error", err)
      return { kind: "retry" }
    }
    if (res.ok) return { kind: "ok" }
    if (res.status === 429 || res.status >= 500) {
      return { kind: "retry", retryAfterMs: parseRetryAfter(res.headers.get("Retry-After")) }
    }
    const error = await res.text().catch(() => "")
    return { kind: "drop", status: res.status, error }
  }

  private scheduleRetry(retryAfterMs?: number) {
    if (!this.buffer || this.retryTimer) return
    const backoff = Math.min(BASE_RETRY_DELAY_MS * 2 ** this.retryAttempt, MAX_RETRY_DELAY_MS)
    // Jitter so many clients don't retry in lockstep.
    const delay = (retryAfterMs ?? backoff) + Math.random() * 1000
    this.retryAttempt++
    this.log(`Retrying in ${Math.round(delay)}ms`)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      void this.flush()
    }, delay)
  }

  // With several tabs open, only one flushes the shared IndexedDB buffer at a time, so events
  // aren't sent twice. Falls back to no lock where the Web Locks API is unavailable.
  private async withFlushLock(fn: () => Promise<void>) {
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined
    if (!locks) return fn()
    await locks.request(FLUSH_LOCK, { ifAvailable: true }, async (lock) => {
      if (lock) await fn()
    })
  }

  private sessionId(): string | undefined {
    if (!isBrowser) return undefined
    const now = Date.now()
    let session: { id: string; lastSeen: number } | null = null
    try {
      session = JSON.parse(storage.get(SESSION_KEY) ?? "null")
    } catch {
      session = null
    }
    if (!session?.id || now - session.lastSeen > this.options.sessionTimeoutMs) {
      session = { id: randomId(), lastSeen: now }
    } else {
      session.lastSeen = now
    }
    storage.set(SESSION_KEY, JSON.stringify(session))
    return session.id
  }

  private log(...args: unknown[]) {
    if (this.options.debug) console.log("[pulseboard]", ...args)
  }
}
