"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return { supabase, user };
}

export async function approveStudentVerificationAction(formData: FormData) {
  const profileId = String(formData.get("profileId") || "");

  if (!profileId) {
    redirect("/admin/dogrulamalar");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({
      verification_status: "verified",
      is_verified: true,
      trust_score: 90,
      verification_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    redirect(
      `/admin/dogrulamalar?error=${encodeURIComponent(
        error.message || "Doğrulama onaylanamadı."
      )}`
    );
  }

  revalidatePath("/admin/dogrulamalar");
  revalidatePath("/profilim");

  redirect("/admin/dogrulamalar?success=approved");
}

export async function rejectStudentVerificationAction(formData: FormData) {
  const profileId = String(formData.get("profileId") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!profileId) {
    redirect("/admin/dogrulamalar");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({
      verification_status: "rejected",
      is_verified: false,
      verification_note:
        reason || "Doğrulama talebi admin tarafından reddedildi.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    redirect(
      `/admin/dogrulamalar?error=${encodeURIComponent(
        error.message || "Doğrulama reddedilemedi."
      )}`
    );
  }

  revalidatePath("/admin/dogrulamalar");
  revalidatePath("/profilim");

  redirect("/admin/dogrulamalar?success=rejected");
}

export async function resetStudentVerificationAction(formData: FormData) {
  const profileId = String(formData.get("profileId") || "");

  if (!profileId) {
    redirect("/admin/dogrulamalar");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({
      verification_status: "unverified",
      is_verified: false,
      verification_method: null,
      university_email: null,
      verification_document_url: null,
      verification_requested_at: null,
      verification_verified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    redirect(
      `/admin/dogrulamalar?error=${encodeURIComponent(
        error.message || "Doğrulama sıfırlanamadı."
      )}`
    );
  }

  revalidatePath("/admin/dogrulamalar");
  revalidatePath("/profilim");

  redirect("/admin/dogrulamalar?success=reset");
}