import { z } from "zod"

export const trackSchema = z.object({
  event: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  properties: z.record(z.string(), z.any()).optional()
})