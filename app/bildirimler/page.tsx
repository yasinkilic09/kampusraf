import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getNotificationIcon(type: string) {
  if (type === "new_message") return "💬";
  if (type === "book_found") return "📚";
  if (type === "new_match") return "🤝";
  if (type === "limit_warning") return "⚠️";
  return "🔔";
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
    .select("id, type, title, message, link_url, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (notifications || []) as Notification[];
  const unreadCount = items.filter((item) => !item.is_read).length;

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 py-5 text-[#1F2933] md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
                Bildirim Merkezi
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                Bildirimler
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                Yeni mesajları, kitap eşleşmelerini ve sistem uyarılarını buradan
                takip edebilirsin.
              </p>
            </div>

            <div className="rounded-3xl bg-white/10 p-4 text-center">
              <p className="text-3xl font-black">{unreadCount}</p>
              <p className="text-xs font-bold text-white/70">okunmamış</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
        </header>

        <section className="mt-5 grid gap-3 md:mt-7">
          {items.length === 0 ? (
            <div className="rounded-[1.7rem] bg-white p-8 text-center shadow-sm md:rounded-[2rem]">
              <p className="text-4xl">🔕</p>
              <h2 className="mt-3 text-xl font-black">Henüz bildirim yok</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Yeni mesaj veya eşleşme oluştuğunda burada görünecek.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className={`rounded-[1.4rem] border p-4 shadow-sm md:rounded-[1.7rem] md:p-5 ${
                  item.is_read
                    ? "border-slate-100 bg-white"
                    : "border-[#2E7D5B]/20 bg-[#2E7D5B]/5"
                }`}
              >
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="break-words text-base font-black text-[#1F2933]">
                          {item.title}
                        </h2>

                        <p className="mt-1 break-words text-sm leading-6 text-slate-500">
                          {item.message}
                        </p>

                        <p className="mt-2 text-xs font-bold text-slate-400">
                          {formatDate(item.created_at)}
                        </p>
                      </div>

                      {!item.is_read && (
                        <span className="w-fit rounded-full bg-[#2E7D5B] px-3 py-1 text-[11px] font-black text-white">
                          Yeni
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      {item.link_url && (
                        <Link
                          href={item.link_url}
                          className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-center text-xs font-black text-white transition hover:-translate-y-0.5"
                        >
                          Detaya Git
                        </Link>
                      )}

                      {!item.is_read && (
                        <form action={markNotificationReadAction}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={item.id}
                          />

                          <button
                            type="submit"
                            className="w-full rounded-full bg-slate-100 px-5 py-2.5 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 sm:w-auto"
                          >
                            Okundu Yap
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}