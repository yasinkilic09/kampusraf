"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const activeStatuses = ["requested", "meeting_planned", "handed_over"] as const;

const allowedStatuses = [
  "requested",
  "meeting_planned",
  "handed_over",
  "completed",
  "canceled",
] as const;

type ExchangeStatus = (typeof allowedStatuses)[number];

function isAllowedStatus(value: string): value is ExchangeStatus {
  return allowedStatuses.includes(value as ExchangeStatus);
}

function getOtherParticipant(
  conversation: {
    user_one_id: string;
    user_two_id: string;
  },
  currentUserId: string
) {
  return conversation.user_one_id === currentUserId
    ? conversation.user_two_id
    : conversation.user_one_id;
}

export async function createExchangeAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") || "");

  if (!conversationId) {
    redirect("/mesajlar");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, user_one_id, user_two_id, user_book_id")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    redirect("/mesajlar");
  }

  const isMember =
    conversation.user_one_id === user.id || conversation.user_two_id === user.id;

  if (!isMember) {
    redirect("/mesajlar");
  }

  if (!conversation.user_book_id) {
    redirect(`/mesajlar/${conversation.id}?error=${encodeURIComponent("Bu sohbet bir kitapla bağlı olmadığı için takas süreci başlatılamaz.")}`);
  }

  const { data: userBook } = await supabase
    .from("user_books")
    .select("id, user_id")
    .eq("id", conversation.user_book_id)
    .single();

  if (!userBook) {
    redirect(`/mesajlar/${conversation.id}`);
  }

  const ownerId = userBook.user_id;
  const otherUserId = getOtherParticipant(conversation, user.id);
  const requesterId = ownerId === user.id ? otherUserId : user.id;

  const { data: existingExchange } = await supabase
    .from("exchanges")
    .select("id")
    .eq("conversation_id", conversation.id)
    .in("status", [...activeStatuses])
    .maybeSingle();

  if (existingExchange) {
    redirect(`/mesajlar/${conversation.id}`);
  }

  const { error } = await supabase.from("exchanges").insert({
    conversation_id: conversation.id,
    user_book_id: userBook.id,
    requester_id: requesterId,
    owner_id: ownerId,
    requested_by: user.id,
    status: "requested",
  });

  if (error) {
    redirect(
      `/mesajlar/${conversation.id}?error=${encodeURIComponent(
        error.message || "Takas süreci başlatılamadı."
      )}`
    );
  }

  revalidatePath(`/mesajlar/${conversation.id}`);
  revalidatePath("/mesajlar");
  revalidatePath("/profilim");

  redirect(`/mesajlar/${conversation.id}`);
}

export async function updateExchangeStatusAction(formData: FormData) {
  const exchangeId = String(formData.get("exchangeId") || "");
  const conversationId = String(formData.get("conversationId") || "");
  const nextStatus = String(formData.get("status") || "");

  if (!exchangeId || !conversationId) {
    redirect("/mesajlar");
  }

  if (!isAllowedStatus(nextStatus)) {
    redirect(`/mesajlar/${conversationId}`);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: exchange } = await supabase
    .from("exchanges")
    .select("id, conversation_id, requester_id, owner_id, status")
    .eq("id", exchangeId)
    .single();

  if (!exchange) {
    redirect(`/mesajlar/${conversationId}`);
  }

  const isMember =
    exchange.requester_id === user.id || exchange.owner_id === user.id;

  if (!isMember) {
    redirect("/mesajlar");
  }

  const now = new Date().toISOString();

  const updatePayload: {
    status: ExchangeStatus;
    updated_at: string;
    completed_at?: string | null;
    canceled_at?: string | null;
  } = {
    status: nextStatus,
    updated_at: now,
  };

  if (nextStatus === "completed") {
    updatePayload.completed_at = now;
  }

  if (nextStatus === "canceled") {
    updatePayload.canceled_at = now;
  }

  const { error } = await supabase
    .from("exchanges")
    .update(updatePayload)
    .eq("id", exchange.id);

  if (error) {
    redirect(
      `/mesajlar/${conversationId}?error=${encodeURIComponent(
        error.message || "Takas durumu güncellenemedi."
      )}`
    );
  }

  revalidatePath(`/mesajlar/${conversationId}`);
  revalidatePath("/mesajlar");
  revalidatePath("/profilim");

  redirect(`/mesajlar/${conversationId}`);
}