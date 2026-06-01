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

export async function updateUserAccountStatusAction(formData: FormData) {
  const profileId = String(formData.get("profileId") || "");
  const accountStatus = String(formData.get("accountStatus") || "active");

  const allowedStatuses = ["active", "suspended", "banned"];

  if (!profileId || !allowedStatuses.includes(accountStatus)) {
    redirect("/admin/kullanicilar");
  }

  const { supabase, user } = await requireAdmin();

  if (profileId === user.id && accountStatus !== "active") {
    redirect(
      `/admin/kullanicilar?error=${encodeURIComponent(
        "Kendi hesabını askıya alamaz veya engelleyemezsin."
      )}`
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      account_status: accountStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    redirect(
      `/admin/kullanicilar?error=${encodeURIComponent(
        error.message || "Hesap durumu güncellenemedi."
      )}`
    );
  }

  revalidatePath("/admin/kullanicilar");
  redirect("/admin/kullanicilar?success=account-updated");
}

export async function updateUserRoleAction(formData: FormData) {
  const profileId = String(formData.get("profileId") || "");
  const role = String(formData.get("role") || "user");

  const allowedRoles = ["user", "admin"];

  if (!profileId || !allowedRoles.includes(role)) {
    redirect("/admin/kullanicilar");
  }

  const { supabase, user } = await requireAdmin();

  if (profileId === user.id && role !== "admin") {
    redirect(
      `/admin/kullanicilar?error=${encodeURIComponent(
        "Kendi admin yetkini kaldıramazsın."
      )}`
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (error) {
    redirect(
      `/admin/kullanicilar?error=${encodeURIComponent(
        error.message || "Kullanıcı rolü güncellenemedi."
      )}`
    );
  }

  revalidatePath("/admin/kullanicilar");
  redirect("/admin/kullanicilar?success=role-updated");
}