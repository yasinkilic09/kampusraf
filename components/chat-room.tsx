"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  markConversationMessagesAsReadAction,
  sendMessageRealtimeAction,
} from "@/app/actions/conversations";

type ChatMessage = {
  id: string;
  conversation_id?: string | null;
  sender_id: string;
  receiver_id?: string | null;
  message: string;
  is_read?: boolean | null;
  created_at: string;
  status?: "sending" | "sent" | "failed";
};

type ChatRoomProps = {
  initialMessages: ChatMessage[];
  conversationId: string;
  currentUserId: string;
  chatTitle?: string;
  chatSubtitle?: string;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (sameDay) return "Bugün";
  if (isYesterday) return "Dün";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function isSameMessageDay(firstValue: string, secondValue?: string) {
  if (!secondValue) return false;

  const first = new Date(firstValue);
  const second = new Date(secondValue);

  return (
    first.getDate() === second.getDate() &&
    first.getMonth() === second.getMonth() &&
    first.getFullYear() === second.getFullYear()
  );
}

export function ChatRoom({
  initialMessages,
  conversationId,
  currentUserId,
  chatTitle = "KampüsRaf Sohbeti",
  chatSubtitle = "Güvenli kitap takası mesajlaşması",
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages]);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
  setTimeout(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    if (behavior === "auto") {
      container.scrollTop = container.scrollHeight;
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, 50);
}

  useEffect(() => {
    setMessages(initialMessages);
    scrollToBottom("auto");
  }, [initialMessages]);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [sortedMessages.length]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat-room-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;

          setMessages((currentMessages) => {
            const alreadyExists = currentMessages.some(
              (message) => message.id === newMessage.id
            );

            if (alreadyExists) return currentMessages;

            const withoutOptimisticCopy = currentMessages.filter(
              (message) =>
                !(
                  message.status === "sending" &&
                  message.sender_id === newMessage.sender_id &&
                  message.message === newMessage.message
                )
            );

            return [
              ...withoutOptimisticCopy,
              {
                ...newMessage,
                status: "sent",
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  function resizeTextarea() {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }

  async function sendCleanMessage(cleanMessage: string, tempId?: string) {
    const optimisticId = tempId || `temp-${crypto.randomUUID()}`;

    if (!tempId) {
      const tempMessage: ChatMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        receiver_id: null,
        message: cleanMessage,
        is_read: false,
        created_at: new Date().toISOString(),
        status: "sending",
      };

      setMessages((currentMessages) => [...currentMessages, tempMessage]);
    } else {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === tempId
            ? {
                ...message,
                status: "sending",
              }
            : message
        )
      );
    }

    setIsSending(true);
    scrollToBottom("smooth");

    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("message", cleanMessage);

    const result = await sendMessageRealtimeAction(formData);

    setIsSending(false);

    if (!result.success || !result.message) {
      setError(result.error || "Mesaj gönderilemedi.");

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === optimisticId
            ? {
                ...message,
                status: "failed",
              }
            : message
        )
      );

      return;
    }

    setError("");

    setMessages((currentMessages) => {
      const withoutTemp = currentMessages.filter(
        (message) => message.id !== optimisticId
      );

      const alreadyExists = withoutTemp.some(
        (message) => message.id === result.message?.id
      );

      if (alreadyExists) return withoutTemp;

      return [
        ...withoutTemp,
        {
          ...result.message,
          status: "sent",
        },
      ];
    });

    scrollToBottom("smooth");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanMessage = text.trim();

    if (!cleanMessage) return;

    setError("");
    setText("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }

    await sendCleanMessage(cleanMessage);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="flex h-[calc(100vh-16rem)] min-h-[560px] flex-col overflow-hidden rounded-[2rem] border border-[#2E7D5B]/10 bg-white shadow-sm md:h-[72vh]">
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur md:px-5 md:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2E7D5B] text-lg font-black text-white shadow-lg shadow-[#2E7D5B]/20">
            💬
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-black text-[#1F2933] md:text-base">
              {chatTitle}
            </h2>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
              {chatSubtitle}
            </p>
          </div>

          <div className="hidden rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-[11px] font-black text-[#2E7D5B] sm:block">
            Güvenli Sohbet
          </div>
        </div>
      </div>

      <div
  ref={messagesContainerRef}
  className="flex-1 overflow-y-auto bg-[#FAF7F0] px-3 py-4 md:px-5"
>
        {sortedMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm rounded-[1.5rem] border border-dashed border-[#2E7D5B]/25 bg-white p-6 text-center shadow-sm">
              <div className="text-4xl">💬</div>

              <h2 className="mt-4 text-lg font-black text-[#1F2933]">
                Sohbet başlatmaya hazırsın
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                İlk mesajı göndererek kitapla ilgili takas, ödünç veya paylaşım
                sürecini başlatabilirsin.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedMessages.map((message, index) => {
              const previousMessage = sortedMessages[index - 1];
              const shouldShowDate =
                !previousMessage ||
                !isSameMessageDay(message.created_at, previousMessage.created_at);

              const isMine = message.sender_id === currentUserId;
              const isFailed = message.status === "failed";
              const isSendingMessage = message.status === "sending";

              return (
                <div key={message.id}>
                  {shouldShowDate && (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-slate-400 shadow-sm">
                        {formatDateLabel(message.created_at)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`group max-w-[82%] break-words px-4 py-2.5 shadow-sm transition md:max-w-[72%] ${
                        isMine
                          ? "rounded-2xl rounded-br-md bg-[#2E7D5B] text-white"
                          : "rounded-2xl rounded-bl-md bg-white text-[#1F2933]"
                      } ${
                        isFailed
                          ? "ring-2 ring-red-200"
                          : ""
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {message.message}
                      </p>

                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-bold ${
                          isMine ? "text-white/65" : "text-slate-400"
                        }`}
                      >
                        <span>{formatTime(message.created_at)}</span>

                        {isMine && isSendingMessage && <span>• gönderiliyor</span>}

                        {isMine && isFailed && (
                          <button
                            type="button"
                            onClick={() =>
                              sendCleanMessage(message.message, message.id)
                            }
                            className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-black text-white"
                          >
                            Tekrar dene
                          </button>
                        )}

                        {isMine && !isSendingMessage && !isFailed && (
                          <span>✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-100 bg-white p-3 md:p-4"
      >
        {error && (
          <p className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
            {error}
          </p>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              resizeTextarea();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={2000}
            placeholder="Mesaj yaz..."
            className="max-h-36 min-h-12 flex-1 resize-none rounded-3xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
          />

          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2E7D5B] text-lg font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Mesaj gönder"
          >
            {isSending ? "…" : "➤"}
          </button>
        </div>

        <p className="mt-2 px-2 text-[11px] font-semibold text-slate-400">
          Enter ile gönder, Shift + Enter ile alt satıra geç.
        </p>
      </form>
    </div>
  );
}