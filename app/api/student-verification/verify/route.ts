import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createBearerSupabaseClient } from "@/lib/supabase/bearer";
import { readJsonBody } from "@/lib/request-security";
import { checkRateLimit, createRateLimitHeaders, getClientIp } from "@/lib/rate-limit";
import { verifyStudentVerificationCode } from "@/lib/student-verification";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { supabase, user, error } = await createBearerSupabaseClient(request);

  if (!supabase || !user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const clientIp = getClientIp(request.headers);
  const rateLimit = checkRateLimit(`api:verify-student:${user.id}:${clientIp}`, {
    limit: 10,
    windowMs: 10 * 60_000,
  });
  const rateHeaders = createRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Cok fazla deneme yapildi. Lutfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar dene.`,
      },
      { status: 429, headers: rateHeaders }
    );
  }

  const parsedPayload = await readJsonBody<{
    universityEmail?: unknown;
    code?: unknown;
  }>(request, 16 * 1024);

  if (!parsedPayload.ok) return parsedPayload.response;

  const result = await verifyStudentVerificationCode({
    supabase,
    userId: user.id,
    universityEmail: String(parsedPayload.data.universityEmail || ""),
    code: String(parsedPayload.data.code || ""),
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

  revalidatePath("/ogrenci-dogrulama");
  revalidatePath("/profilim");
  revalidatePath("/dashboard");
  revalidatePath("/kitap-ara");
  revalidatePath("/eslesmeler");
  revalidatePath("/admin/dogrulamalar");

  return NextResponse.json(result, { headers: rateHeaders });
}
