"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canCustomizeDistanceMatching,
  getMatchDistanceConfig,
  normalizeDistanceRadiusForPlan,
} from "@/lib/match-plans";
import { enforceActionRateLimit } from "@/lib/server-action-security";
import { createClient } from "@/lib/supabase/server";
import { normalizeTextInput } from "@/lib/validation";

function cleanUsername(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

function canUseGenderMatchPreference(planType?: string | null) {
  return planType === "premium" || planType === "pro";
}

function normalizeGender(value: string) {
  if (value === "male") return "male";
  if (value === "female") return "female";
  return "prefer_not_to_say";
}

function normalizeMatchGenderPreference(value: string) {
  if (value === "male") return "male";
  if (value === "female") return "female";
  return "everyone";
}

function isDistancePreferenceColumnError(error?: { code?: string; message?: string } | null) {
  if (!error) return false;

  const message = error.message?.toLocaleLowerCase("tr-TR") || "";

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("match_distance_")
  );
}

function withoutDistancePreferenceColumns(payload: Record<string, unknown>) {
  const cleanPayload = { ...payload };

  delete cleanPayload.match_distance_preference_enabled;
  delete cleanPayload.match_distance_radius_km;

  return cleanPayload;
}

export async function updateProfileAction(formData: FormData) {
  const fullName = normalizeTextInput(formData.get("fullName"), {
    maxLength: 120,
  });
  const usernameInput = normalizeTextInput(formData.get("username"), {
    maxLength: 40,
  });
  const university = normalizeTextInput(formData.get("university"), {
    maxLength: 120,
  });
  const department = normalizeTextInput(formData.get("department"), {
    maxLength: 120,
  });
  const city = normalizeTextInput(formData.get("city"), { maxLength: 80 });
  const bio = normalizeTextInput(formData.get("bio"), {
    maxLength: 500,
    preserveLineBreaks: true,
  });

  const gender = normalizeGender(String(formData.get("gender") || ""));
  const requestedMatchPreference = normalizeMatchGenderPreference(
    String(formData.get("matchGenderPreference") || "")
  );
  const requestedDistanceRadius = Number(
    formData.get("matchDistanceRadiusKm") || 0
  );
  const showGenderOnProfile = formData.get("showGenderOnProfile") === "on";
  const matchDistancePreferenceEnabled =
    formData.get("matchDistancePreferenceEnabled") === "on";

  const username = usernameInput ? cleanUsername(usernameInput) : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("id", user.id)
    .maybeSingle();

  const currentPlanType = currentProfile?.plan_type || "free";
  const canUseMatchPreference = canUseGenderMatchPreference(currentPlanType);
  const canCustomizeDistancePreference =
    canCustomizeDistanceMatching(currentPlanType);
  const distanceConfig = getMatchDistanceConfig(currentPlanType);

  const finalMatchGenderPreference =
    canUseMatchPreference && gender !== "prefer_not_to_say"
      ? requestedMatchPreference
      : "everyone";
  const finalDistanceRadius = canCustomizeDistancePreference
    ? normalizeDistanceRadiusForPlan(requestedDistanceRadius, currentPlanType)
    : distanceConfig.radiusKm;

  const profilePayload: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      full_name: fullName || null,
      username,
      university: university || null,
      department: department || null,
      city: city || null,
      bio: bio || null,
      gender,
      match_gender_preference: finalMatchGenderPreference,
      match_distance_preference_enabled: matchDistancePreferenceEnabled,
      match_distance_radius_km: finalDistanceRadius,
      show_gender_on_profile: showGenderOnProfile,
      match_preferences_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

  let { error } = await supabase.from("profiles").upsert(profilePayload, {
    onConflict: "id",
  });

  if (isDistancePreferenceColumnError(error)) {
    const fallbackResult = await supabase
      .from("profiles")
      .upsert(withoutDistancePreferenceColumns(profilePayload), {
        onConflict: "id",
      });

    error = fallbackResult.error;
  }

  if (error) {
    const message =
      error.code === "23505"
        ? "Bu kullanıcı adı başka biri tarafından kullanılıyor."
        : error.message;

    redirect(`/profilim?error=${encodeURIComponent(message)}`);
  }

  const { error: refreshError } = await supabase.rpc("refresh_matches_for_user", {
    p_user_id: user.id,
  });

  if (refreshError && refreshError.code !== "42883") {
    console.warn("Eşleşme yenileme uyarısı:", refreshError.message);
  }

  revalidatePath("/profilim");
  revalidatePath("/dashboard");
  revalidatePath("/kitap-ara");
  revalidatePath("/eslesmeler");

  redirect("/profilim?success=1");
}

export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/auth/login");
}

const planLimits = {
  free: {
    monthly_book_limit: 10,
    monthly_request_limit: 10,
    monthly_message_limit: 30,
    monthly_match_limit: 10,
    match_distance_radius_km: 10,
  },
  plus: {
    monthly_book_limit: 30,
    monthly_request_limit: 30,
    monthly_message_limit: 100,
    monthly_match_limit: 40,
    match_distance_radius_km: 15,
  },
  premium: {
    monthly_book_limit: 75,
    monthly_request_limit: 75,
    monthly_message_limit: 300,
    monthly_match_limit: 150,
    match_distance_radius_km: 25,
  },
  pro: {
    monthly_book_limit: 200,
    monthly_request_limit: 200,
    monthly_message_limit: 1000,
    monthly_match_limit: 500,
    match_distance_radius_km: 35,
  },
} as const;

