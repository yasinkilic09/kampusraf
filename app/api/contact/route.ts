import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/request-security";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";
import { insertContactMessage } from "@/lib/contact-messages";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const clientIp = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`api:contact:${clientIp}`, {
    limit: 4,
    windowMs: 15 * 60_000,
  });
  const rateHeaders = createRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Cok hizli mesaj gonderiyorsun. Lutfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar dene.`,
      },
      { status: 429, headers: rateHeaders }
    );
  }

  const parsedPayload = await readJsonBody<{
    name?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
    source?: unknown;
  }>(request, 16 * 1024);

  if (!parsedPayload.ok) return parsedPayload.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await insertContactMessage(supabase, {
    ...parsedPayload.data,
    source: parsedPayload.data.source || "mobile",
    userId: user?.id || null,
    userAgent: request.headers.get("user-agent"),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.message,
        needsMigration: result.needsMigration || false,
      },
      { status: result.status || 400, headers: rateHeaders }
    );
  }

  return NextResponse.json({ ok: true }, { headers: rateHeaders });
}
