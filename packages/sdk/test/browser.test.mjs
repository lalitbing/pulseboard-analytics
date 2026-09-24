import "fake-indexeddb/auto"
import { IDBFactory } from "fake-indexeddb"
import { test, beforeEach, after } from "node:test"
import assert from "node:assert/strict"

// Browser-like globals must exist before the SDK module is evaluated.
globalThis.window = new EventTarget()
const { net, calls, respondWith, resetFetch, sleep, silenceWarnings } = await import("./helpers.mjs")
const { Analytics } = await import("../dist/index.js")

const URL_ = "https://example.convex.site/api/track"
const buffered = (a) => a.buffer.read(10_000)

let current
const make = (opts) => (current = new Analytics("key_123", URL_, opts))

beforeEach(async () => {
  current?.destroy()
  await current?.flushing
  globalThis.indexedDB = new IDBFactory() // fresh buffer per test
  resetFetch()
  net.online = true
})

after(() => current?.destroy())

test("sends an event with key, session and timestamp", async () => {
  const a = make()
  await a.flush()
  await a.track("signup", { plan: "pro" })
  assert.equal(calls.length, 1)
  const [c] = calls
  assert.equal(c.url, URL_)
  assert.equal(c.init.headers["x-api-key"], "key_123")
  assert.equal(c.init.keepalive, true)
  assert.equal(c.body.event, "signup")
  assert.deepEqual(c.body.properties, { plan: "pro" })
  assert.equal(c.body.queued, false)
  assert.ok(c.body.sessionId)
  assert.ok(Math.abs(c.body.ts - Date.now()) < 5000)
})

test("buffers on 5xx and delivers on the next flush", async () => {
  const a = make()
  await a.flush()
  respondWith(() => new Response("boom", { status: 500 }))
  await a.track("e1")
  assert.equal((await buffered(a)).length, 1)

  resetFetch()
  await a.flush()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, `${URL_}/batch`)
  assert.equal(calls[0].body.events[0].event, "e1")
  assert.equal((await buffered(a)).length, 0)
})

test("buffers on network error", async () => {
  const a = make()
  await a.flush()
  respondWith(() => {
    throw new TypeError("Failed to fetch")
  })
  await a.track("e1")
  assert.equal((await buffered(a)).length, 1)
})

test("on 429 retries automatically after Retry-After", async () => {
  const a = make()
  await a.flush()
  let first = true
  respondWith(() => {
    if (first) {
      first = false
      return new Response('{"error":"Rate limit exceeded"}', { status: 429, headers: { "Retry-After": "1" } })
    }
    return new Response("{}", { status: 200 })
  })
  await a.track("e1")
  assert.equal((await buffered(a)).length, 1)
  await sleep(2300) // 1s Retry-After + up to 1s jitter
  assert.equal(calls.at(-1).url, `${URL_}/batch`)
  assert.equal((await buffered(a)).length, 0)
})

test("drops events the API rejects (400) with a warning", async () => {
  const w = silenceWarnings()
  try {
    const a = make()
    await a.flush()
    respondWith(() => new Response('{"error":"bad"}', { status: 400 }))
    await a.track("e1")
    assert.equal((await buffered(a)).length, 0)
    assert.match(w.warnings.join("\n"), /rejected \(400\)/)
  } finally {
    w.restore()
  }
})

test("offline: buffers without a request, flushes on the online event", async () => {
  const a = make()
  await a.flush()
  net.online = false
  await a.track("e1")
  await a.track("e2")
  assert.equal(calls.length, 0)
  assert.equal((await buffered(a)).length, 2)

  net.online = true
  window.dispatchEvent(new Event("online"))
  await sleep(50)
  await a.flush()
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].body.events.map((e) => e.event), ["e1", "e2"])
  assert.equal((await buffered(a)).length, 0)
})

test("flushes in batches of at most 100", async () => {
  const a = make()
  await a.flush()
  net.online = false
  for (let i = 0; i < 250; i++) await a.track(`e${i}`)
  net.online = true
  await a.flush()
  assert.deepEqual(calls.map((c) => c.body.events.length), [100, 100, 50])
  assert.equal((await buffered(a)).length, 0)
})

test("keeps the buffer when a flush fails", async () => {
  const a = make()
  await a.flush()
  net.online = false
  await a.track("e1")
  net.online = true
  respondWith(() => new Response("boom", { status: 503 }))
  await a.flush()
  assert.equal((await buffered(a)).length, 1)
})

test("events buffered during a flush are not cleared by it", async () => {
  const a = make()
  await a.flush()
  net.online = false
  await a.track("before")
  net.online = true

  let release
  respondWith(() => new Promise((r) => (release = () => r(new Response("{}", { status: 200 })))))
  const flushing = a.flush()
  await sleep(20)
  net.online = false // stop the drain loop after this batch
  await a.track("during")
  release()
  await flushing
  assert.deepEqual((await buffered(a)).map((r) => r.value.event), ["during"])
})

test("groups buffered events by queued flag", async () => {
  const a = make()
  await a.flush()
  net.online = false
  await a.track("inline")
  await a.track("async", undefined, { queued: true })
  net.online = true
  await a.flush()
  const sent = calls.map((c) => [c.body.queued, c.body.events.map((e) => e.event)])
  assert.deepEqual(sent, [
    [false, ["inline"]],
    [true, ["async"]],
  ])
})

test("identify attaches userId; reset clears it and starts a new session", async () => {
  const a = make()
  await a.flush()
  a.identify("user_42")
  await a.track("e1")
  await a.track("e2")
  assert.equal(calls[0].body.userId, "user_42")
  assert.equal(calls[0].body.sessionId, calls[1].body.sessionId)

  a.reset()
  await a.track("e3")
  assert.equal(calls[2].body.userId, undefined)
  assert.notEqual(calls[2].body.sessionId, calls[0].body.sessionId)
})

test("starts a new session after the inactivity timeout", async () => {
  const a = make({ sessionTimeoutMs: 50 })
  await a.flush()
  await a.track("e1")
  await sleep(80)
  await a.track("e2")
  assert.notEqual(calls[0].body.sessionId, calls[1].body.sessionId)
})

test("invalid input is rejected client-side", async () => {
  const w = silenceWarnings()
  try {
    const a = make()
    await a.flush()
    await a.track("")
    await a.track("x".repeat(201))
    await a.track("ok", ["not", "an", "object"])
    assert.equal(calls.length, 0)
    assert.equal(w.warnings.length, 3)
  } finally {
    w.restore()
  }
})

test("delivers events left from a previous page load on startup", async () => {
  const a = make()
  await a.flush()
  net.online = false
  await a.track("from_last_visit")
  a.destroy()

  net.online = true
  const b = make() // same IndexedDB, like a reload
  await sleep(20)
  await b.flush()
  assert.deepEqual(calls.at(-1).body.events.map((e) => e.event), ["from_last_visit"])
})

test("track never throws, even when IndexedDB is unavailable", async () => {
  delete globalThis.indexedDB
  const a = make()
  respondWith(() => new Response("boom", { status: 500 }))
  await a.track("e1") // falls back to the in-memory buffer
  assert.equal((await buffered(a)).length, 1)
})