export async function updatePlanAction(formData: FormData) {
  const planType = String(formData.get("planType") || "free");

  if (!["free", "plus", "premium", "pro"].includes(planType)) {
    redirect("/paketler?error=Geçersiz paket seçimi.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  enforceActionRateLimit({
    userId: user.id,
    action: "update-profile",
    limit: 12,
    windowMs: 60_000,
    redirectTo: "/profilim",
  });

  const selectedPlan = planType as keyof typeof planLimits;
  const canKeepMatchPreference = canUseGenderMatchPreference(selectedPlan);
  const distanceConfig = getMatchDistanceConfig(selectedPlan);

  const planPayload: Record<string, unknown> = {
      plan_type: selectedPlan,
      plan_status: "active",
      plan_started_at: new Date().toISOString(),
      plan_expires_at: null,
      ...planLimits[selectedPlan],
      match_distance_preference_enabled: true,
      match_distance_radius_km: distanceConfig.radiusKm,
      ...(canKeepMatchPreference
        ? {}
        : {
            match_gender_preference: "everyone",
            match_preferences_updated_at: new Date().toISOString(),
          }),
      updated_at: new Date().toISOString(),
    };

  let { error } = await supabase
    .from("profiles")
    .update(planPayload)
    .eq("id", user.id);

  if (isDistancePreferenceColumnError(error)) {
    const fallbackResult = await supabase
      .from("profiles")
      .update(withoutDistancePreferenceColumns(planPayload))
      .eq("id", user.id);

    error = fallbackResult.error;
  }

  if (error) {
    redirect(`/paketler?error=${encodeURIComponent(error.message)}`);
  }

  const { error: refreshError } = await supabase.rpc("refresh_matches_for_user", {
    p_user_id: user.id,
  });

  if (refreshError && refreshError.code !== "42883") {
    console.warn("Paket sonrası eşleşme yenileme uyarısı:", refreshError.message);
  }

  revalidatePath("/paketler");
  revalidatePath("/profilim");
  revalidatePath("/dashboard");
  revalidatePath("/kitap-ara");
  revalidatePath("/eslesmeler");

  redirect("/paketler?success=plan-updated");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getEmailDomain(email: string) {
  return email.split("@").pop()?.trim().toLowerCase() || "";
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
  return (
    process.env.STUDENT_VERIFICATION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    ""
  );
}

function hashVerificationCode(code: string) {
  const secret = getVerificationSecret();

  if (!secret) {
    throw new Error("STUDENT_VERIFICATION_SECRET env değişkeni tanımlı değil.");
  }

  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

function safeCodeInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function isStudentVerificationTestMode() {
  return process.env.STUDENT_VERIFICATION_TEST_MODE === "true";
}

async function isAllowedUniversityEmailDomain(
  supabase: Awaited<ReturnType<typeof createClient>>,
  domain: string
) {
  if (isEduTrDomain(domain)) return true;

  const { data } = await supabase
    .from("university_email_domains")
    .select("domain")
    .eq("domain", domain)
    .eq("is_active", true)
    .maybeSingle();

  return Boolean(data);
}

export async function sendStudentVerificationCodeAction(formData: FormData) {
  const universityEmail = normalizeEmail(
    String(formData.get("universityEmail") || "")
  );
  const verificationNote = normalizeTextInput(formData.get("verificationNote"), {
    maxLength: 500,
    preserveLineBreaks: true,
  });

  if (!isValidEmail(universityEmail)) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Lütfen geçerli bir üniversite e-posta adresi gir."
      )}`
    );
  }

  const emailDomain = getEmailDomain(universityEmail);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  enforceActionRateLimit({
    userId: user.id,
    action: "send-student-verification-code",
    limit: 3,
    windowMs: 10 * 60_000,
    redirectTo: "/ogrenci-dogrulama",
  });

  const domainAllowed = await isAllowedUniversityEmailDomain(
    supabase,
    emailDomain
  );

  if (!domainAllowed) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Bu e-posta domaini öğrenci doğrulaması için uygun görünmüyor. Üniversite e-postan yoksa manuel inceleme yöntemini kullanabilirsin."
      )}`
    );
  }

  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  await supabase
    .from("student_verification_codes")
    .update({
      consumed_at: nowIso,
    })
    .eq("user_id", user.id)
    .is("consumed_at", null);

  const { error: insertError } = await supabase
    .from("student_verification_codes")
    .insert({
      user_id: user.id,
      university_email: universityEmail,
      email_domain: emailDomain,
      code_hash: codeHash,
      expires_at: expiresAt,
      last_sent_at: nowIso,
    });

  if (insertError) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        insertError.message || "Doğrulama kodu oluşturulamadı."
      )}`
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      verification_status: "pending",
      verification_method: "university_email_test_code",
      university_email: universityEmail,
      verification_note: verificationNote || null,
      verification_requested_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", user.id);

  if (profileError) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        profileError.message || "Profil doğrulama durumu güncellenemedi."
      )}`
    );
  }

  revalidatePath("/ogrenci-dogrulama");
  revalidatePath("/profilim");
  revalidatePath("/admin/dogrulamalar");

  if (isStudentVerificationTestMode()) {
  console.log("KAMPUSRAF_VERIFICATION_CODE", {
    to: universityEmail,
    code,
  });

  redirect("/ogrenci-dogrulama?success=code-created");
}

  redirect(
    `/ogrenci-dogrulama?error=${encodeURIComponent(
      "E-posta gönderimi şu an pasif. Domain alındıktan sonra otomatik kod gönderimi açılacak. Şimdilik manuel inceleme talebi gönderebilirsin."
    )}`
  );
}

