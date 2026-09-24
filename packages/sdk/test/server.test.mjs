import { test } from "node:test"
import assert from "node:assert/strict"
import { calls, respondWith, silenceWarnings } from "./helpers.mjs"

// No `window`: behaves like server-side rendering / Node.
const { Analytics } = await import("../dist/index.js")

test("works without window: sends directly, no session, no buffer", async () => {
  const a = new Analytics("key_123", "https://example.convex.site/api/track/")
  await a.track("server_event", { from: "ssr" })
  assert.equal(calls[0].url, "https://example.convex.site/api/track")
  assert.equal(calls[0].body.sessionId, undefined)

  const w = silenceWarnings()
  try {
    respondWith(() => new Response("boom", { status: 500 }))
    await a.track("lost")
    assert.match(w.warnings.join("\n"), /no offline buffer/)
  } finally {
    w.restore()
  }
})
