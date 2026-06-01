"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage-limits";
import { requireActiveAccount } from "@/lib/account-status";

export async function startConversationAction(formData: FormData) {
  await requireActiveAccount("/mesajlar");

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
  await requireActiveAccount("/mesajlar");

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

const limitCheck = await checkUsageLimit(supabase, user.id, "messages");

if (!limitCheck.allowed) {
  redirect(
    `/mesajlar/${conversation.id}?error=${encodeURIComponent(
      limitCheck.message || "Aylık mesaj gönderme limitine ulaştın."
    )}`
  );
}

const { error: messageError } = await supabase.from("messages").insert({
  conversation_id: conversation.id,
  sender_id: user.id,
  receiver_id: receiverId,
  message,
  is_read: false,
});

if (messageError) {
  redirect(
    `/mesajlar/${conversation.id}?error=${encodeURIComponent(
      messageError.message || "Mesaj gönderilemedi."
    )}`
  );
}

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
  await requireActiveAccount("/mesajlar");

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

export async function sendMessageRealtimeAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") || "");
  const message = String(formData.get("message") || "").trim();

  if (!conversationId) {
    return {
      success: false,
      error: "Sohbet bulunamadı.",
      message: null,
    };
  }

  if (!message) {
    return {
      success: false,
      error: "Mesaj boş olamaz.",
      message: null,
    };
  }

  if (message.length > 2000) {
    return {
      success: false,
      error: "Mesaj en fazla 2000 karakter olabilir.",
      message: null,
    };
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
    return {
      success: false,
      error: "Sohbet bulunamadı.",
      message: null,
    };
  }

  const isUserOne = conversation.user_one_id === user.id;
  const isUserTwo = conversation.user_two_id === user.id;

  if (!isUserOne && !isUserTwo) {
    return {
      success: false,
      error: "Bu sohbete mesaj gönderme yetkin yok.",
      message: null,
    };
  }

  const receiverId = isUserOne
    ? conversation.user_two_id
    : conversation.user_one_id;

  if (!receiverId || receiverId === user.id) {
    return {
      success: false,
      error: "Alıcı kullanıcı bulunamadı.",
      message: null,
    };
  }

  const { data: insertedMessage, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      receiver_id: receiverId,
      message,
      is_read: false,
    })
    .select("id, conversation_id, sender_id, receiver_id, message, is_read, created_at")
    .single();

  if (error || !insertedMessage) {
    return {
      success: false,
      error: error?.message || "Mesaj gönderilemedi.",
      message: null,
    };
  }

  await supabase
    .from("conversations")
    .update({
      last_message: message,
      last_message_at: insertedMessage.created_at,
      updated_at: insertedMessage.created_at,
    })
    .eq("id", conversation.id);

  return {
    success: true,
    error: null,
    message: insertedMessage,
  };
}

export async function markConversationMessagesAsReadAction(
  conversationIds: string[]
) {
  if (!conversationIds.length) {
    return {
      success: true,
      error: null,
    };
  }

  const { supabase, user } = await requireActiveAccount("/mesajlar");

  const safeConversationIds = conversationIds.filter(Boolean);

  if (!safeConversationIds.length) {
    return {
      success: true,
      error: null,
    };
  }

  const { error } = await supabase
    .from("messages")
    .update({
      is_read: true,
    })
    .in("conversation_id", safeConversationIds)
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/mesajlar");

  return {
    success: true,
    error: null,
  };
}