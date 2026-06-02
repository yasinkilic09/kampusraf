"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function sendFriendRequestAction(formData: FormData) {
  const supabase = await createClient();

  const addresseeId = String(formData.get("addresseeId") || "");
  const redirectTo = String(formData.get("redirectTo") || "/arkadaslar");

  if (!addresseeId) {
    return;
  }

  const { error } = await supabase.rpc("send_friend_request", {
    p_addressee_id: addresseeId,
  });

  if (error) {
    console.error("sendFriendRequestAction error:", error.message);
    return;
  }

  revalidatePath("/arkadaslar");
  revalidatePath("/eslesmeler");
  revalidatePath("/mesajlar");

  if (redirectTo.startsWith("/")) {
    revalidatePath(redirectTo);
    redirect(redirectTo);
  }
}

export async function respondFriendRequestAction(formData: FormData) {
  const supabase = await createClient();

  const friendshipId = String(formData.get("friendshipId") || "");
  const response = String(formData.get("response") || "");

  if (!friendshipId || !response) {
    return;
  }

  const { error } = await supabase.rpc("respond_friend_request", {
    p_friendship_id: friendshipId,
    p_response: response,
  });

  if (error) {
    console.error("respondFriendRequestAction error:", error.message);
    return;
  }

  revalidatePath("/arkadaslar");
}

export async function removeFriendshipAction(formData: FormData) {
  const supabase = await createClient();

  const friendshipId = String(formData.get("friendshipId") || "");

  if (!friendshipId) {
    return;
  }

  const { error } = await supabase.rpc("remove_friendship", {
    p_friendship_id: friendshipId,
  });

  if (error) {
    console.error("removeFriendshipAction error:", error.message);
    return;
  }

  revalidatePath("/arkadaslar");
  revalidatePath("/eslesmeler");
  revalidatePath("/mesajlar");
}