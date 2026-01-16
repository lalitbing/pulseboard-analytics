import dotenv from "dotenv"

// Load .env ONLY in local
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

import app from "./app"
import cors from "cors"

const PORT = process.env.PORT || 8080

app.use(cors({
  origin: "*",
  methods: ["GET","POST"]
}))

app.get("/api/health", (_req:any, res:any) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV || "dev"
  })
})

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`)
})
