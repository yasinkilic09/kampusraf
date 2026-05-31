import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateExchangeStatusAction } from "@/app/actions/exchanges";

type ProfileSummary = {
  id: string;
  full_name: string | null;
  username: string | null;
  university: string | null;
  city: string | null;
};

type ExchangeItem = {
  id: string;
  conversation_id: string;
  user_book_id: string;
  requester_id: string;
  owner_id: string;
  requested_by: string;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  canceled_at: string | null;
  user_books:
    | {
        custom_title: string | null;
        custom_author: string | null;
        image_url: string | null;
        books:
          | {
              title: string;
              author: string | null;
              cover_url: string | null;
            }
          | {
              title: string;
              author: string | null;
              cover_url: string | null;
            }[]
          | null;
      }
    | {
        custom_title: string | null;
        custom_author: string | null;
        image_url: string | null;
        books:
          | {
              title: string;
              author: string | null;
              cover_url: string | null;
            }
          | {
              title: string;
              author: string | null;
              cover_url: string | null;
            }[]
          | null;
      }[]
    | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmemiş";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getExchangeStatusLabel(status: string) {
  if (status === "requested") return "Takas Başlatıldı";
  if (status === "meeting_planned") return "Görüşme Planlandı";
  if (status === "handed_over") return "Kitap Teslim Edildi";
  if (status === "completed") return "Takas Tamamlandı";
  if (status === "canceled") return "Takas İptal Edildi";
  return "Takas Süreci";
}

function getExchangeStatusDescription(status: string) {
  if (status === "requested") {
    return "Takas süreci başlatıldı. Teslim veya buluşma detayı netleştirilebilir.";
  }

  if (status === "meeting_planned") {
    return "Görüşme planlandı. Kitap teslim edildiğinde bir sonraki adıma geçebilirsin.";
  }

  if (status === "handed_over") {
    return "Kitap teslim edildi olarak işaretlendi. Süreç uygunsa takası tamamlayabilirsin.";
  }

  if (status === "completed") {
    return "Bu takas başarıyla tamamlandı ve güven profiline işlendi.";
  }

  if (status === "canceled") {
    return "Bu takas süreci iptal edildi.";
  }

  return "Takas sürecini buradan takip edebilirsin.";
}

function getExchangeStatusClass(status: string) {
  if (status === "completed") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "canceled") return "bg-red-50 text-red-600";
  if (status === "handed_over") return "bg-blue-50 text-blue-600";
  if (status === "meeting_planned") return "bg-[#F59E0B]/10 text-[#F59E0B]";
  return "bg-slate-100 text-slate-600";
}

