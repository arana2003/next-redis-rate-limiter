import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

import { authenticate } from "@/lib/auth";
import { redis } from "@/lib/redis";

function reqWith(authorization?: string) {
  const headers: Record<string, string> = {};
  if (authorization !== undefined) headers.authorization = authorization;
  return new NextRequest("http://localhost/api/ingest", { method: "POST", headers });
}

const USER = { id: "u1", email: "test@example.com", role: "developer" };

describe("authenticate", () => {
  beforeEach(async () => {
    findUnique.mockReset();
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("returns null when there is no Authorization header", async () => {
    expect(await authenticate(reqWith())).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null for a malformed Authorization header", async () => {
    expect(await authenticate(reqWith("Basic abc123"))).toBeNull();
    expect(await authenticate(reqWith("Bearer"))).toBeNull();
    expect(await authenticate(reqWith("Bearer a b"))).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns the user for a valid key", async () => {
    findUnique.mockResolvedValueOnce(USER);
    expect(await authenticate(reqWith("Bearer key-123"))).toEqual(USER);
    expect(findUnique).toHaveBeenCalledWith({
      where: { apiKey: "key-123" },
      select: { id: true, email: true, role: true },
    });
  });

  it("serves repeat lookups from the Redis cache", async () => {
    findUnique.mockResolvedValue(USER);
    await authenticate(reqWith("Bearer key-456"));
    const second = await authenticate(reqWith("Bearer key-456"));
    expect(second).toEqual(USER);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("returns null for an unknown key and does not cache the miss", async () => {
    findUnique.mockResolvedValue(null);
    expect(await authenticate(reqWith("Bearer nope"))).toBeNull();
    expect(await redis.get("auth:apikey:nope")).toBeNull();
  });
});
