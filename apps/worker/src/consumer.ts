import { saveEvent } from "./db"
import Redis from "ioredis"
import { getRedisHostSafe, getRedisUrl } from "./redisConfig"

let _consumerRedis: Redis | null = null
let _heartbeatRedis: Redis | null = null

function createRedis(url: string) {
  const useTls = url.startsWith("rediss://")
  return new Redis(url, {
    maxRetriesPerRequest: null,
    ...(useTls ? { tls: {} } : {}),
  })
}

// IMPORTANT: use separate connections. BRPOP blocks a connection, preventing
// other commands (like heartbeat SET) from executing on that same socket.
function getConsumerRedis() {
  if (_consumerRedis) return _consumerRedis
  _consumerRedis = createRedis(getRedisUrl())
  _consumerRedis.on("error", (err: Error) => {
    console.error("Redis consumer connection error:", err.message)
  })
  return _consumerRedis
}

function getHeartbeatRedis() {
  if (_heartbeatRedis) return _heartbeatRedis
  _heartbeatRedis = createRedis(getRedisUrl())
  _heartbeatRedis.on("error", (err: Error) => {
    console.error("Redis heartbeat connection error:", err.message)
  })
  return _heartbeatRedis
}

const WORKER_HEARTBEAT_KEY = "pulseboard:worker:heartbeat"
const WORKER_HEARTBEAT_TTL_SECONDS = 20
const WORKER_HEARTBEAT_INTERVAL_MS = 10_000

const startHeartbeat = () => {
  console.log("💓 Worker heartbeat started");

  // Fire immediately, then refresh periodically.
  const beat = async () => {
    try {
      await getHeartbeatRedis().set(WORKER_HEARTBEAT_KEY, String(Date.now()), "EX", WORKER_HEARTBEAT_TTL_SECONDS)
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
  const redisUrl = getRedisUrl()
  console.log(`🔌 Worker Redis target: ${getRedisHostSafe(redisUrl)}`)

  startHeartbeat()
  while (true) {
    let data: [string, string] | null = null
    try {
      data = await getConsumerRedis().brpop("events", 0)
    } catch (err) {
      // Keep worker alive through transient Redis/network issues.
      console.error("❌ Worker Redis read error:", err)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      continue
    }

    if (!data) continue

    try {
      const payload = JSON.parse(data[1])
      await saveEvent(payload)
    } catch (err) {
      console.error("❌ Failed to process event:", data[1], err)
    }
  }
  
}
