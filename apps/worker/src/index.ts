import dotenv from "dotenv"
dotenv.config()

import { consume } from "./consumer"

consume()
console.log("🚀 Worker booted")

