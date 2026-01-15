import Redis from "ioredis"

let _redis: Redis | null = null

function createRedisClient(url: string) {
  // Upstash uses TLS via `rediss://...`; local Redis often uses `redis://...` (no TLS).
  const useTls = url.startsWith("rediss://")
  return new Redis(url, useTls ? { tls: {} } : {})
}

export function getRedis() {
  if (_redis) return _redis
  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error("REDIS_URL is not set")
  }
  _redis = createRedisClient(url)
  return _redis
}

export const pushToQueue = async (data: any) => {
  await getRedis().lpush("events", JSON.stringify(data))
}

export const WORKER_HEARTBEAT_KEY = "pulseboard:worker:heartbeat"

export async function getWorkerHeartbeatStatus() {
  const redis = getRedis()
  const [exists, ttlSeconds, lastSeenRaw] = await Promise.all([
    redis.exists(WORKER_HEARTBEAT_KEY),
    redis.ttl(WORKER_HEARTBEAT_KEY),
    redis.get(WORKER_HEARTBEAT_KEY),
  ])

  const active = exists === 1 && ttlSeconds > 0
  const lastSeenMs = lastSeenRaw ? Number(lastSeenRaw) : null

  return {
    active,
    ttlSeconds: ttlSeconds > 0 ? ttlSeconds : null,
    lastSeenMs: Number.isFinite(lastSeenMs as number) ? lastSeenMs : null,
  }
}
