import { pushToQueue } from "./redis.service"

export const ingestEvent = async (payload: any) => {
  await pushToQueue(payload)
}
