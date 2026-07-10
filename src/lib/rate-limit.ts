import { NextResponse } from "next/server";
import { UPLOAD_RATE_LIMIT } from "@/lib/constants";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string): NextResponse | null {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + UPLOAD_RATE_LIMIT.windowMs,
    });
    return null;
  }

  if (bucket.count >= UPLOAD_RATE_LIMIT.maxRequests) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
  }

  bucket.count += 1;
  return null;
}

/** Test helper */
export function resetRateLimits() {
  buckets.clear();
}
