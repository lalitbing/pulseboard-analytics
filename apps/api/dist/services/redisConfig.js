"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisUrl = getRedisUrl;
const UPSTASH_HOST_RE = /\.upstash\.io$/i;
function getNonEmpty(key) {
    const value = process.env[key];
    return value && value.trim() ? value.trim() : null;
}
function buildUrlFromParts() {
    const host = getNonEmpty("UPSTASH_REDIS_HOST") || getNonEmpty("REDIS_HOST");
    const password = getNonEmpty("UPSTASH_REDIS_PASSWORD") || getNonEmpty("REDIS_PASSWORD");
    const port = getNonEmpty("UPSTASH_REDIS_PORT") || getNonEmpty("REDIS_PORT") || "6379";
    const username = getNonEmpty("UPSTASH_REDIS_USERNAME") || getNonEmpty("REDIS_USERNAME") || "default";
    if (!host || !password)
        return null;
    return `rediss://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
}
function normalizeRedisUrl(rawUrl) {
    if (/^https?:\/\//i.test(rawUrl)) {
        throw new Error("Redis URL is using http(s). Use the TCP URL (redis:// or rediss://), not UPSTASH_REDIS_REST_URL.");
    }
    if (!/^[a-z]+:\/\//i.test(rawUrl)) {
        throw new Error("Redis URL must be a full connection string (redis:// or rediss://). Host-only values are not supported.");
    }
    let parsed;
    try {
        parsed = new URL(rawUrl);
    }
    catch {
        throw new Error("Redis URL is not a valid URL.");
    }
    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
        throw new Error("Redis URL must start with redis:// or rediss://.");
    }
    if (parsed.protocol === "redis:" && UPSTASH_HOST_RE.test(parsed.hostname)) {
        parsed.protocol = "rediss:";
    }
    return parsed.toString();
}
function getRedisUrl() {
    const directUrl = getNonEmpty("REDIS_URL") || getNonEmpty("UPSTASH_REDIS_URL");
    if (directUrl)
        return normalizeRedisUrl(directUrl);
    const fromParts = buildUrlFromParts();
    if (fromParts)
        return fromParts;
    throw new Error("Redis env is missing. Set REDIS_URL (or UPSTASH_REDIS_URL) to a redis:// or rediss:// connection string.");
}