export async function verifyStudentVerificationCodeAction(formData: FormData) {
  const universityEmail = normalizeEmail(
    String(formData.get("universityEmail") || "")
  );
  const code = safeCodeInput(String(formData.get("code") || ""));

  if (!isValidEmail(universityEmail)) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Lütfen geçerli bir üniversite e-posta adresi gir."
      )}`
    );
  }

  if (code.length !== 6) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Lütfen 6 haneli doğrulama kodunu gir."
      )}`
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  enforceActionRateLimit({
    userId: user.id,
    action: "verify-student-code",
    limit: 10,
    windowMs: 10 * 60_000,
    redirectTo: "/ogrenci-dogrulama",
  });

  const { data: codeRow, error: codeError } = await supabase
    .from("student_verification_codes")
    .select("id, code_hash, attempts, expires_at, consumed_at")
    .eq("user_id", user.id)
    .eq("university_email", universityEmail)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeError || !codeRow) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Aktif doğrulama kodu bulunamadı. Lütfen yeniden kod oluştur."
      )}`
    );
  }

  if (new Date(codeRow.expires_at).getTime() < Date.now()) {
    await supabase
      .from("student_verification_codes")
      .update({
        consumed_at: new Date().toISOString(),
      })
      .eq("id", codeRow.id);

    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Doğrulama kodunun süresi doldu. Lütfen yeni kod oluştur."
      )}`
    );
  }

  if ((codeRow.attempts || 0) >= 5) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Çok fazla hatalı deneme yapıldı. Lütfen yeni kod oluştur."
      )}`
    );
  }

  const expectedHash = hashVerificationCode(code);

  if (expectedHash !== codeRow.code_hash) {
    await supabase
      .from("student_verification_codes")
      .update({
        attempts: (codeRow.attempts || 0) + 1,
      })
      .eq("id", codeRow.id);

    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Doğrulama kodu hatalı."
      )}`
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .maybeSingle();

  const currentTrustScore = profile?.trust_score ?? 60;
  const nextTrustScore = Math.min(Math.max(currentTrustScore + 15, 70), 100);
  const now = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      verification_status: "verified",
      verification_method: "university_email_test_code",
      university_email: universityEmail,
      is_verified: true,
      trust_score: nextTrustScore,
      verification_verified_at: now,
      verification_note: null,
      updated_at: now,
    })
    .eq("id", user.id);

  if (profileError) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        profileError.message || "Doğrulama tamamlanamadı."
      )}`
    );
  }

  await supabase
    .from("student_verification_codes")
    .update({
      consumed_at: now,
    })
    .eq("id", codeRow.id);

  revalidatePath("/ogrenci-dogrulama");
  revalidatePath("/profilim");
  revalidatePath("/dashboard");
  revalidatePath("/kitap-ara");
  revalidatePath("/eslesmeler");
  revalidatePath("/admin/dogrulamalar");

  redirect("/ogrenci-dogrulama?success=verified");
}

export async function submitStudentVerificationAction(formData: FormData) {
  const method = String(formData.get("method") || "manual");
  const universityEmail = normalizeEmail(
    String(formData.get("universityEmail") || "")
  );
  const verificationNote = normalizeTextInput(formData.get("verificationNote"), {
    maxLength: 500,
    preserveLineBreaks: true,
  });

  if (method === "university_email") {
    return sendStudentVerificationCodeAction(formData);
  }

  const allowedMethods = ["document", "manual"];

  if (!allowedMethods.includes(method)) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Geçersiz doğrulama yöntemi."
      )}`
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  enforceActionRateLimit({
    userId: user.id,
    action: "submit-student-verification",
    limit: 5,
    windowMs: 10 * 60_000,
    redirectTo: "/ogrenci-dogrulama",
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      verification_status: "pending",
      verification_method: method,
      university_email: universityEmail || null,
      verification_note: verificationNote || null,
      verification_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        error.message || "Doğrulama talebi gönderilemedi."
      )}`
    );
  }

  revalidatePath("/ogrenci-dogrulama");
  revalidatePath("/profilim");
  revalidatePath("/admin/dogrulamalar");

  redirect("/ogrenci-dogrulama?success=verification-requested");
}
