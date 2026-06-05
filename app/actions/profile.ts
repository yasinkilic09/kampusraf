"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function updateProfileAction(formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();
  const usernameInput = String(formData.get("username") || "").trim();
  const university = String(formData.get("university") || "").trim();
  const department = String(formData.get("department") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  const gender = normalizeGender(String(formData.get("gender") || ""));
  const requestedMatchPreference = normalizeMatchGenderPreference(
    String(formData.get("matchGenderPreference") || "")
  );
  const showGenderOnProfile = formData.get("showGenderOnProfile") === "on";

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

  const finalMatchGenderPreference =
    canUseMatchPreference && gender !== "prefer_not_to_say"
      ? requestedMatchPreference
      : "everyone";

  const { error } = await supabase.from("profiles").upsert(
    {
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
      show_gender_on_profile: showGenderOnProfile,
      match_preferences_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    const message =
      error.code === "23505"
        ? "Bu kullanıcı adı başka biri tarafından kullanılıyor."
        : error.message;

    redirect(`/profilim?error=${encodeURIComponent(message)}`);
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
  },
  plus: {
    monthly_book_limit: 30,
    monthly_request_limit: 30,
    monthly_message_limit: 100,
    monthly_match_limit: 40,
  },
  premium: {
    monthly_book_limit: 75,
    monthly_request_limit: 75,
    monthly_message_limit: 300,
    monthly_match_limit: 150,
  },
  pro: {
    monthly_book_limit: 200,
    monthly_request_limit: 200,
    monthly_message_limit: 1000,
    monthly_match_limit: 500,
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

  const selectedPlan = planType as keyof typeof planLimits;
  const canKeepMatchPreference = canUseGenderMatchPreference(selectedPlan);

  const { error } = await supabase
    .from("profiles")
    .update({
      plan_type: selectedPlan,
      plan_status: "active",
      plan_started_at: new Date().toISOString(),
      plan_expires_at: null,
      ...planLimits[selectedPlan],
      ...(canKeepMatchPreference
        ? {}
        : {
            match_gender_preference: "everyone",
            match_preferences_updated_at: new Date().toISOString(),
          }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/paketler?error=${encodeURIComponent(error.message)}`);
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
  const verificationNote = String(
    formData.get("verificationNote") || ""
  ).trim();

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
  const verificationNote = String(formData.get("verificationNote") || "").trim();

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