import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  markAllNotificationsReadAction,
  markNotificationAndMessageAsReadFormAction,
} from "@/app/actions/notifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  target_url: string | null;
  is_read: boolean;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getNotificationMeta(type: string) {
  if (type === "message" || type === "new_message") {
    return {
      icon: "💬",
      label: "Mesaj",
      badgeClass: "bg-blue-50 text-blue-700",
      softClass: "bg-blue-50/70",
    };
  }

  if (type === "book_found") {
    return {
      icon: "📚",
      label: "Kitap",
      badgeClass: "bg-[#2E7D5B]/10 text-[#2E7D5B]",
      softClass: "bg-[#2E7D5B]/5",
    };
  }

  if (type === "new_match") {
    return {
      icon: "🤝",
      label: "Eşleşme",
      badgeClass: "bg-[#F59E0B]/10 text-[#B45309]",
      softClass: "bg-[#F59E0B]/5",
    };
  }

  if (type === "social_like") {
    return {
      icon: "❤️",
      label: "Beğeni",
      badgeClass: "bg-red-50 text-red-600",
      softClass: "bg-red-50/70",
    };
  }

  if (type === "social_comment") {
    return {
      icon: "💬",
      label: "Yorum",
      badgeClass: "bg-[#2E7D5B]/10 text-[#2E7D5B]",
      softClass: "bg-[#2E7D5B]/5",
    };
  }

  if (
    type === "exchange_requested" ||
    type === "exchange_meeting_planned" ||
    type === "exchange_handed_over" ||
    type === "exchange_completed" ||
    type === "exchange_canceled"
  ) {
    return {
      icon: getExchangeIcon(type),
      label: "Takas",
      badgeClass:
        type === "exchange_canceled"
          ? "bg-red-50 text-red-600"
          : "bg-purple-50 text-purple-700",
      softClass:
        type === "exchange_canceled" ? "bg-red-50/70" : "bg-purple-50/70",
    };
  }

  if (type === "limit_warning") {
    return {
      icon: "⚠️",
      label: "Limit",
      badgeClass: "bg-red-50 text-red-600",
      softClass: "bg-red-50/70",
    };
  }

  return {
    icon: "🔔",
    label: "Sistem",
    badgeClass: "bg-slate-100 text-slate-600",
    softClass: "bg-slate-50",
  };
}

function getExchangeIcon(type: string) {
  if (type === "exchange_requested") return "🔄";
  if (type === "exchange_meeting_planned") return "📍";
  if (type === "exchange_handed_over") return "📦";
  if (type === "exchange_completed") return "✅";
  if (type === "exchange_canceled") return "❌";
  return "🤝";
}

function getActionLabel(item: Notification) {
  if (item.type === "social_like" || item.type === "social_comment") {
    return "Gönderiye Git";
  }

  if (item.target_url) {
    if (item.type === "message" || item.type === "new_message") {
      return "Mesaja Git";
    }

    return "Detaya Git";
  }

  if (item.link_url) return "Detaya Git";

  return "Detay Yok";
}

function getActionUrl(item: Notification) {
  return item.target_url || item.link_url || "";
}

