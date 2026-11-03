import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const auditCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUnique(...args) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ auditLog: { create: (...args: unknown[]) => auditCreate(...args) } }),
  },
}));

import { POST } from "@/app/api/ingest/route";
import { redis } from "@/lib/redis";

const USER = { id: "u1", email: "test@example.com", role: "developer" };

function ingest(body: unknown, key = "key-route") {
  return new NextRequest("http://localhost/api/ingest", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ingest", () => {
  beforeEach(async () => {
    findUnique.mockReset();
    auditCreate.mockReset();
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("returns 401 without a valid key and writes no audit row", async () => {
    findUnique.mockResolvedValue(null);
    const res = await POST(ingest({ a: 1 }, "bad-key"));
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toContain("Bearer");
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("accepts an authenticated request and writes one audit row", async () => {
    findUnique.mockResolvedValue(USER);
    const res = await POST(ingest({ packet: "PKT-1" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("4");

    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate.mock.calls[0][0]).toEqual({
      data: {
        userId: "u1",
        endpoint: "/api/ingest",
        payload: { packet: "PKT-1" },
      },
    });
  });

  it("returns 429 on the sixth request in the window and writes no audit row", async () => {
    findUnique.mockResolvedValue(USER);
    for (let i = 0; i < 5; i++) {
      expect((await POST(ingest({ n: i }))).status).toBe(200);
    }
    const res = await POST(ingest({ n: 5 }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("10");
    expect(auditCreate).toHaveBeenCalledTimes(5);
  });
});
