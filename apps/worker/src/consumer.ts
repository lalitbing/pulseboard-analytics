import Redis from "ioredis"
import { saveEvent } from "./db"

const redis = new Redis(process.env.REDIS_URL!, {
    tls: {}   // REQUIRED for Upstash
  })
  
export const consume = async () => {
  while(true){
    const data = await redis.brpop("events", 0)
    if(!data) continue

    const payload = JSON.parse(data[1])
    await saveEvent(payload)
  }
}