function getNotificationGroup(type: string) {
  if (type === "message" || type === "new_message") return "message";
  if (type === "social_like" || type === "social_comment") return "social";
  if (type === "new_match" || type === "book_found") return "match";

  if (
    type === "exchange_requested" ||
    type === "exchange_meeting_planned" ||
    type === "exchange_handed_over" ||
    type === "exchange_completed" ||
    type === "exchange_canceled"
  ) {
    return "exchange";
  }

  return "system";
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, message, link_url, target_url, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (notifications || []) as Notification[];

  const unreadCount = items.filter((item) => !item.is_read).length;
  const readCount = items.length - unreadCount;

  const messageCount = items.filter(
    (item) => getNotificationGroup(item.type) === "message"
  ).length;

  const matchCount = items.filter(
    (item) => getNotificationGroup(item.type) === "match"
  ).length;

  const exchangeCount = items.filter(
    (item) => getNotificationGroup(item.type) === "exchange"
  ).length;

  const socialCount = items.filter(
    (item) => getNotificationGroup(item.type) === "social"
  ).length;

  const systemCount = items.filter(
    (item) => getNotificationGroup(item.type) === "system"
  ).length;

  const unreadItems = items.filter((item) => !item.is_read);
  const readItems = items.filter((item) => item.is_read);
  const orderedItems = [...unreadItems, ...readItems];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🔔
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Bildirim merkezi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/akis" className="hover:text-[#2E7D5B]">
              Akış
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
            <Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
              Eşleşmeler
            </Link>
            <Link href="/takaslar" className="hover:text-[#2E7D5B]">
              Takaslar
            </Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </nav>

          <Link
            href="/mesajlar"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Mesajlar
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Bildirim Merkezi
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Mesaj, sosyal etkileşim, eşleşme ve takas bildirimlerini takip et.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Yeni mesajları, alıntı/gönderi beğeni ve yorumlarını, akıllı
                  eşleşmeleri, kitap bulunma bildirimlerini, takas süreçlerini
                  ve sistem uyarılarını tek merkezden yönetebilirsin.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {items.length}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Toplam
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {unreadCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Okunmamış
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {messageCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Mesaj
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {exchangeCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Takas
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
              >
                Panele Dön
              </Link>

              {unreadCount > 0 && (
                <form action={markAllNotificationsReadAction}>
                  <button
                    type="submit"
                    className="w-full rounded-full border border-white/25 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
                  >
                    Tümünü Okundu Yap
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-6 md:gap-5">
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Okunmamış</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B]">
              {unreadCount}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Okunmuş</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">
              {readCount}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Mesaj</p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {messageCount}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Eşleşme</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B]">
              {matchCount}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Sosyal</p>
            <p className="mt-2 text-3xl font-black text-red-600">
              {socialCount}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Takas</p>
            <p className="mt-2 text-3xl font-black text-purple-600">
              {exchangeCount}
            </p>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="mt-6 rounded-[1.8rem] border border-dashed border-[#2E7D5B]/30 bg-white p-8 text-center shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem] md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              🔕
            </div>

            <h2 className="mt-5 text-2xl font-black">Henüz bildirim yok</h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Yeni mesaj, sosyal etkileşim, eşleşme, kitap bulunma veya takas
              bildirimi oluştuğunda burada görünecek.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/kitap-ara"
                className="rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                Kitap Ara
              </Link>

              <Link
                href="/akis"
                className="rounded-full border border-[#2E7D5B]/20 px-7 py-4 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
              >
                Akışa Git
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-3 md:space-y-4">
              {orderedItems.map((item) => {
                const meta = getNotificationMeta(item.type);
                const actionUrl = getActionUrl(item);
                const actionLabel = getActionLabel(item);

                return (
                  <article
                    key={item.id}
                    className={`overflow-hidden rounded-[1.5rem] border shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[1.8rem] ${
                      item.is_read
                        ? "border-slate-100 bg-white"
                        : "border-[#2E7D5B]/20 bg-[#2E7D5B]/5"
                    }`}
                  >
                    <div className="p-4 md:p-5">
                      <div className="flex gap-3 md:gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm ${meta.softClass}`}
                        >
                          {meta.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-black ${meta.badgeClass}`}
                                >
                                  {meta.label}
                                </span>

                                {!item.is_read && (
                                  <span className="rounded-full bg-[#2E7D5B] px-3 py-1 text-[11px] font-black text-white">
                                    Yeni
                                  </span>
                                )}
                              </div>

                              <h2 className="mt-3 break-words text-base font-black leading-tight text-[#1F2933] md:text-lg">
                                {item.title}
                              </h2>

                              <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                                {item.message}
                              </p>

                              {(item.type === "social_like" ||
                                item.type === "social_comment") && (
                                <div className="mt-3 inline-flex rounded-full bg-[#F59E0B]/10 px-3 py-1 text-[11px] font-black text-[#B45309]">
                                  🎲 Sosyal akış etkileşimi
                                </div>
                              )}

                              <p className="mt-3 text-xs font-bold text-slate-400">
                                {formatDate(item.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 sm:flex sm:flex-row sm:flex-wrap">
                            {actionUrl ? (
                              <Link
                                href={actionUrl}
                                className="w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c] sm:w-auto"
                              >
                                {actionLabel}
                              </Link>
                            ) : (
                              <span className="w-full rounded-full bg-slate-100 px-5 py-3 text-center text-xs font-black text-slate-400 sm:w-auto">
                                Detay Yok
                              </span>
                            )}

                            {!item.is_read && (
                              <form
                                action={markNotificationAndMessageAsReadFormAction}
                                className="w-full sm:w-auto"
                              >
                                <input
                                  type="hidden"
                                  name="notificationId"
                                  value={item.id}
                                />

                                <input
                                  type="hidden"
                                  name="targetUrl"
                                  value={actionUrl}
                                />

                                <button
                                  type="submit"
                                  className="w-full rounded-full border border-[#2E7D5B]/15 bg-white px-5 py-3 text-xs font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5 sm:w-auto"
                                >
                                  Okundu Yap
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                  Bildirim Özeti
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Okunmamış
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#F59E0B]">
                      {unreadCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Mesaj Bildirimi
                    </p>
                    <p className="mt-2 text-2xl font-black text-blue-600">
                      {messageCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Sosyal Bildirim
                    </p>
                    <p className="mt-2 text-2xl font-black text-red-600">
                      {socialCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Takas Bildirimi
                    </p>
                    <p className="mt-2 text-2xl font-black text-purple-600">
                      {exchangeCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Sistem Bildirimi
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-600">
                      {systemCount}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem] md:p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                  Hızlı Erişim
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Bildirimlerden aksiyona geç.
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/70">
                  Mesajları, sosyal gönderi etkileşimlerini, eşleşmeleri ve
                  takas süreçlerini ilgili sayfadan hızlıca kontrol edebilirsin.
                </p>

                <div className="mt-5 grid gap-3">
                  <Link
                    href="/akis"
                    className="rounded-full bg-white px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                  >
                    Akışa Git
                  </Link>

                  <Link
                    href="/rastgele-raf"
                    className="rounded-full border border-white/25 px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Rastgele Raf
                  </Link>

                  <Link
                    href="/mesajlar"
                    className="rounded-full bg-white px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                  >
                    Mesajlara Git
                  </Link>

                  <Link
                    href="/eslesmeler"
                    className="rounded-full border border-white/25 px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Eşleşmeleri Gör
                  </Link>

                  <Link
                    href="/takaslar"
                    className="rounded-full border border-white/25 px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Takasları Aç
                  </Link>
                </div>
              </section>

              <section className="rounded-[1.8rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  Bildirim Notu
                </p>

                <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600">
                  <p className="rounded-2xl bg-[#FAF7F0] p-3">
                    ✓ Mesaj bildirimlerinde okundu durumu sohbetle senkron çalışır.
                  </p>
                  <p className="rounded-2xl bg-[#FAF7F0] p-3">
                    ✓ Beğeni ve yorum bildirimlerinden doğrudan gönderiye gidebilirsin.
                  </p>
                  <p className="rounded-2xl bg-[#FAF7F0] p-3">
                    ✓ Yeni eşleşmeler ve takas hareketleri burada listelenir.
                  </p>
                  <p className="rounded-2xl bg-[#FAF7F0] p-3">
                    ✓ Okunmamış bildirimler listede her zaman öne alınır.
                  </p>
                </div>
              </section>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}