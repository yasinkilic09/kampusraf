"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveAccount } from "@/lib/account-status";

type MarkNotificationAndMessageInput =
  | FormData
  | {
      notificationId: string;
      targetUrl?: string | null;
    };

function parseMarkNotificationInput(input: MarkNotificationAndMessageInput) {
  if (input instanceof FormData) {
    return {
      notificationId: String(input.get("notificationId") || ""),
      targetUrl: String(input.get("targetUrl") || ""),
    };
  }

  return {
    notificationId: input.notificationId || "",
    targetUrl: input.targetUrl || "",
  };
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = String(formData.get("notificationId") || "");

  if (!notificationId) {
    redirect("/bildirimler");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/bildirimler");
  revalidatePath("/dashboard");
  revalidatePath("/mesajlar");
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/bildirimler");
  revalidatePath("/dashboard");
  revalidatePath("/mesajlar");
}

export async function markNotificationAndMessageAsReadAction(
  input: MarkNotificationAndMessageInput
) {
  const { notificationId, targetUrl } = parseMarkNotificationInput(input);

  const { supabase, user } = await requireActiveAccount("/bildirimler");

  if (notificationId) {
    await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);
  }

  const safeTargetUrl = targetUrl || "";
  const match = safeTargetUrl.match(/^\/mesajlar\/kullanici\/([^/]+)$/);
  const otherUserId = match?.[1];

  if (otherUserId) {
    await supabase
      .from("messages")
      .update({
        is_read: true,
      })
      .eq("receiver_id", user.id)
      .eq("sender_id", otherUserId)
      .eq("is_read", false);
  }

  revalidatePath("/mesajlar");
  revalidatePath("/bildirimler");
  revalidatePath("/dashboard");

  if (safeTargetUrl.startsWith("/")) {
    revalidatePath(safeTargetUrl);
  }

  return {
    success: true,
    error: null,
  };
}

export async function markNotificationAndMessageAsReadFormAction(
  formData: FormData
): Promise<void> {
  const notificationId = String(formData.get("notificationId") || "");
  const targetUrl = String(formData.get("targetUrl") || "");

  await markNotificationAndMessageAsReadAction({
    notificationId,
    targetUrl,
  });
}