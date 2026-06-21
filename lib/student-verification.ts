import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTextInput } from "@/lib/validation";

type StudentVerificationClient = SupabaseClient;

type SendInput = {
  supabase: StudentVerificationClient;
  userId: string;
  universityEmail: string;
  verificationNote?: string;
};

type VerifyInput = {
  supabase: StudentVerificationClient;
  userId: string;
  universityEmail: string;
  code: string;
};

type ResultOk<T extends Record<string, unknown> = Record<string, never>> = {
  ok: true;
} & T;

type ResultError = {
  ok: false;
  message: string;
  status?: number;
  needsMigration?: boolean;
};

const STUDENT_VERIFICATION_MIGRATION =
  "Supabase SQL Editor icinde supabase-student-verification-contact.sql dosyasini calistirmalisin.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDatabaseShapeError(error?: { code?: string; message?: string } | null) {
  if (!error) return false;

  const message = error.message?.toLocaleLowerCase("tr-TR") || "";

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("student_verification_codes") ||
    message.includes("university_email_domains") ||
    message.includes("verification_")
  );
}

export function normalizeStudentEmail(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

export function safeVerificationCodeInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function getEmailDomain(email: string) {
  return email.split("@").pop()?.trim().toLocaleLowerCase("tr-TR") || "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isEduTrDomain(domain: string) {
  return domain.endsWith(".edu.tr");
}

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function getVerificationSecret() {
  const explicitSecret =
    process.env.STUDENT_VERIFICATION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    "";

  if (explicitSecret) return explicitSecret;

  if (process.env.NODE_ENV === "production") return "";

  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "kampusraf-local-student-verification"
  );
}

