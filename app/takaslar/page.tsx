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

function getExchangeStatusShortLabel(status: string) {
  if (status === "requested") return "Talep";
  if (status === "meeting_planned") return "Görüşme";
  if (status === "handed_over") return "Teslim";
  if (status === "completed") return "Tamam";
  if (status === "canceled") return "İptal";
  return "Süreç";
}

function getExchangeStatusDescription(status: string) {
  if (status === "requested") {
    return "Takas süreci başlatıldı. Teslim veya buluşma detayı mesaj üzerinden netleştirilebilir.";
  }

  if (status === "meeting_planned") {
    return "Görüşme planlandı. Kitap teslim edildiğinde süreci bir sonraki adıma taşıyabilirsin.";
  }

  if (status === "handed_over") {
    return "Kitap teslim edildi olarak işaretlendi. Her şey uygunsa takası tamamlayabilirsin.";
  }

  if (status === "completed") {
    return "Bu takas başarıyla tamamlandı ve güven profiline işlendi.";
  }

  if (status === "canceled") {
    return "Bu takas süreci iptal edildi. Gerekirse kullanıcıyla mesajlaşmaya devam edebilirsin.";
  }

  return "Takas sürecini buradan takip edebilirsin.";
}

function getExchangeStatusClass(status: string) {
  if (status === "completed") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "canceled") return "bg-red-50 text-red-600";
  if (status === "handed_over") return "bg-purple-50 text-purple-700";
  if (status === "meeting_planned") return "bg-blue-50 text-blue-700";
  if (status === "requested") return "bg-[#F59E0B]/10 text-[#B45309]";
  return "bg-slate-100 text-slate-600";
}

function getProgressPercent(status: string) {
  if (status === "requested") return 25;
  if (status === "meeting_planned") return 50;
  if (status === "handed_over") return 75;
  if (status === "completed") return 100;
  if (status === "canceled") return 100;
  return 10;
}

function getProgressBarClass(status: string) {
  if (status === "completed") return "bg-[#2E7D5B]";
  if (status === "canceled") return "bg-red-500";
  if (status === "handed_over") return "bg-purple-500";
  if (status === "meeting_planned") return "bg-blue-500";
  return "bg-[#F59E0B]";
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
    <form action={updateExchangeStatusAction} className="w-full">
      <input type="hidden" name="exchangeId" value={exchangeId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="status" value={status} />

      <button
        type="submit"
        className={`w-full rounded-full px-5 py-3 text-xs font-black transition hover:-translate-y-0.5 ${
          danger
            ? "border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-[#2E7D5B] text-white hover:bg-[#25684c]"
        }`}
      >
        {children}
      </button>
    </form>
  );
}

