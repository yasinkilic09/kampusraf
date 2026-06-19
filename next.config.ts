import type { NextConfig } from "next";
import {
  noIndexHeaderSources,
  noIndexRobotsHeaderValue,
} from "./lib/seo-paths";

function getSupabaseOrigins() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!configuredUrl) {
    return {
      http: "https://*.supabase.co",
      ws: "wss://*.supabase.co",
    };
  }

  try {
    const url = new URL(configuredUrl);
    const wsUrl = new URL(configuredUrl);

    wsUrl.protocol = url.protocol === "https:" ? "wss:" : "ws:";

    return {
      http: url.origin,
      ws: wsUrl.origin,
    };
  } catch {
    return {
      http: "https://*.supabase.co",
      ws: "wss://*.supabase.co",
    };
  }
}

function buildContentSecurityPolicy() {
  const supabase = getSupabaseOrigins();
  const adScriptSources =
    " https://pagead2.googlesyndication.com https://www.googletagservices.com https://ep1.adtrafficquality.google";
  const adConnectSources =
    " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://securepubads.g.doubleclick.net https://ep1.adtrafficquality.google";
  const adFrameSources =
    " https://googleads.g.doubleclick.net https://tpc.googlesyndication.com";
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'${adScriptSources}`
      : `script-src 'self' 'unsafe-inline'${adScriptSources}`;
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    `connect-src 'self' ${supabase.http} ${supabase.ws} https://www.googleapis.com https://openlibrary.org https://covers.openlibrary.org https://www.openstreetmap.org${adConnectSources}`,
    `frame-src 'self' https://www.openstreetmap.org${adFrameSources}`,
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["kampusraf.com", "www.kampusraf.com"],
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    const noIndexHeaders = [
      {
        key: "X-Robots-Tag",
        value: noIndexRobotsHeaderValue,
      },
    ];

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(),
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), interest-cohort=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Origin-Agent-Cluster",
            value: "?1",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
      ...noIndexHeaderSources.map((source) => ({
        source,
        headers: noIndexHeaders,
      })),
      {
        source: "/api/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, nosnippet",
          },
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
