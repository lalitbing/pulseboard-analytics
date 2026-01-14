import dotenv from "dotenv"
import path from "path"

dotenv.config({
  path: path.resolve(__dirname, "../.env")
})

console.log("CWD:", process.cwd())
console.log("REDIS:", process.env.REDIS_URL)

import app from "./app"

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`)
})
