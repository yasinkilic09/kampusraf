"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveAccount } from "@/lib/account-status";
import { createClient } from "@/lib/supabase/server";

const allowedReasons = [
  "spam",
  "harassment",
  "fraud",
  "inappropriate",
  "unsafe_exchange",
  "other",
];

const allowedStatuses = ["pending", "reviewed", "action_taken", "rejected"];

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

export async function submitUserReportAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") || "");
  const reason = String(formData.get("reason") || "");
  const description = String(formData.get("description") || "").trim();

  if (!conversationId) {
    redirect("/mesajlar");
  }

  if (!allowedReasons.includes(reason)) {
    redirect(
      `/mesajlar/${conversationId}?error=${encodeURIComponent(
        "Lütfen geçerli bir şikayet sebebi seç."
      )}`
    );
  }

  if (description.length > 1000) {
    redirect(
      `/mesajlar/${conversationId}?error=${encodeURIComponent(
        "Açıklama en fazla 1000 karakter olabilir."
      )}`
    );
  }

  const { supabase, user } = await requireActiveAccount(
    `/mesajlar/${conversationId}`
  );

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, user_one_id, user_two_id")
    .eq("id", conversationId)
    .single();

  if (conversationError || !conversation) {
    redirect(
      `/mesajlar?error=${encodeURIComponent("Sohbet bulunamadı.")}`
    );
  }

  const isUserOne = conversation.user_one_id === user.id;
  const isUserTwo = conversation.user_two_id === user.id;

  if (!isUserOne && !isUserTwo) {
    redirect("/mesajlar");
  }

  const reportedUserId = isUserOne
    ? conversation.user_two_id
    : conversation.user_one_id;

  if (!reportedUserId || reportedUserId === user.id) {
    redirect(
      `/mesajlar/${conversationId}?error=${encodeURIComponent(
        "Bu kullanıcı için şikayet oluşturulamadı."
      )}`
    );
  }

  const { error } = await supabase.from("user_reports").insert({
    reporter_id: user.id,
    reported_user_id: reportedUserId,
    conversation_id: conversationId,
    reason,
    description: description || null,
    status: "pending",
  });

  if (error) {
    redirect(
      `/mesajlar/${conversationId}?error=${encodeURIComponent(
        error.message || "Şikayet gönderilemedi."
      )}`
    );
  }

  revalidatePath(`/mesajlar/${conversationId}`);
  revalidatePath("/admin/sikayetler");

  redirect(`/mesajlar/${conversationId}?success=report-sent`);
}

export async function updateUserReportAction(formData: FormData) {
  const reportId = String(formData.get("reportId") || "");
  const status = String(formData.get("status") || "reviewed");
  const adminNote = String(formData.get("adminNote") || "").trim();
  const accountAction = String(formData.get("accountAction") || "none");

  if (!reportId || !allowedStatuses.includes(status)) {
    redirect("/admin/sikayetler");
  }

  const { supabase, user } = await requireAdmin();

  const { data: report } = await supabase
    .from("user_reports")
    .select("id, reported_user_id")
    .eq("id", reportId)
    .single();

  if (!report) {
    redirect(
      `/admin/sikayetler?error=${encodeURIComponent("Şikayet kaydı bulunamadı.")}`
    );
  }

  const { error } = await supabase
    .from("user_reports")
    .update({
      status,
      admin_note: adminNote || null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    redirect(
      `/admin/sikayetler?error=${encodeURIComponent(
        error.message || "Şikayet güncellenemedi."
      )}`
    );
  }

  if (["active", "suspended", "banned"].includes(accountAction)) {
    if (report.reported_user_id === user.id) {
      redirect(
        `/admin/sikayetler?error=${encodeURIComponent(
          "Kendi hesabına bu işlem uygulanamaz."
        )}`
      );
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        account_status: accountAction,
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.reported_user_id);

    if (profileError) {
      redirect(
        `/admin/sikayetler?error=${encodeURIComponent(
          profileError.message || "Kullanıcı hesap durumu güncellenemedi."
        )}`
      );
    }
  }

  revalidatePath("/admin/sikayetler");
  revalidatePath("/admin/kullanicilar");

  redirect("/admin/sikayetler?success=report-updated");
}