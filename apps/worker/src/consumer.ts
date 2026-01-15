import { saveEvent } from "./db"
import Redis from "ioredis"

let _redis: Redis | null = null

function getRedis() {
  if (_redis) return _redis
  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error("REDIS_URL is not set")
  }
  const useTls = url.startsWith("rediss://")
  _redis = new Redis(url, useTls ? { tls: {} } : {})
  return _redis
}

const WORKER_HEARTBEAT_KEY = "pulseboard:worker:heartbeat"
const WORKER_HEARTBEAT_TTL_SECONDS = 20
const WORKER_HEARTBEAT_INTERVAL_MS = 10_000

const startHeartbeat = () => {
  // Fire immediately, then refresh periodically.
  const beat = async () => {
    try {
      await getRedis().set(WORKER_HEARTBEAT_KEY, String(Date.now()), "EX", WORKER_HEARTBEAT_TTL_SECONDS)
    } catch (err) {
      // Don't crash the worker if Redis has a transient hiccup.
      console.error("Worker heartbeat failed:", err)
    }
  }

  void beat()
  setInterval(() => {
    void beat()
  }, WORKER_HEARTBEAT_INTERVAL_MS)
}
  
export const consume = async () => {
  startHeartbeat()
  while(true){
    const data = await getRedis().brpop("events", 0)
    if(!data) continue

    const payload = JSON.parse(data[1])
    await saveEvent(payload)
  }
}
