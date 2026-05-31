"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function startConversationAction(formData: FormData) {
  const userBookId = String(formData.get("userBookId") || "");

  if (!userBookId) {
    redirect("/kitap-ara");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: userBook } = await supabase
    .from("user_books")
    .select("id, user_id")
    .eq("id", userBookId)
    .single();

  if (!userBook) {
    redirect("/kitap-ara");
  }

  if (userBook.user_id === user.id) {
    redirect(`/kitaplar/${userBookId}`);
  }

  const { data: existingConversations } = await supabase
    .from("conversations")
    .select("id, user_one_id, user_two_id")
    .eq("user_book_id", userBookId)
    .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`);

  const existingConversation = existingConversations?.find((conversation) => {
    const sameUsers =
      (conversation.user_one_id === user.id &&
        conversation.user_two_id === userBook.user_id) ||
      (conversation.user_one_id === userBook.user_id &&
        conversation.user_two_id === user.id);

    return sameUsers;
  });

  if (existingConversation) {
    redirect(`/mesajlar/${existingConversation.id}`);
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      user_one_id: user.id,
      user_two_id: userBook.user_id,
      user_book_id: userBook.id,
      last_message: "Sohbet başlatıldı.",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !conversation) {
    redirect(`/kitaplar/${userBookId}`);
  }

  revalidatePath("/mesajlar");
  redirect(`/mesajlar/${conversation.id}`);
}

export async function sendMessageAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") || "");
  const message = String(formData.get("message") || "").trim();

  if (!conversationId) {
    redirect("/mesajlar");
  }

  if (!message) {
    redirect(`/mesajlar/${conversationId}`);
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
    .select("id, user_one_id, user_two_id")
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

  const receiverId =
    conversation.user_one_id === user.id
      ? conversation.user_two_id
      : conversation.user_one_id;

  await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: user.id,
    receiver_id: receiverId,
    message,
    is_read: false,
  });

  await supabase
    .from("conversations")
    .update({
      last_message: message,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);

  revalidatePath("/mesajlar");
  revalidatePath(`/mesajlar/${conversation.id}`);

  redirect(`/mesajlar/${conversation.id}`);
}

export async function startMatchConversationAction(formData: FormData) {
  const matchId = String(formData.get("matchId") || "");

  if (!matchId) {
    redirect("/eslesmeler");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: match } = await supabase
    .from("book_matches")
    .select("id, requester_id, owner_id, user_book_id")
    .eq("id", matchId)
    .single();

  if (!match) {
    redirect("/eslesmeler");
  }

  const isParticipant =
    match.requester_id === user.id || match.owner_id === user.id;

  if (!isParticipant) {
    redirect("/eslesmeler");
  }

  const otherUserId =
    match.requester_id === user.id ? match.owner_id : match.requester_id;

  const { data: existingConversations } = await supabase
    .from("conversations")
    .select("id, user_one_id, user_two_id")
    .eq("user_book_id", match.user_book_id)
    .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`);

  const existingConversation = existingConversations?.find((conversation) => {
    const sameUsers =
      (conversation.user_one_id === user.id &&
        conversation.user_two_id === otherUserId) ||
      (conversation.user_one_id === otherUserId &&
        conversation.user_two_id === user.id);

    return sameUsers;
  });

  if (existingConversation) {
    redirect(`/mesajlar/${existingConversation.id}`);
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      user_one_id: user.id,
      user_two_id: otherUserId,
      user_book_id: match.user_book_id,
      last_message: "Eşleşme üzerinden sohbet başlatıldı.",
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !conversation) {
    redirect("/eslesmeler");
  }

  await supabase
    .from("book_matches")
    .update({
      status: "contacted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", match.id);

  revalidatePath("/mesajlar");
  revalidatePath("/eslesmeler");

  redirect(`/mesajlar/${conversation.id}`);
}