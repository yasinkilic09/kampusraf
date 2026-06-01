"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ChatMessage = {
  id: string;
  conversation_id?: string | null;
  sender_id: string;
  message: string;
  created_at: string;
};

type ChatRealtimeMessagesProps = {
  initialMessages: ChatMessage[];
  conversationId: string;
  currentUserId: string;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ChatRealtimeMessages({
  initialMessages,
  conversationId,
  currentUserId,
}: ChatRealtimeMessagesProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [sortedMessages.length]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat-messages-${conversationId}`)
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

            return [...currentMessages, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  if (sortedMessages.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-[#2E7D5B]/25 bg-[#FAF7F0] p-5 text-center md:p-8">
        <div className="text-4xl">💬</div>

        <h2 className="mt-4 text-lg font-black md:text-xl">
          Sohbet başlatmaya hazırsın
        </h2>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
          İlk mesajı göndererek kitapla ilgili takas, ödünç veya paylaşım
          sürecini başlatabilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1 md:space-y-4">
      {sortedMessages.map((message) => {
        const isMine = message.sender_id === currentUserId;

        return (
          <div
            key={message.id}
            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[86%] break-words rounded-[1.3rem] px-4 py-3 shadow-sm md:max-w-[80%] md:rounded-[1.5rem] md:px-5 md:py-4 ${
                isMine
                  ? "bg-[#2E7D5B] text-white"
                  : "bg-[#FAF7F0] text-[#1F2933]"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-6 md:leading-7">
                {message.message}
              </p>

              <p
                className={`mt-2 text-[11px] font-bold ${
                  isMine ? "text-white/55" : "text-slate-400"
                }`}
              >
                {formatTime(message.created_at)}
              </p>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}