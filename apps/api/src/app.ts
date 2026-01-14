import express from "express"
import cors from "cors"
import routes from "./routes"
import rateLimit from "express-rate-limit"

export const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later. - Rate Limit Exceeded"
})


const app = express()

app.use(cors())
app.use(express.json())
app.use(limiter)
app.use("/api", routes)

export default app
