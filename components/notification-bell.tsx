"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

function getNotificationIcon(type: string) {
  if (type === "new_message") return "💬";
  if (type === "book_found") return "📚";
  if (type === "new_match") return "🤝";
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

  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const shouldHide =
    pathname === "/" ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/sign-up");

  async function fetchNotifications() {
    if (shouldHide) return;

    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoggedIn(false);
      setUnreadCount(0);
      setItems([]);
      setIsLoading(false);
      return;
    }

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, message, link_url, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setIsLoggedIn(true);
    setUnreadCount(count || 0);
    setItems((data || []) as NotificationItem[]);
    setIsLoading(false);
  }

  async function markOneAsRead(notificationId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    await fetchNotifications();
  }

  async function markAllAsRead() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    await fetchNotifications();
  }

  useEffect(() => {
    if (shouldHide) return;

    fetchNotifications();

    const interval = window.setInterval(fetchNotifications, 20000);
    window.addEventListener("focus", fetchNotifications);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", fetchNotifications);
    };
  }, [pathname, shouldHide]);

  useEffect(() => {
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
  }, []);

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
          setIsOpen((current) => !current);
          fetchNotifications();
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
              items.map((item) => (
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
                        {item.link_url && (
                          <Link
                            href={item.link_url}
                            onClick={() => setIsOpen(false)}
                            className="rounded-full bg-[#2E7D5B] px-3 py-2 text-[11px] font-black text-white"
                          >
                            Git
                          </Link>
                        )}

                        {!item.is_read && (
                          <button
                            type="button"
                            onClick={() => markOneAsRead(item.id)}
                            className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600"
                          >
                            Okundu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
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