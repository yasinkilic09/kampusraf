"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type InboxConversationGroup = {
  id: string;
  otherUserId: string;
  primaryConversationId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount: number;
  conversationCount: number;
  otherUser: {
    name: string;
    username: string;
    avatarUrl: string | null;
    university: string;
    city: string;
  };
  books: {
    title: string;
    author: string;
    image: string | null;
    conversationId: string;
  }[];
};

type MessagesInboxProps = {
  conversations: InboxConversationGroup[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatInboxTime(value: string | null) {
  if (!value) return "Yeni";

  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date();

  yesterday.setDate(now.getDate() - 1);

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (isYesterday) return "Dün";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function MessagesInbox({ conversations }: MessagesInboxProps) {
  const [search, setSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const unreadTotal = conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const matchesUnread = showUnreadOnly
        ? conversation.unreadCount > 0
        : true;

      if (!matchesUnread) return false;

      if (!query) return true;

      const searchableText = [
        conversation.otherUser.name,
        conversation.otherUser.username,
        conversation.otherUser.university,
        conversation.otherUser.city,
        conversation.lastMessage,
        ...conversation.books.flatMap((book) => [book.title, book.author]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [conversations, search, showUnreadOnly]);

  return (
    <div className="mt-6 grid gap-4 md:mt-8">
      <div className="rounded-[1.7rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-[#1F2933]">
              Konuşma Merkezi
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {conversations.length} kişi · {unreadTotal} okunmamış mesaj
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowUnreadOnly(false)}
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                !showUnreadOnly
                  ? "bg-[#2E7D5B] text-white"
                  : "bg-[#FAF7F0] text-slate-500"
              }`}
            >
              Tümü
            </button>

            <button
              type="button"
              onClick={() => setShowUnreadOnly(true)}
              className={`rounded-full px-4 py-2 text-xs font-black transition ${
                showUnreadOnly
                  ? "bg-[#F59E0B] text-white"
                  : "bg-[#FAF7F0] text-slate-500"
              }`}
            >
              Okunmamış
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kullanıcı, kitap veya mesaj ara..."
            className="w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
          />
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="rounded-[1.7rem] border border-dashed border-[#2E7D5B]/25 bg-white p-6 text-center shadow-sm md:rounded-[2rem] md:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
            🔎
          </div>

          <h2 className="mt-5 text-xl font-black text-[#1F2933]">
            Sonuç bulunamadı
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
            Arama kelimeni değiştirerek veya okunmamış filtresini kapatarak
            tekrar deneyebilirsin.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm md:rounded-[2rem]">
          {filteredConversations.map((conversation, index) => {
            const hasUnread = conversation.unreadCount > 0;
            const lastMessage =
              conversation.lastMessage || "Sohbet başlatıldı.";
            const latestBook = conversation.books[0];

            return (
              <Link
                key={conversation.id}
                href={`/mesajlar/kullanici/${conversation.otherUserId}`}
                className={`block transition hover:bg-[#FAF7F0] ${
                  index !== filteredConversations.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <div className="flex gap-3 p-4 md:gap-4 md:p-5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#2E7D5B] text-white md:h-16 md:w-16 md:rounded-3xl">
                    {conversation.otherUser.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={conversation.otherUser.avatarUrl}
                        alt={conversation.otherUser.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-black">
                        {getInitials(conversation.otherUser.name) || "KR"}
                      </div>
                    )}

                    {hasUnread && (
                      <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white bg-[#F59E0B]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2
                          className={`line-clamp-1 text-base leading-tight md:text-lg ${
                            hasUnread
                              ? "font-black text-[#1F2933]"
                              : "font-extrabold text-[#1F2933]"
                          }`}
                        >
                          {conversation.otherUser.name}
                        </h2>

                        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
                          {conversation.otherUser.university} ·{" "}
                          {conversation.otherUser.city}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <p
                          className={`text-xs font-black ${
                            hasUnread ? "text-[#2E7D5B]" : "text-slate-400"
                          }`}
                        >
                          {formatInboxTime(
                            conversation.lastMessageAt ||
                              conversation.createdAt
                          )}
                        </p>

                        {hasUnread && (
                          <span className="flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#2E7D5B] px-2 text-[11px] font-black text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-[#FAF7F0] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-black text-[#2E7D5B]">
                            {latestBook?.title || "Kitap bilgisi yok"}
                          </p>

                          {latestBook?.author && (
                            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                              {latestBook.author}
                            </p>
                          )}
                        </div>

                        {conversation.conversationCount > 1 && (
                          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#2E7D5B]">
                            {conversation.conversationCount} kitap
                          </span>
                        )}
                      </div>

                      {conversation.books.length > 1 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {conversation.books.slice(0, 3).map((book) => (
                            <span
                              key={book.conversationId}
                              className="max-w-full rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500"
                            >
                              {book.title}
                            </span>
                          ))}

                          {conversation.books.length > 3 && (
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500">
                              +{conversation.books.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <p
                      className={`mt-3 line-clamp-1 text-sm ${
                        hasUnread
                          ? "font-black text-[#1F2933]"
                          : "font-semibold text-slate-500"
                      }`}
                    >
                      {lastMessage}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}