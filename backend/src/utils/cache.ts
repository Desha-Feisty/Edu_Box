/**
 * Redis-backed TTL cache using Upstash.
 * Falls back gracefully to no-op on connection errors.
 *
 * Usage:
 *   import { getCache, setCache, clearCache } from "./utils/cache.js";
 *
 * All operations are fire-and-forget on the Redis layer — if Redis
 * is unavailable, cache misses fall through to DB queries.
 *
 * Redis is lazy-initialized on first access to avoid sync constructor
 * overhead on server startup.
 */

import { Redis } from "@upstash/redis";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Lazy initialization — Redis is created on first access, not at module import time
let _redis: Redis | null = null;

function getRedis(): Redis | null {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
    if (!_redis) _redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
    return _redis;
}

/**
 * Retrieve a cached value by key.
 * Returns null if key doesn't exist, is expired, or Redis is unavailable.
 */
export async function getCache<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    if (!redis) return null;

    try {
        const data = await redis.get<string>(key);
        if (data == null) return null;
        return typeof data === "string" ? (JSON.parse(data) as T) : (data as T);
    } catch {
        return null;
    }
}

/**
 * Store a value with a TTL (in milliseconds).
 * Silently fails if Redis is unreachable.
 */
export async function setCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
        await redis.set(key, JSON.stringify(data), { ex: ttlSec });
    } catch {
        // Silently ignore — caller continues without caching
    }
}

/**
 * Delete a specific cache key, or clear all keys if no key provided.
 * Silently fails if Redis is unavailable.
 */
export async function clearCache(key?: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
        if (key) {
            await redis.del(key);
        } else {
            // Flush admin:* keys only — safe for multi-key operations
            const keys = await redis.keys("admin:*");
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        }
    } catch {
        // Silently ignore
    }
}