import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

import { consume } from "./consumer";

const start = async () => {
  try {
    console.log("🚀 Worker booting...");
    await consume();
  } catch (err) {
    console.error("❌ Worker crashed:", err);
    process.exit(1); // let Railway restart it
  }
};

start();

// Graceful shutdown (important on Railway restarts)
process.on("SIGTERM", () => {
  console.log("🛑 Worker received SIGTERM, shutting down...");
  process.exit(0);
});
