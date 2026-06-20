"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markNotificationAndMessageAsReadAction } from "@/app/actions/notifications";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  target_url: string | null;
  is_read: boolean;
  created_at: string;
};

function getNotificationIcon(type: string) {
  if (type === "message") return "💬";
  if (type === "new_message") return "💬";
  if (type === "book_found") return "📚";
  if (type === "new_match") return "🤝";
  if (type === "exchange_requested") return "🔄";
  if (type === "exchange_meeting_planned") return "📍";
  if (type === "exchange_handed_over") return "📦";
  if (type === "exchange_completed") return "✅";
  if (type === "exchange_canceled") return "❌";
  if (type === "limit_warning") return "⚠️";
  return "🔔";
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationBell() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(false);

  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const shouldHide =
    pathname === "/" ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/sign-up");

  const fetchUnreadSummary = useCallback(async () => {
    if (shouldHide) return null;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setIsLoggedIn(false);
        setUnreadCount(0);
        setItems([]);
        return null;
      }

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setIsLoggedIn(true);
      setUnreadCount(count || 0);

      return user.id;
    } catch {
      setIsLoggedIn(false);
      setUnreadCount(0);
      setItems([]);
      return null;
    }
  }, [shouldHide, supabase]);

  const fetchNotifications = useCallback(async () => {
    if (shouldHide) return;

    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setIsLoggedIn(false);
        setUnreadCount(0);
        setItems([]);
        return;
      }

      const [countResult, listResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
        supabase
          .from("notifications")
          .select(
            "id, type, title, message, link_url, target_url, is_read, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setIsLoggedIn(true);
      setUnreadCount(countResult.count || 0);
      setItems((listResult.data || []) as NotificationItem[]);
    } catch {
      setIsLoggedIn(false);
      setUnreadCount(0);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [shouldHide, supabase]);

  async function markOneAsRead(
    notificationId: string,
    targetUrl?: string | null
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );

    setUnreadCount((currentCount) => Math.max(currentCount - 1, 0));

    try {
      await markNotificationAndMessageAsReadAction({
        notificationId,
        targetUrl: targetUrl || "",
      });

      if (isOpenRef.current) {
        await fetchNotifications();
      } else {
        await fetchUnreadSummary();
      }
    } catch {
      // Optimistic read state is enough if the network is temporarily unavailable.
    }
  }

  async function markAllAsRead() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return;

      const unreadItems = items.filter((item) => !item.is_read);

      setItems((currentItems) =>
        currentItems.map((item) => ({
          ...item,
          is_read: true,
        }))
      );

      setUnreadCount(0);

      await Promise.all(
        unreadItems
          .filter((item) => item.target_url)
          .map((item) =>
            markNotificationAndMessageAsReadAction({
              notificationId: item.id,
              targetUrl: item.target_url,
            })
          )
      );

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      await fetchNotifications();
    } catch {
      setUnreadCount(0);
    }
  }

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (shouldHide) return;

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    let isActive = true;

    async function setupRealtimeNotifications() {
      try {
        const userId = await fetchUnreadSummary();

        if (!userId || !isActive) return;

        realtimeChannel = supabase
          .channel(`notifications:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            async () => {
              if (isOpenRef.current) {
                await fetchNotifications();
              } else {
                await fetchUnreadSummary();
              }
            }
          )
          .subscribe();
      } catch {
        setIsLoggedIn(false);
      }
    }

    let idleCallbackId: number | null = null;
    let setupTimeoutId: ReturnType<typeof setTimeout> | null = null;

    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(
        () => {
          void setupRealtimeNotifications();
        },
        { timeout: 2200 }
      );
    } else {
      setupTimeoutId = globalThis.setTimeout(() => {
        void setupRealtimeNotifications();
      }, 900);
    }

    const backupInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchUnreadSummary();
      }
    }, 90000);
    const handleFocus = () => {
      void fetchUnreadSummary();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isActive = false;
      if (idleCallbackId !== null) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (setupTimeoutId !== null) {
        globalThis.clearTimeout(setupTimeoutId);
      }
      window.clearInterval(backupInterval);
      window.removeEventListener("focus", handleFocus);

      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [fetchNotifications, fetchUnreadSummary, shouldHide, supabase]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (shouldHide || !isLoggedIn) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed right-4 top-4 z-50 md:right-6 md:top-5"
    >
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => {
            const nextOpen = !current;

            if (nextOpen) {
              void fetchNotifications();
            }

            return nextOpen;
          });
        }}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#2E7D5B]/10 bg-white text-xl shadow-xl shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-[#FAF7F0]"
        aria-label="Bildirimler"
      >
        🔔

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-[1.5rem] border border-[#2E7D5B]/10 bg-white shadow-2xl shadow-slate-900/15">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <p className="text-sm font-black text-[#1F2933]">
                Bildirimler
              </p>

              <p className="text-xs font-semibold text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} okunmamış bildirim`
                  : "Okunmamış bildirim yok"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="rounded-full bg-[#2E7D5B]/10 px-3 py-2 text-[11px] font-black text-[#2E7D5B] transition hover:bg-[#2E7D5B]/15"
              >
                Tümünü oku
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto p-2">
            {isLoading && items.length === 0 ? (
              <div className="p-5 text-center text-sm font-bold text-slate-400">
                Bildirimler yükleniyor...
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-3xl">🔕</p>

                <p className="mt-2 text-sm font-black text-[#1F2933]">
                  Henüz bildirim yok
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Yeni mesaj ve eşleşmeler burada görünecek.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const actionUrl = item.target_url || item.link_url;
                const actionLabel = item.target_url ? "Mesaja Git" : "Git";

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-3 ${
                      item.is_read ? "bg-white" : "bg-[#2E7D5B]/5"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FAF7F0] text-lg">
                        {getNotificationIcon(item.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="break-words text-sm font-black text-[#1F2933]">
                            {item.title}
                          </p>

                          {!item.is_read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                          )}
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {item.message}
                        </p>

                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          {formatShortDate(item.created_at)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {actionUrl && (
                            <Link
                              href={actionUrl}
                              onClick={() => {
                                setIsOpen(false);
                                void markOneAsRead(item.id, actionUrl);
                              }}
                              className="rounded-full bg-[#2E7D5B] px-3 py-2 text-[11px] font-black text-white"
                            >
                              {actionLabel}
                            </Link>
                          )}

                          {!item.is_read && (
                            <button
                              type="button"
                              onClick={() =>
                                void markOneAsRead(
                                  item.id,
                                  item.target_url || item.link_url
                                )
                              }
                              className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600"
                            >
                              Okundu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 p-3">
            <Link
              href="/bildirimler"
              onClick={() => setIsOpen(false)}
              className="block rounded-full bg-[#1F2933] px-4 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5"
            >
              Tüm Bildirimleri Gör
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
