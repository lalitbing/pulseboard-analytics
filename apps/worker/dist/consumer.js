"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.consume = void 0;
const db_1 = require("./db");
const ioredis_1 = __importDefault(require("ioredis"));
let _consumerRedis = null;
let _heartbeatRedis = null;
function createRedis(url) {
    const useTls = url.startsWith("rediss://");
    return new ioredis_1.default(url, useTls ? { tls: {} } : {});
}
function getRedisUrl() {
    const url = process.env.REDIS_URL;
    if (!url)
        throw new Error("REDIS_URL is not set");
    return url;
}
// IMPORTANT: use separate connections. BRPOP blocks a connection, preventing
// other commands (like heartbeat SET) from executing on that same socket.
function getConsumerRedis() {
    if (_consumerRedis)
        return _consumerRedis;
    _consumerRedis = createRedis(getRedisUrl());
    return _consumerRedis;
}
function getHeartbeatRedis() {
    if (_heartbeatRedis)
        return _heartbeatRedis;
    _heartbeatRedis = createRedis(getRedisUrl());
    return _heartbeatRedis;
}
const WORKER_HEARTBEAT_KEY = "pulseboard:worker:heartbeat";
const WORKER_HEARTBEAT_TTL_SECONDS = 20;
const WORKER_HEARTBEAT_INTERVAL_MS = 10000;
const startHeartbeat = () => {
    console.log("💓 Worker heartbeat started");
    // Fire immediately, then refresh periodically.
    const beat = async () => {
        try {
            await getHeartbeatRedis().set(WORKER_HEARTBEAT_KEY, String(Date.now()), "EX", WORKER_HEARTBEAT_TTL_SECONDS);
        }
        catch (err) {
            // Don't crash the worker if Redis has a transient hiccup.
            console.error("Worker heartbeat failed:", err);
        }
    };
    void beat();
    setInterval(() => {
        void beat();
    }, WORKER_HEARTBEAT_INTERVAL_MS);
};
const consume = async () => {
    startHeartbeat();
    while (true) {
        const data = await getConsumerRedis().brpop("events", 0);
        if (!data)
            continue;
        try {
            const payload = JSON.parse(data[1]);
            await (0, db_1.saveEvent)(payload);
        }
        catch (err) {
            console.error("❌ Failed to process event:", data[1], err);
            // DO NOT crash the worker
        }
    }
};
exports.consume = consume;
