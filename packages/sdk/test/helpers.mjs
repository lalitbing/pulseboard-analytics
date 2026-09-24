// Test doubles for a browser-like environment: offline switch and a scripted fetch.
export const net = { online: true }
Object.defineProperty(globalThis.navigator, "onLine", { get: () => net.online, configurable: true })

export const calls = []
let responder = () => new Response("{}", { status: 200 })
export const respondWith = (fn) => {
  responder = fn
}
export const resetFetch = () => {
  calls.length = 0
  responder = () => new Response("{}", { status: 200 })
}
globalThis.fetch = async (url, init) => {
  const call = { url: String(url), init, body: JSON.parse(init.body) }
  calls.push(call)
  return responder(call)
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const silenceWarnings = () => {
  const warnings = []
  const orig = console.warn
  console.warn = (...args) => warnings.push(args.join(" "))
  return { warnings, restore: () => (console.warn = orig) }
}