function hashVerificationCode(code: string) {
  const secret = getVerificationSecret();

  if (!secret) return null;

  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

function shouldExposeVerificationCodeForDebug() {
  return (
    process.env.STUDENT_VERIFICATION_TEST_MODE === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

function hasVerificationEmailProvider() {
  return Boolean(process.env.RESEND_API_KEY);
}

async function isAllowedUniversityEmailDomain(
  supabase: StudentVerificationClient,
  domain: string
) {
  if (isEduTrDomain(domain)) {
    return { ok: true as const, allowed: true };
  }

  const { data, error } = await supabase
    .from("university_email_domains")
    .select("domain")
    .eq("domain", domain)
    .eq("is_active", true)
    .maybeSingle();

  if (error && isDatabaseShapeError(error)) {
    return {
      ok: false as const,
      message: STUDENT_VERIFICATION_MIGRATION,
      needsMigration: true,
    };
  }

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const, allowed: Boolean(data) };
}

async function sendVerificationEmail({
  to,
  code,
  expiresAt,
}: {
  to: string;
  code: string;
  expiresAt: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) return { sent: false, reason: "missing_provider" };

  const from =
    process.env.STUDENT_VERIFICATION_FROM ||
    "KampusRaf <dogrulama@kampusraf.com>";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.kampusraf.com";
  const expiresLabel = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(expiresAt));

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "KampusRaf ogrenci dogrulama kodun",
      text: `KampusRaf ogrenci dogrulama kodun: ${code}\nBu kod ${expiresLabel} tarihine kadar gecerlidir.\n\n${siteUrl}/ogrenci-dogrulama`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1F2933">
          <h2 style="color:#2E7D5B">KampusRaf ogrenci dogrulama kodun</h2>
          <p>Ogrenci rozetini aktif etmek icin asagidaki 6 haneli kodu kullan.</p>
          <p style="font-size:28px;font-weight:800;letter-spacing:8px;color:#F59E0B">${code}</p>
          <p>Bu kod <strong>${expiresLabel}</strong> tarihine kadar gecerlidir.</p>
          <p><a href="${siteUrl}/ogrenci-dogrulama">Dogrulama ekranina git</a></p>
        </div>
      `,
    }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      sent: false,
      reason: response ? `resend_${response.status}` : "network_error",
    };
  }

  return { sent: true, reason: null };
}

export async function requestStudentVerificationCode({
  supabase,
  userId,
  universityEmail,
  verificationNote,
}: SendInput): Promise<
  | ResultOk<{
      universityEmail: string;
      expiresAt: string;
      delivery: "email" | "debug";
      debugCode?: string;
    }>
  | ResultError
> {
  const normalizedEmail = normalizeStudentEmail(universityEmail);
  const note = normalizeTextInput(verificationNote || "", {
    maxLength: 500,
    preserveLineBreaks: true,
  });

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      status: 400,
      message: "Lutfen gecerli bir universite e-posta adresi gir.",
    };
  }

  const emailDomain = getEmailDomain(normalizedEmail);
  const domainCheck = await isAllowedUniversityEmailDomain(supabase, emailDomain);

  if (!domainCheck.ok) {
    return {
      ok: false,
      status: domainCheck.needsMigration ? 409 : 500,
      message: domainCheck.message,
      needsMigration: domainCheck.needsMigration,
    };
  }

  if (!domainCheck.allowed) {
    return {
      ok: false,
      status: 400,
      message:
        "Bu e-posta domaini ogrenci dogrulamasi icin uygun gorunmuyor. Universite e-postan yoksa manuel inceleme yontemini kullanabilirsin.",
    };
  }

  const code = generateVerificationCode();
  const finalCodeHash = hashVerificationCode(code);

  if (!finalCodeHash) {
    return {
      ok: false,
      status: 500,
      message:
        "Ogrenci dogrulama icin STUDENT_VERIFICATION_SECRET ortam degiskeni gerekli.",
    };
  }

  const canSendEmail = hasVerificationEmailProvider();
  const canExposeDebugCode = shouldExposeVerificationCodeForDebug();

  if (!canSendEmail && !canExposeDebugCode) {
    return {
      ok: false,
      status: 503,
      message:
        "E-posta saglayicisi henuz aktif degil. Vercel ortam degiskenlerine RESEND_API_KEY eklenince kod otomatik gonderilecek.",
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  const { error: consumeError } = await supabase
    .from("student_verification_codes")
    .update({ consumed_at: nowIso })
    .eq("user_id", userId)
    .is("consumed_at", null);

  if (consumeError && isDatabaseShapeError(consumeError)) {
    return {
      ok: false,
      status: 409,
      message: STUDENT_VERIFICATION_MIGRATION,
      needsMigration: true,
    };
  }

  if (consumeError) {
    return { ok: false, status: 500, message: consumeError.message };
  }

  const { error: insertError } = await supabase
    .from("student_verification_codes")
    .insert({
      user_id: userId,
      university_email: normalizedEmail,
      email_domain: emailDomain,
      code_hash: finalCodeHash,
      expires_at: expiresAt,
      last_sent_at: nowIso,
    });

  if (insertError && isDatabaseShapeError(insertError)) {
    return {
      ok: false,
      status: 409,
      message: STUDENT_VERIFICATION_MIGRATION,
      needsMigration: true,
    };
  }

  if (insertError) {
    return { ok: false, status: 500, message: insertError.message };
  }

  const delivery = canSendEmail
    ? await sendVerificationEmail({
        to: normalizedEmail,
        code,
        expiresAt,
      })
    : { sent: false, reason: "debug_mode" };

  if (canSendEmail && !delivery.sent && !canExposeDebugCode) {
    return {
      ok: false,
      status: 502,
      message:
        "Dogrulama kodu olusturuldu ancak e-posta gonderilemedi. Lutfen biraz sonra tekrar dene.",
    };
  }

  const deliveryMethod = delivery.sent ? "email" : "debug";

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      verification_status: "pending",
      verification_method:
        deliveryMethod === "email"
          ? "university_email_otp"
          : "university_email_test_code",
      university_email: normalizedEmail,
      verification_note: note || null,
      verification_requested_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", userId);

  if (profileError && isDatabaseShapeError(profileError)) {
    return {
      ok: false,
      status: 409,
      message: STUDENT_VERIFICATION_MIGRATION,
      needsMigration: true,
    };
  }

  if (profileError) {
    return { ok: false, status: 500, message: profileError.message };
  }

  return {
    ok: true,
    universityEmail: normalizedEmail,
    expiresAt,
    delivery: deliveryMethod,
    debugCode: deliveryMethod === "debug" && canExposeDebugCode ? code : undefined,
  };
}

export async function verifyStudentVerificationCode({
  supabase,
  userId,
  universityEmail,
  code,
}: VerifyInput): Promise<ResultOk<{ trustScore: number }> | ResultError> {
  const normalizedEmail = normalizeStudentEmail(universityEmail);
  const cleanCode = safeVerificationCodeInput(code);

  if (!isValidEmail(normalizedEmail)) {
    return {
      ok: false,
      status: 400,
      message: "Lutfen gecerli bir universite e-posta adresi gir.",
    };
  }

  if (cleanCode.length !== 6) {
    return {
      ok: false,
      status: 400,
      message: "Lutfen 6 haneli dogrulama kodunu gir.",
    };
  }

  const { data: codeRow, error: codeError } = await supabase
    .from("student_verification_codes")
    .select("id, code_hash, attempts, expires_at, consumed_at")
    .eq("user_id", userId)
    .eq("university_email", normalizedEmail)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeError && isDatabaseShapeError(codeError)) {
    return {
      ok: false,
      status: 409,
      message: STUDENT_VERIFICATION_MIGRATION,
      needsMigration: true,
    };
  }

  if (codeError || !isRecord(codeRow)) {
    return {
      ok: false,
      status: 404,
      message: "Aktif dogrulama kodu bulunamadi. Lutfen yeniden kod olustur.",
    };
  }

  if (new Date(String(codeRow.expires_at)).getTime() < Date.now()) {
    await supabase
      .from("student_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", codeRow.id);

    return {
      ok: false,
      status: 400,
      message: "Dogrulama kodunun suresi doldu. Lutfen yeni kod olustur.",
    };
  }

  const attempts = typeof codeRow.attempts === "number" ? codeRow.attempts : 0;

  if (attempts >= 5) {
    return {
      ok: false,
      status: 429,
      message: "Cok fazla hatali deneme yapildi. Lutfen yeni kod olustur.",
    };
  }

  const expectedHash = hashVerificationCode(cleanCode);

  if (!expectedHash) {
    return {
      ok: false,
      status: 500,
      message:
        "Ogrenci dogrulama icin STUDENT_VERIFICATION_SECRET ortam degiskeni gerekli.",
    };
  }

  if (expectedHash !== codeRow.code_hash) {
    await supabase
      .from("student_verification_codes")
      .update({ attempts: attempts + 1 })
      .eq("id", codeRow.id);

    return { ok: false, status: 400, message: "Dogrulama kodu hatali." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", userId)
    .maybeSingle();

  const currentTrustScore =
    profile && typeof profile.trust_score === "number" ? profile.trust_score : 60;
  const nextTrustScore = Math.min(Math.max(currentTrustScore + 15, 70), 100);
  const now = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      verification_status: "verified",
      verification_method: "university_email_otp",
      university_email: normalizedEmail,
      is_verified: true,
      trust_score: nextTrustScore,
      verification_verified_at: now,
      verification_note: null,
      updated_at: now,
    })
    .eq("id", userId);

  if (profileError && isDatabaseShapeError(profileError)) {
    return {
      ok: false,
      status: 409,
      message: STUDENT_VERIFICATION_MIGRATION,
      needsMigration: true,
    };
  }

  if (profileError) {
    return { ok: false, status: 500, message: profileError.message };
  }

  await supabase
    .from("student_verification_codes")
    .update({ consumed_at: now })
    .eq("id", codeRow.id);

  return { ok: true, trustScore: nextTrustScore };
}
