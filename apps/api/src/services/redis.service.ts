import Redis from "ioredis"

const redis = new Redis(process.env.REDIS_URL!, {
  tls: {}   // REQUIRED for Upstash
})

export const pushToQueue = async (data: any) => {
  await redis.lpush("events", JSON.stringify(data))
}
