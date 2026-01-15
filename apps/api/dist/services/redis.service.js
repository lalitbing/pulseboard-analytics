"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKER_HEARTBEAT_KEY = exports.pushToQueue = void 0;
exports.getRedis = getRedis;
exports.getWorkerHeartbeatStatus = getWorkerHeartbeatStatus;
const ioredis_1 = __importDefault(require("ioredis"));
let _redis = null;
function createRedisClient(url) {
    // Upstash uses TLS via `rediss://...`; local Redis often uses `redis://...` (no TLS).
    const useTls = url.startsWith("rediss://");
    return new ioredis_1.default(url, useTls ? { tls: {} } : {});
}
function getRedis() {
    if (_redis)
        return _redis;
    const url = process.env.REDIS_URL;
    if (!url) {
        throw new Error("REDIS_URL is not set");
    }
    _redis = createRedisClient(url);
    return _redis;
}
const pushToQueue = async (data) => {
    await getRedis().lpush("events", JSON.stringify(data));
};
exports.pushToQueue = pushToQueue;
exports.WORKER_HEARTBEAT_KEY = "pulseboard:worker:heartbeat";
async function getWorkerHeartbeatStatus() {
    const redis = getRedis();
    const [exists, ttlSeconds, lastSeenRaw] = await Promise.all([
        redis.exists(exports.WORKER_HEARTBEAT_KEY),
        redis.ttl(exports.WORKER_HEARTBEAT_KEY),
        redis.get(exports.WORKER_HEARTBEAT_KEY),
    ]);
    const active = exists === 1 && ttlSeconds > 0;
    const lastSeenMs = lastSeenRaw ? Number(lastSeenRaw) : null;
    return {
        active,
        ttlSeconds: ttlSeconds > 0 ? ttlSeconds : null,
        lastSeenMs: Number.isFinite(lastSeenMs) ? lastSeenMs : null,
    };
}
