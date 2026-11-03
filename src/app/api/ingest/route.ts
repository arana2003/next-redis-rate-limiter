import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

  const { allowed, remaining } = await checkRateLimit(ip, 5, 10000);

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
