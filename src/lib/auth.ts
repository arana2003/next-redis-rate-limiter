import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: string;
};

// Cache successful API key lookups briefly so hot paths skip Postgres.
const CACHE_TTL_SECONDS = 60;

function extractBearerKey(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
}

export async function authenticate(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  const apiKey = extractBearerKey(req);
  if (!apiKey) return null;

  const cacheKey = `auth:apikey:${apiKey}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as AuthenticatedUser;
  }

  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: { id: true, email: true, role: true },
  });
  if (!user) return null;

  await redis.set(cacheKey, JSON.stringify(user), "EX", CACHE_TTL_SECONDS);
  return user;
}
