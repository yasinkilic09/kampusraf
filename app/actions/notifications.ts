"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveAccount } from "@/lib/account-status";
import {
  normalizeInternalPath,
  normalizeTextInput,
  normalizeUuid,
} from "@/lib/validation";

type MarkNotificationAndMessageInput =
  | FormData
  | {
      notificationId: string;
      targetUrl?: string | null;
    };

function parseMarkNotificationInput(input: MarkNotificationAndMessageInput) {
  if (input instanceof FormData) {
    return {
      notificationId: normalizeUuid(input.get("notificationId")) || "",
      targetUrl: normalizeInternalPath(input.get("targetUrl"), ""),
    };
  }

  return {
    notificationId: normalizeUuid(input.notificationId) || "",
    targetUrl: normalizeInternalPath(input.targetUrl, ""),
  };
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = normalizeUuid(formData.get("notificationId"));

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
  const otherUserId = normalizeUuid(match?.[1]);

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
  const notificationId = normalizeUuid(formData.get("notificationId")) || "";
  const targetUrl = normalizeInternalPath(formData.get("targetUrl"), "");

  await markNotificationAndMessageAsReadAction({
    notificationId,
    targetUrl,
  });
}

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  targetUrl?: string | null;
};

export async function createNotificationAction({
  userId,
  type,
  title,
  message,
  linkUrl = null,
  targetUrl = null,
}: CreateNotificationInput) {
  const safeUserId = normalizeUuid(userId);
  const safeTitle = normalizeTextInput(title, { maxLength: 120 });
  const safeMessage = normalizeTextInput(message, {
    maxLength: 500,
    preserveLineBreaks: true,
  });
  const safeLinkUrl = normalizeInternalPath(linkUrl, "");
  const safeTargetUrl = normalizeInternalPath(targetUrl || linkUrl, "");

  if (!safeUserId || !safeTitle || !safeMessage) {
    return {
      success: false,
      error: "Bildirim bilgileri eksik.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("create_notification_for_user", {
  p_user_id: safeUserId,
  p_type: type,
  p_title: safeTitle,
  p_message: safeMessage,
  p_link_url: safeLinkUrl || null,
  p_target_url: safeTargetUrl || safeLinkUrl || null,
});

  if (error) {
    console.error("CREATE_NOTIFICATION_ERROR", error.message);

    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/bildirimler");
  revalidatePath("/dashboard");

  return {
    success: true,
    error: null,
  };
}