function ExchangeActionButton({
  exchangeId,
  conversationId,
  status,
  children,
  danger = false,
}: {
  exchangeId: string;
  conversationId: string;
  status: string;
  children: string;
  danger?: boolean;
}) {
  return (
    <form action={updateExchangeStatusAction}>
      <input type="hidden" name="exchangeId" value={exchangeId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="status" value={status} />

      <button
        type="submit"
        className={`w-full rounded-full px-5 py-3 text-xs font-black transition hover:-translate-y-0.5 sm:w-auto ${
          danger
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-[#2E7D5B] text-white"
        }`}
      >
        {children}
      </button>
    </form>
  );
}

function getBookInfo(exchange: ExchangeItem) {
  const userBook = first(exchange.user_books);
  const book = first(userBook?.books);

  return {
    title: userBook?.custom_title || book?.title || "Kitap bilgisi yok",
    author: userBook?.custom_author || book?.author || "",
    image: userBook?.image_url || book?.cover_url || null,
  };
}

function getOtherProfile(
  exchange: ExchangeItem,
  currentUserId: string,
  profiles: Map<string, ProfileSummary>
) {
  const otherUserId =
    exchange.owner_id === currentUserId
      ? exchange.requester_id
      : exchange.owner_id;

  const profile = profiles.get(otherUserId);

  return {
    id: otherUserId,
    name: profile?.full_name || profile?.username || "KampüsRaf kullanıcısı",
    username: profile?.username || "",
    university: profile?.university || "Üniversite bilgisi yok",
    city: profile?.city || "Şehir bilgisi yok",
  };
}

export default async function ExchangesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("exchanges")
    .select(
      `
      id,
      conversation_id,
      user_book_id,
      requester_id,
      owner_id,
      requested_by,
      status,
      note,
      created_at,
      updated_at,
      completed_at,
      canceled_at,
      user_books (
        custom_title,
        custom_author,
        image_url,
        books (
          title,
          author,
          cover_url
        )
      )
    `
    )
    .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  const exchanges = (data || []) as ExchangeItem[];

  const profileIds = Array.from(
    new Set(exchanges.flatMap((item) => [item.requester_id, item.owner_id]))
  );

  const { data: profileData } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, university, city")
          .in("id", profileIds)
      : { data: [] };

  const profileMap = new Map(
    ((profileData || []) as ProfileSummary[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const activeExchanges = exchanges.filter((item) =>
    ["requested", "meeting_planned", "handed_over"].includes(item.status)
  );

  const completedExchanges = exchanges.filter(
    (item) => item.status === "completed"
  );

  const canceledExchanges = exchanges.filter(
    (item) => item.status === "canceled"
  );

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🤝
            </div>
            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Takaslarım
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
            <Link href="/takaslar" className="hover:text-[#2E7D5B]">
  Takaslar
</Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Takas Yönetimi
          </p>

          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
            Takaslarım
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
            Devam eden, tamamlanan ve iptal edilen kitap takaslarını tek ekrandan
            takip edebilirsin.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
            Takaslar yüklenirken hata oluştu: {error.message}
          </div>
        )}

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Devam Eden</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">
              {activeExchanges.length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Tamamlanan</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B]">
              {completedExchanges.length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">İptal Edilen</p>
            <p className="mt-2 text-3xl font-black text-red-500">
              {canceledExchanges.length}
            </p>
          </div>
        </div>

        {exchanges.length === 0 ? (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-[#2E7D5B]/30 bg-white p-8 text-center shadow-sm md:mt-8 md:rounded-[2rem] md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              🤝
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Henüz takas sürecin yok
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Bir sohbet detayından “Takas Sürecini Başlat” dediğinde aktif
              takasların burada görünecek.
            </p>

            <Link
              href="/mesajlar"
              className="mt-6 inline-flex rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              Mesajlara Git
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:mt-8">
            {exchanges.map((exchange) => {
              const book = getBookInfo(exchange);
              const otherUser = getOtherProfile(exchange, user.id, profileMap);
              const isActive = [
                "requested",
                "meeting_planned",
                "handed_over",
              ].includes(exchange.status);

              return (
                <article
                  key={exchange.id}
                  className="rounded-[1.7rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-2xl md:h-24 md:w-20">
                        {book.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.image}
                            alt={book.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "📚"
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${getExchangeStatusClass(
                              exchange.status
                            )}`}
                          >
                            {getExchangeStatusLabel(exchange.status)}
                          </span>

                          {exchange.owner_id === user.id ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                              Kitap sahibi sensin
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                              Kitabı isteyen sensin
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 break-words text-xl font-black md:text-2xl">
                          {book.title}
                        </h2>

                        {book.author && (
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {book.author}
                          </p>
                        )}

                        <p className="mt-3 text-sm font-bold text-slate-600">
                          Karşı kullanıcı: {otherUser.name}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {otherUser.university} · {otherUser.city}
                        </p>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                          {getExchangeStatusDescription(exchange.status)}
                        </p>

                        <p className="mt-3 text-xs font-bold text-slate-400">
                          Son güncelleme: {formatDate(exchange.updated_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 lg:min-w-52">
                      <Link
                        href={`/mesajlar/${exchange.conversation_id}`}
                        className="rounded-full bg-[#1F2933] px-5 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5"
                      >
                        Sohbete Git
                      </Link>

                      {isActive && (
                        <>
                          {exchange.status === "requested" && (
                            <ExchangeActionButton
                              exchangeId={exchange.id}
                              conversationId={exchange.conversation_id}
                              status="meeting_planned"
                            >
                              Görüşme Planlandı
                            </ExchangeActionButton>
                          )}

                          {exchange.status === "meeting_planned" && (
                            <ExchangeActionButton
                              exchangeId={exchange.id}
                              conversationId={exchange.conversation_id}
                              status="handed_over"
                            >
                              Kitap Teslim Edildi
                            </ExchangeActionButton>
                          )}

                          {exchange.status === "handed_over" && (
                            <ExchangeActionButton
                              exchangeId={exchange.id}
                              conversationId={exchange.conversation_id}
                              status="completed"
                            >
                              Takası Tamamla
                            </ExchangeActionButton>
                          )}

                          <ExchangeActionButton
                            exchangeId={exchange.id}
                            conversationId={exchange.conversation_id}
                            status="canceled"
                            danger
                          >
                            Takası İptal Et
                          </ExchangeActionButton>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}