function ExchangeProcessSteps({ status }: { status: string }) {
  const steps = [
    { key: "requested", label: "Talep" },
    { key: "meeting_planned", label: "Görüşme" },
    { key: "handed_over", label: "Teslim" },
    { key: "completed", label: "Tamam" },
  ];

  const activeIndex = steps.findIndex((step) => step.key === status);
  const isCanceled = status === "canceled";

  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${getProgressBarClass(status)}`}
          style={{ width: `${getProgressPercent(status)}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const isActive = !isCanceled && index <= activeIndex;
          const isCurrent = step.key === status;

          return (
            <div key={step.key} className="text-center">
              <div
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${
                  isActive
                    ? "bg-[#2E7D5B] text-white"
                    : isCanceled
                    ? "bg-red-50 text-red-400"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {index + 1}
              </div>

              <p
                className={`mt-1 text-[10px] font-black ${
                  isCurrent ? "text-[#2E7D5B]" : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
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
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🤝
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Takas merkezi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
            <Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
              Eşleşmeler
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
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
                  Takas Merkezi
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Kitap teslim süreçlerini güvenle yönet.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Devam eden, tamamlanan ve iptal edilen takaslarını tek
                  merkezden takip et. Her takas; talep, görüşme, teslim ve
                  tamamlama adımlarıyla ilerler.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[360px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {activeExchanges.length}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Aktif
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {completedExchanges.length}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Tamam
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {canceledExchanges.length}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    İptal
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 md:p-5">
            Takaslar yüklenirken hata oluştu: {error.message}
          </div>
        )}

        <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-4 md:gap-5">
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Toplam Takas</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">
              {exchanges.length}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Devam Eden</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B]">
              {activeExchanges.length}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Tamamlanan</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">
              {completedExchanges.length}
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">İptal Edilen</p>
            <p className="mt-2 text-3xl font-black text-red-500">
              {canceledExchanges.length}
            </p>
          </div>
        </section>

        {exchanges.length === 0 ? (
          <section className="mt-6 rounded-[1.8rem] border border-dashed border-[#2E7D5B]/30 bg-white p-8 text-center shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem] md:p-12">
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

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/mesajlar"
                className="rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                Mesajlara Git
              </Link>

              <Link
                href="/kitap-ara"
                className="rounded-full border border-[#2E7D5B]/20 px-7 py-4 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
              >
                Kitap Ara
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
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
                    className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]"
                  >
                    <div className="p-4 md:p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-2xl md:h-28 md:w-20">
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

                          <div className="min-w-0 flex-1">
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

                            <h2 className="mt-3 break-words text-xl font-black leading-tight md:text-2xl">
                              {book.title}
                            </h2>

                            {book.author && (
                              <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
                                {book.author}
                              </p>
                            )}

                            <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-3 md:p-4">
                              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Karşı Kullanıcı
                              </p>

                              <p className="mt-2 text-sm font-black text-[#2E7D5B]">
                                {otherUser.name}
                              </p>

                              {otherUser.username && (
                                <p className="mt-1 text-xs font-bold text-slate-500">
                                  @{otherUser.username}
                                </p>
                              )}

                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {otherUser.university} · {otherUser.city}
                              </p>
                            </div>

                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                              {getExchangeStatusDescription(exchange.status)}
                            </p>

                            {exchange.note && (
                              <p className="mt-3 rounded-2xl bg-[#FAF7F0] p-3 text-sm leading-6 text-slate-600">
                                {exchange.note}
                              </p>
                            )}

                            <ExchangeProcessSteps status={exchange.status} />

                            <p className="mt-4 text-xs font-bold text-slate-400">
                              Son güncelleme: {formatDate(exchange.updated_at)}
                            </p>
                          </div>
                        </div>

                        <div className="grid w-full shrink-0 gap-2 lg:w-56">
                          <Link
                            href={`/mesajlar/kullanici/${otherUser.id}`}
                            className="rounded-full bg-[#1F2933] px-5 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-black"
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

                          {!isActive && (
                            <div
                              className={`rounded-2xl px-4 py-3 text-center text-xs font-black ${getExchangeStatusClass(
                                exchange.status
                              )}`}
                            >
                              {getExchangeStatusShortLabel(exchange.status)}
                            </div>
                          )}
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
                  Süreç Özeti
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Aktif Takas
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#F59E0B]">
                      {activeExchanges.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Tamamlanan
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                      {completedExchanges.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      İptal Edilen
                    </p>
                    <p className="mt-2 text-2xl font-black text-red-500">
                      {canceledExchanges.length}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem] md:p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                  Güvenli Teslim
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Takası adım adım ilerlet.
                </h3>

                <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-white/75">
                  <p className="rounded-2xl bg-white/10 p-3">
                    ✓ Buluşmayı mesaj üzerinden netleştir.
                  </p>
                  <p className="rounded-2xl bg-white/10 p-3">
                    ✓ Kampüs, kütüphane veya kalabalık alanları tercih et.
                  </p>
                  <p className="rounded-2xl bg-white/10 p-3">
                    ✓ Kitap teslim edilmeden süreci tamamlandı yapma.
                  </p>
                </div>
              </section>

              <section className="rounded-[1.8rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  Takas Adımları
                </p>

                <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600">
                  <p className="rounded-2xl bg-[#FAF7F0] p-3">
                    1. Takas talebi başlatılır.
                  </p>
                  <p className="rounded-2xl bg-[#FAF7F0] p-3">
                    2. Görüşme veya teslim planlanır.
                  </p>
                  <p className="rounded-2xl bg-[#FAF7F0] p-3">
                    3. Kitap teslim edildi olarak işaretlenir.
                  </p>
                  <p className="rounded-2xl bg-[#FAF7F0] p-3">
                    4. Süreç tamamlanır ve güven profiline yansır.
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