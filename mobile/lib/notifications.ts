import { supabase } from "@/lib/supabase";
import { getUserPushTokens, sendExpoPushNotification } from "@/lib/push-notifications";

export type NotificationPayload = {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  targetUrl?: string | null;
};

export async function createMobileNotification({
  userId,
  type,
  title,
  message,
  linkUrl = null,
  targetUrl = null,
}: NotificationPayload) {
  if (!userId || !title || !message) {
    return { success: false, error: "Bildirim bilgileri eksik." };
  }

  const { error } = await supabase.rpc("create_notification_for_user", {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_link_url: linkUrl,
    p_target_url: targetUrl || linkUrl,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const pushTokens = await getUserPushTokens(userId);
  await sendExpoPushNotification({
    tokens: pushTokens,
    title,
    body: message,
    url: targetUrl || linkUrl,
  });

  return { success: true, error: null };
}

export async function getActorDisplayName(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", userId)
    .maybeSingle();

  return data?.full_name || data?.username || "Bir KampusRaf kullanicisi";
}
