import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIp,
  type RateLimitConfig,
} from "@/lib/rate-limit";

const ONE_MINUTE = 60_000;
const MAX_DEFAULT_BODY_BYTES = 1 * 1024 * 1024;
const MAX_UPLOAD_BODY_BYTES = 12 * 1024 * 1024;
const MAX_LOCATION_BODY_BYTES = 16 * 1024;

const uploadPaths = new Set(["/paylas", "/profilim"]);
const allowedMethods = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

function isMutationRequest(request: NextRequest) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
}

function getContentLength(request: NextRequest) {
  const value = request.headers.get("content-length");

  if (!value) return null;

  const length = Number(value);

  return Number.isFinite(length) && length >= 0 ? length : null;
}

function getBodyLimit(pathname: string) {
  if (pathname.startsWith("/api/location")) return MAX_LOCATION_BODY_BYTES;
  if (uploadPaths.has(pathname)) return MAX_UPLOAD_BODY_BYTES;
  if (pathname.startsWith("/api/")) return MAX_DEFAULT_BODY_BYTES;

  return MAX_UPLOAD_BODY_BYTES;
}

function getRatePolicy(request: NextRequest): RateLimitConfig {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/books/external-search")) {
    return { limit: 30, windowMs: ONE_MINUTE };
  }

  if (pathname.startsWith("/api/location")) {
    return { limit: 40, windowMs: ONE_MINUTE };
  }

  if (pathname.startsWith("/api/nearby-books")) {
    return { limit: 60, windowMs: ONE_MINUTE };
  }

  if (pathname.startsWith("/api/")) {
    return { limit: 90, windowMs: ONE_MINUTE };
  }

  if (request.headers.has("next-action") || isMutationRequest(request)) {
    return { limit: 45, windowMs: ONE_MINUTE };
  }

  return { limit: 240, windowMs: ONE_MINUTE };
}

function getRateBucket(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/books/external-search")) {
    return "api:external-search";
  }

  if (pathname.startsWith("/api/location")) return "api:location";
  if (pathname.startsWith("/api/nearby-books")) return "api:nearby-books";
  if (pathname.startsWith("/api/")) return "api";
  if (request.headers.has("next-action") || isMutationRequest(request)) {
    return `action:${pathname}`;
  }

  return "page";
}

function blockedResponse(status: number, message: string) {
  return new NextResponse(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!allowedMethods.has(request.method)) {
    return blockedResponse(405, "Method Not Allowed");
  }

  if (pathname.includes("\\")) {
    return blockedResponse(404, "Not Found");
  }

  if (isMutationRequest(request)) {
    const contentLength = getContentLength(request);
    const bodyLimit = getBodyLimit(pathname);

    if (contentLength !== null && contentLength > bodyLimit) {
      return blockedResponse(413, "Payload Too Large");
    }
  }

  const clientIp = getClientIp(request.headers);
  const ratePolicy = getRatePolicy(request);
  const bucket = getRateBucket(request);
  const rateResult = checkRateLimit(`${bucket}:${clientIp}`, ratePolicy);

  if (!rateResult.allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...createRateLimitHeaders(rateResult),
      },
    });
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(createRateLimitHeaders(rateResult))) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|txt|xml|webmanifest)$).*)",
  ],
};
