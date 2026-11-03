import { randomUUID } from "node:crypto";
import { redis } from "./redis";

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local clear_before = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, clear_before)

local current_requests = redis.call('ZCARD', key)

if current_requests < limit then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return {1, limit - current_requests - 1}
else
    return {0, 0}
end
`;

export async function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 10000
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();

  const [allowed, remaining] = (await redis.eval(
    SLIDING_WINDOW_LUA,
    1,
    key,
    now.toString(),
    windowMs.toString(),
    limit.toString(),
    // Unique per request: two requests in the same millisecond must not
    // share a sorted-set member, or the second one is not counted.
    randomUUID()
  )) as [number, number];

  return {
    allowed: allowed === 1,
    remaining,
  };
}
