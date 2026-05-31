"use server";

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

export async function updateProfileAction(formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();
  const usernameInput = String(formData.get("username") || "").trim();
  const university = String(formData.get("university") || "").trim();
  const department = String(formData.get("department") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  const username = usernameInput ? cleanUsername(usernameInput) : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

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

  const { error } = await supabase
    .from("profiles")
    .update({
      plan_type: selectedPlan,
      plan_status: "active",
      plan_started_at: new Date().toISOString(),
      plan_expires_at: null,
      ...planLimits[selectedPlan],
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/paketler?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/paketler");
  revalidatePath("/profilim");
  revalidatePath("/dashboard");

  redirect("/paketler?success=plan-updated");
}

export async function submitStudentVerificationAction(formData: FormData) {
  const method = String(formData.get("method") || "university_email");
  const universityEmail = String(formData.get("universityEmail") || "")
    .trim()
    .toLowerCase();
  const verificationNote = String(formData.get("verificationNote") || "").trim();

  const allowedMethods = ["university_email", "document", "manual"];

  if (!allowedMethods.includes(method)) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Geçersiz doğrulama yöntemi."
      )}`
    );
  }

  if (method === "university_email" && !universityEmail.includes("@")) {
    redirect(
      `/ogrenci-dogrulama?error=${encodeURIComponent(
        "Lütfen geçerli bir üniversite e-posta adresi gir."
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

  redirect("/ogrenci-dogrulama?success=verification-requested");
}