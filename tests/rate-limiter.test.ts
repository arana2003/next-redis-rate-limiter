import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { redis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limiter";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("checkRateLimit (sliding window, Redis)", () => {
  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("admits up to the limit and rejects the next request", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push(await checkRateLimit("user-a", 5, 10000));
    }
    expect(results.slice(0, 5).every((r) => r.allowed)).toBe(true);
    expect(results[5].allowed).toBe(false);
  });

  it("reports remaining requests, counting down to zero", async () => {
    const first = await checkRateLimit("user-b", 5, 10000);
    expect(first.remaining).toBe(4);

    let last = first;
    for (let i = 0; i < 4; i++) {
      last = await checkRateLimit("user-b", 5, 10000);
    }
    expect(last.remaining).toBe(0);
    expect(last.allowed).toBe(true);
  });

  it("tracks each identifier separately", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit("user-c", 5, 10000);
    }
    expect((await checkRateLimit("user-c", 5, 10000)).allowed).toBe(false);
    expect((await checkRateLimit("user-d", 5, 10000)).allowed).toBe(true);
  });

  it("admits requests again once the window has passed", async () => {
    await checkRateLimit("user-e", 2, 300);
    await checkRateLimit("user-e", 2, 300);
    expect((await checkRateLimit("user-e", 2, 300)).allowed).toBe(false);

    await sleep(350);
    expect((await checkRateLimit("user-e", 2, 300)).allowed).toBe(true);
  });
});
