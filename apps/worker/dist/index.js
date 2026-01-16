"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
if (process.env.NODE_ENV !== "production") {
    dotenv_1.default.config();
}
const consumer_1 = require("./consumer");
const start = async () => {
    try {
        console.log("🚀 Worker booting...");
        await (0, consumer_1.consume)();
    }
    catch (err) {
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
