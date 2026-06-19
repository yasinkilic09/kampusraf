import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIp,
  type RateLimitConfig,
} from "@/lib/rate-limit";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";

const ONE_MINUTE = 60_000;
const MAX_DEFAULT_BODY_BYTES = 1 * 1024 * 1024;
const MAX_UPLOAD_BODY_BYTES = 12 * 1024 * 1024;
const MAX_LOCATION_BODY_BYTES = 16 * 1024;

const uploadPaths = new Set(["/paylas", "/profilim"]);
const trustedProductionHosts = new Set(["kampusraf.com", "www.kampusraf.com"]);
const allowedMethods = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

const blockedPathPrefixes = [
  "/.aws",
  "/.env",
  "/.git",
  "/.svn",
  "/.well-known/acme-challenge/..",
  "/adminer",
  "/cgi-bin",
  "/phpmyadmin",
  "/server-status",
  "/vendor/phpunit",
  "/wp-admin",
  "/wp-content",
  "/wp-includes",
  "/wordpress",
];

const blockedExactPaths = new Set([
  "/.ds_store",
  "/config.php",
  "/debug/default/view",
  "/ecp/Current/exporttool/microsoft.exchange.ediscovery.exporttool.application",
  "/info.php",
  "/phpinfo.php",
  "/xmlrpc.php",
]);

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token")
    );
}

function isMutationRequest(request: NextRequest) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
}

function getConfiguredSiteHost() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!configuredUrl) return null;

  try {
    const url = new URL(
      configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`
    );

    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getAllowedHosts(request: NextRequest) {
  const allowedHosts = new Set<string>([
    request.nextUrl.hostname.toLowerCase(),
    ...trustedProductionHosts,
  ]);
  const configuredHost = getConfiguredSiteHost();
  const vercelHost = process.env.VERCEL_URL?.toLowerCase();

  if (configuredHost) allowedHosts.add(configuredHost);
  if (vercelHost) allowedHosts.add(vercelHost);

  if (process.env.NODE_ENV !== "production") {
    allowedHosts.add("localhost");
    allowedHosts.add("127.0.0.1");
  }

  return allowedHosts;
}

function isAllowedSourceUrl(value: string | null, request: NextRequest) {
  if (!value) return true;

  try {
    const url = new URL(value);
    const allowedHosts = getAllowedHosts(request);

    if (!["http:", "https:"].includes(url.protocol)) return false;

    return allowedHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function hasTrustedMutationSource(request: NextRequest) {
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (secFetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin && !isAllowedSourceUrl(origin, request)) return false;
  if (!origin && referer && !isAllowedSourceUrl(referer, request)) return false;

  return true;
}

function isScannerPath(pathname: string) {
  const normalizedPath = pathname.toLowerCase();

  if (blockedExactPaths.has(normalizedPath)) return true;
  if (normalizedPath.endsWith(".php")) return true;

  return blockedPathPrefixes.some((prefix) =>
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );
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

async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabaseAuthCookie(request)) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headersToSet).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!allowedMethods.has(request.method)) {
    return blockedResponse(405, "Method Not Allowed");
  }

  if (pathname.includes("\\")) {
    return blockedResponse(404, "Not Found");
  }

  if (isScannerPath(pathname)) {
    return blockedResponse(404, "Not Found");
  }

  if (isMutationRequest(request)) {
    if (!hasTrustedMutationSource(request)) {
      return blockedResponse(403, "Forbidden");
    }

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

  const response = await refreshSupabaseSession(request);

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
