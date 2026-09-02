/**
 * Token Bucket Rate Limiter
 *
 * A Redis-based token bucket rate limiter implementation using Lua scripts
 * for atomic operations.
 *
 * The token bucket algorithm allows requests at a controlled rate by maintaining
 * a bucket of tokens that refills over time. Each request consumes a token, and
 * requests are denied when the bucket is empty.
 *
 * @module tokenBucket
 */

import crypto from "crypto";
import type { RedisClientType } from "redis";

// copied from redis documentation

// Lua script for atomic token bucket operations
export const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local refill_interval = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

-- Get current state or initialize
local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

-- Initialize if this is the first request
if tokens == nil then
    tokens = capacity
    last_refill = now
end

-- Calculate token refill
local time_passed = now - last_refill
local refills = math.floor(time_passed / refill_interval)

if refills > 0 then
    tokens = math.min(capacity, tokens + (refills * refill_rate))
    last_refill = last_refill + (refills * refill_interval)
end

-- Try to consume a token
local allowed = 0
if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
end

-- Update state
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)

-- Expire the bucket once it would have fully refilled, otherwise the key
-- outlives the caller and Redis grows forever.
local ttl = math.ceil((capacity / refill_rate) * refill_interval * 1000) + 1000
redis.call('PEXPIRE', key, ttl)

-- Return result: allowed (1 or 0) and remaining tokens
return {allowed, tokens}
`;

/**
 * Token bucket rate limiter using Redis for distributed rate limiting.
 *
 * The token bucket maintains a fixed capacity of tokens that refill at a
 * constant rate. Each request consumes one token. When the bucket is empty,
 * requests are denied until tokens refill.
 *
 * @example
 * const { createClient } = require('redis');
 * const { TokenBucket } = require('./tokenBucket');
 *
 * const client = createClient();
 * await client.connect();
 *
 * const limiter = new TokenBucket({
 *   capacity: 10,
 *   refillRate: 1,
 *   refillInterval: 1.0,
 *   redisClient: client
 * });
 *
 * const { allowed, remaining } = await limiter.allow('user:123');
 * if (allowed) {
 *   console.log(`Request allowed. ${remaining} tokens remaining.`);
 * } else {
 *   console.log('Request denied. Rate limit exceeded.');
 * }
 */
interface TokenBucketOptions {
  capacity?: number;
  refillRate?: number;
  refillInterval?: number;
  redisClient?: RedisClientType;
}

export class TokenBucket {
  /**
   * Create a new TokenBucket rate limiter.
   *
   * @param {Object} options - Configuration options.
   * @param {number} [options.capacity=10] - Maximum number of tokens in the bucket.
   * @param {number} [options.refillRate=1] - Number of tokens added per refill interval.
   * @param {number} [options.refillInterval=1.0] - Time in seconds between refills.
   * @param {import('redis').RedisClientType} [options.redisClient] - Redis client instance.
   */
  capacity: number;
  refillRate: number;
  refillInterval: number;
  redis: RedisClientType;
  _scriptSha: string;
  _scriptLoaded: boolean;

  constructor({
    capacity = 10,
    refillRate = 1,
    refillInterval = 1.0,
    redisClient,
  }: TokenBucketOptions = {}) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
    if (!redisClient) {
      throw new Error("TokenBucket requires a redisClient");
    }
    this.redis = redisClient;

    // Calculate SHA1 of the script for EVALSHA

    this._scriptSha = crypto
      .createHash("sha1")
      .update(TOKEN_BUCKET_SCRIPT)
      .digest("hex");
    this._scriptLoaded = false;
  }

  /**
   * Ensure the Lua script is loaded into Redis.
   * @private
   */
  async _ensureScriptLoaded() {
    if (!this._scriptLoaded) {
      try {
        this._scriptSha = await this.redis.scriptLoad(TOKEN_BUCKET_SCRIPT);
        this._scriptLoaded = true;
      } catch {
        // If loading fails, we'll fall back to EVAL
      }
    }
  }

  /**
   * Check if a request should be allowed for the given key.
   *
   * @param {string} key - The rate limit key (e.g., 'user:123', 'api:endpoint:xyz').
   * @returns {Promise<{allowed: boolean, remaining: number}>} Result with allowed status and remaining tokens.
   *
   * @example
   * const { allowed, remaining } = await limiter.allow('user:123');
   * console.log(`Allowed: ${allowed}, Remaining: ${remaining}`);
   */
  async allow(key: string): Promise<{ allowed: boolean; remaining: number }> {
    await this._ensureScriptLoaded();

    const now = Date.now() / 1000; // Current time in seconds

    let result;
    try {
      // Try EVALSHA first (faster if script is cached)
      result = await this.redis.evalSha(this._scriptSha, {
        keys: [key],
        arguments: [
          String(this.capacity),
          String(this.refillRate),
          String(this.refillInterval),
          String(now),
        ],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("NOSCRIPT")) {
        // Script not in cache, use EVAL and reload
        result = await this.redis.eval(TOKEN_BUCKET_SCRIPT, {
          keys: [key],
          arguments: [
            String(this.capacity),
            String(this.refillRate),
            String(this.refillInterval),
            String(now),
          ],
        });
        this._scriptLoaded = false;
      } else {
        throw err;
      }
    }

    const [allowedRaw, remainingRaw] = result as [number, number];
    const allowed = Boolean(allowedRaw);
    const remaining = Number(remainingRaw);

    return { allowed, remaining };
  }
}
