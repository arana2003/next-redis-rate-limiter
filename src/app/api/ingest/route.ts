import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { authenticate } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  const user = await authenticate(req);

  if (!user) {
    return NextResponse.json(
      { error: "Missing or invalid API key." },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="ingest"' },
      }
    );
  }

  const { allowed, remaining } = await checkRateLimit(user.id, 5, 10000);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Sliding window limit exceeded." },
      {
        status: 429,
        headers: {
          "Retry-After": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const body = await req.json().catch(() => ({}));

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        userId: user.id,
        endpoint: req.nextUrl.pathname,
        payload: body as Prisma.InputJsonValue,
      },
    });
  });

  return NextResponse.json(
    {
      status: "success",
      message: "Payload accepted into pipeline",
      remainingRequests: remaining,
      data: body,
    },
    {
      status: 200,
      headers: {
        "X-RateLimit-Remaining": remaining.toString(),
      },
    }
  );
}
