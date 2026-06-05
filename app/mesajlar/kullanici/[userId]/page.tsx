import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UserChatRoom } from "@/components/user-chat-room";
import { createClient } from "@/lib/supabase/server";
import { submitUserReportAction } from "@/app/actions/user-reports";
import { UserExchangePanel } from "@/components/user-exchange-panel";

type UserChatPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

type ProfileSummary = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  university: string | null;
  city: string | null;
};

type ConversationRow = {
  id: string;
  user_one_id: string;
  user_two_id: string;
  user_book_id: string | null;
  last_message_at: string | null;
  created_at: string;
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

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_read: boolean | null;
  created_at: string;
};

type ExchangeRow = {
  id: string;
  conversation_id: string;
  status: string;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getBook(conversation: ConversationRow) {
  const userBook = first(conversation.user_books);
  const relatedBook = first(userBook?.books || null);

  return {
    title: userBook?.custom_title || relatedBook?.title || "Kitap bilgisi yok",
    author: userBook?.custom_author || relatedBook?.author || "",
    image: userBook?.image_url || relatedBook?.cover_url || null,
  };
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "K";
}

function formatDate(value?: string | null) {
  if (!value) return "Henüz mesaj yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getExchangeStatusLabel(status?: string | null) {
  if (!status) return "Başlatılmadı";
  if (status === "requested") return "Takas Talebi";
  if (status === "meeting_planned") return "Görüşme Planlandı";
  if (status === "handed_over") return "Teslim Edildi";
  if (status === "completed") return "Tamamlandı";
  if (status === "canceled") return "İptal Edildi";
  return status;
}

function getExchangeStatusClass(status?: string | null) {
  if (status === "requested") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "meeting_planned") return "bg-blue-50 text-blue-700";
  if (status === "handed_over") return "bg-purple-50 text-purple-700";
  if (status === "completed") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "canceled") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-500";
}

export default async function UserMessagesPage({ params }: UserChatPageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.id === userId) {
    redirect("/mesajlar");
  }

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_url, university, city")
    .eq("id", userId)
    .single<ProfileSummary>();

  if (!otherProfile) {
    notFound();
  }

  const { data: conversationsData } = await supabase
    .from("conversations")
    .select(
      `
      id,
      user_one_id,
      user_two_id,
      user_book_id,
      last_message_at,
      created_at,
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
    .or(
      `and(user_one_id.eq.${user.id},user_two_id.eq.${userId}),and(user_one_id.eq.${userId},user_two_id.eq.${user.id})`
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const conversations = (conversationsData || []) as ConversationRow[];

  if (conversations.length === 0) {
    notFound();
  }

  const conversationIds = conversations.map((conversation) => conversation.id);

  const { data: exchangesData } = await supabase
    .from("exchanges")
    .select("id, conversation_id, status")
    .in("conversation_id", conversationIds);

  const exchanges = (exchangesData || []) as ExchangeRow[];

  const exchangeByConversationId = new Map(
    exchanges.map((exchange) => [exchange.conversation_id, exchange])
  );

  const { data: messagesData } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, receiver_id, message, is_read, created_at"
    )
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  const messages = (messagesData || []) as MessageRow[];

  const conversationLabels: Record<string, string> = {};

  const sendTargets = conversations.map((conversation) => {
    const book = getBook(conversation);

    conversationLabels[conversation.id] = book.title;

    return {
      conversationId: conversation.id,
      title: book.title,
      author: book.author || null,
    };
  });

  const latestConversation = conversations[0];

  const otherUserName =
    otherProfile.full_name ||
    otherProfile.username ||
    "KampüsRaf kullanıcısı";

  const otherUserSubtitle = [
    otherProfile.university || "Üniversite bilgisi yok",
    otherProfile.city || "Şehir bilgisi yok",
  ]
    .filter(Boolean)
    .join(" · ");

  const unreadMessages = messages.filter(
    (message) => message.receiver_id === user.id && !message.is_read
  );

  const lastMessage = messages[messages.length - 1] || null;

  const exchangeTargets = sendTargets.map((target) => {
    const exchange = exchangeByConversationId.get(target.conversationId);

    return {
      conversationId: target.conversationId,
      title: target.title,
      author: target.author,
      exchangeId: exchange?.id || null,
      status: exchange?.status || null,
    };
  });

  const activeExchangeCount = exchangeTargets.filter(
    (target) =>
      target.status &&
      target.status !== "completed" &&
      target.status !== "canceled"
  ).length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/90 px-3 py-3 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/mesajlar" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-lg text-white md:h-11 md:w-11">
              ←
            </div>

            <div className="min-w-0">
              <p className="truncate text-lg font-black md:text-xl">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="truncate text-xs font-semibold text-slate-500">
                Kişi sohbet odası
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
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
              Eşleşmeler
            </Link>
            <Link href="/takaslar" className="hover:text-[#2E7D5B]">
              Takaslar
            </Link>
          </nav>

          <Link
            href="/mesajlar"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-4 py-2 text-xs font-black text-white transition hover:bg-[#25684c] md:px-5 md:py-2.5 md:text-sm"
          >
            Mesajlar
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-3 py-4 md:px-6 md:py-10">
        <section className="md:hidden">
          <div className="rounded-[1.4rem] bg-[#2E7D5B] p-4 text-white shadow-lg shadow-[#2E7D5B]/15">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-xl font-black text-[#2E7D5B]">
                {otherProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={otherProfile.avatar_url}
                    alt={otherUserName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitial(otherUserName)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-black">{otherUserName}</p>

                {otherProfile.username && (
                  <Link
                    href={`/profil/${otherProfile.username}`}
                    className="mt-0.5 block truncate text-xs font-bold text-white/75"
                  >
                    @{otherProfile.username}
                  </Link>
                )}

                <p className="mt-1 truncate text-xs font-semibold text-white/60">
                  {otherUserSubtitle}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="rounded-2xl bg-white/10 p-2 text-center">
                <p className="text-base font-black">{conversations.length}</p>
                <p className="mt-0.5 text-[10px] font-bold text-white/60">
                  Sohbet
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-2 text-center">
                <p className="text-base font-black">{messages.length}</p>
                <p className="mt-0.5 text-[10px] font-bold text-white/60">
                  Mesaj
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-2 text-center">
                <p className="text-base font-black">{unreadMessages.length}</p>
                <p className="mt-0.5 text-[10px] font-bold text-white/60">
                  Yeni
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-2 text-center">
                <p className="text-base font-black">{activeExchangeCount}</p>
                <p className="mt-0.5 text-[10px] font-bold text-white/60">
                  Takas
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="hidden overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:block md:rounded-[2.2rem]">
          <div className="relative p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.7rem] bg-white text-2xl font-black text-[#2E7D5B] shadow-sm">
                  {otherProfile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={otherProfile.avatar_url}
                      alt={otherUserName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitial(otherUserName)
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                    Birleşik Sohbet
                  </p>

                  <h1 className="mt-2 break-words text-5xl font-black tracking-tight">
                    {otherUserName}
                  </h1>

                  {otherProfile.username && (
                    <Link
                      href={`/profil/${otherProfile.username}`}
                      className="mt-2 inline-flex text-sm font-black text-white/80 underline-offset-4 hover:underline"
                    >
                      @{otherProfile.username}
                    </Link>
                  )}

                  <p className="mt-3 max-w-2xl text-base leading-7 text-white/75">
                    {otherUserSubtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{conversations.length}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Kitap Sohbeti
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{messages.length}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Mesaj
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{unreadMessages.length}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Okunmamış
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{activeExchangeCount}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Aktif Takas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid min-w-0 gap-4 md:mt-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
          <section className="min-w-0 rounded-[1.3rem] bg-white p-2 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-5">
            <div className="mb-3 flex flex-col justify-between gap-2 border-b border-slate-100 px-2 pb-3 md:mb-4 md:flex-row md:items-center md:px-0 md:pb-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B] md:text-sm">
                  Canlı Sohbet
                </p>

                <h2 className="mt-1 text-xl font-black md:mt-2 md:text-2xl">
                  Mesaj akışı
                </h2>

                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 md:text-sm">
                  {conversations.length} kitap konuşması tek ekranda.
                </p>
              </div>

              <div className="w-fit rounded-full bg-[#2E7D5B]/10 px-3 py-1.5 text-[11px] font-black text-[#2E7D5B] md:px-4 md:py-2 md:text-xs">
                Son:{" "}
                {formatDate(lastMessage?.created_at || latestConversation.created_at)}
              </div>
            </div>

            <UserChatRoom
              initialMessages={messages}
              conversationIds={conversationIds}
              currentUserId={user.id}
              otherUserId={userId}
              otherUserName={otherUserName}
              otherUserSubtitle={otherUserSubtitle}
              conversationLabels={conversationLabels}
              sendTargets={sendTargets}
              initialSendConversationId={latestConversation.id}
            />
          </section>

          <aside className="hidden space-y-6 lg:block lg:sticky lg:top-28 lg:self-start">
            <section className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
              <div className="bg-[#8B5E3C] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/85">
                Kitap Konuşmaları
              </div>

              <div className="p-5">
                <p className="text-sm font-semibold leading-6 text-slate-500">
                  Aynı kişiyle farklı kitaplar üzerinden açılan sohbetler bu
                  odada birleşir.
                </p>

                <div className="mt-4 grid gap-3">
                  {sendTargets.map((target) => {
                    const exchange = exchangeByConversationId.get(
                      target.conversationId
                    );

                    const conversation = conversations.find(
                      (item) => item.id === target.conversationId
                    );

                    const book = conversation ? getBook(conversation) : null;

                    return (
                      <div
                        key={target.conversationId}
                        className="rounded-2xl bg-[#FAF7F0] p-3"
                      >
                        <div className="flex gap-3">
                          <div className="flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-sm">
                            {book?.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={book.image}
                                alt={target.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "📖"
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-black leading-tight text-[#1F2933]">
                              {target.title}
                            </p>

                            {target.author && (
                              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                                {target.author}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-black ${getExchangeStatusClass(
                              exchange?.status
                            )}`}
                          >
                            {getExchangeStatusLabel(exchange?.status)}
                          </span>

                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                            {formatDate(conversation?.last_message_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <UserExchangePanel
              targets={exchangeTargets}
              returnTo={`/mesajlar/kullanici/${userId}`}
            />

            <details className="rounded-[1.8rem] border border-red-100 bg-red-50/70 p-5 shadow-sm md:rounded-[2rem]">
              <summary className="cursor-pointer text-sm font-black text-red-600">
                Kullanıcıyı Şikayet Et / Bildir
              </summary>

              <form action={submitUserReportAction} className="mt-4 space-y-3">
                <input
                  type="hidden"
                  name="conversationId"
                  value={latestConversation.id}
                />

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-red-400">
                    Şikayet Edilen Kullanıcı
                  </label>

                  <div className="mt-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#1F2933]">
                    {otherUserName}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-red-400">
                    Şikayet Sebebi
                  </label>

                  <select
                    name="reason"
                    required
                    defaultValue="spam"
                    className="mt-2 w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-red-400"
                  >
                    <option value="spam">Spam / rahatsız edici mesaj</option>
                    <option value="harassment">
                      Taciz / hakaret / kötü davranış
                    </option>
                    <option value="fraud">Dolandırıcılık şüphesi</option>
                    <option value="inappropriate">Uygunsuz içerik</option>
                    <option value="unsafe_exchange">
                      Güvensiz takas davranışı
                    </option>
                    <option value="other">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-red-400">
                    Açıklama
                  </label>

                  <textarea
                    name="description"
                    rows={4}
                    maxLength={1000}
                    placeholder="Kısaca ne olduğunu yaz..."
                    className="mt-2 w-full resize-none rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-red-600 px-5 py-3 text-xs font-black text-white transition hover:bg-red-700"
                >
                  Şikayeti Gönder
                </button>
              </form>
            </details>
          </aside>

          <section className="space-y-4 lg:hidden">
            <details className="rounded-[1.3rem] bg-white p-4 shadow-sm ring-1 ring-[#2E7D5B]/5">
              <summary className="cursor-pointer text-sm font-black text-[#2E7D5B]">
                Kitap konuşmaları
              </summary>

              <div className="mt-4 grid gap-3">
                {sendTargets.map((target) => {
                  const exchange = exchangeByConversationId.get(
                    target.conversationId
                  );

                  const conversation = conversations.find(
                    (item) => item.id === target.conversationId
                  );

                  const book = conversation ? getBook(conversation) : null;

                  return (
                    <div
                      key={target.conversationId}
                      className="rounded-2xl bg-[#FAF7F0] p-3"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-sm">
                          {book?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={book.image}
                              alt={target.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            "📖"
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-black leading-tight text-[#1F2933]">
                            {target.title}
                          </p>

                          {target.author && (
                            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                              {target.author}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-black ${getExchangeStatusClass(
                            exchange?.status
                          )}`}
                        >
                          {getExchangeStatusLabel(exchange?.status)}
                        </span>

                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                          {formatDate(conversation?.last_message_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>

            <UserExchangePanel
              targets={exchangeTargets}
              returnTo={`/mesajlar/kullanici/${userId}`}
            />

            <details className="rounded-[1.3rem] border border-red-100 bg-red-50/70 p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-black text-red-600">
                Kullanıcıyı Şikayet Et / Bildir
              </summary>

              <form action={submitUserReportAction} className="mt-4 space-y-3">
                <input
                  type="hidden"
                  name="conversationId"
                  value={latestConversation.id}
                />

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-red-400">
                    Şikayet Edilen Kullanıcı
                  </label>

                  <div className="mt-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#1F2933]">
                    {otherUserName}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-red-400">
                    Şikayet Sebebi
                  </label>

                  <select
                    name="reason"
                    required
                    defaultValue="spam"
                    className="mt-2 w-full rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-red-400"
                  >
                    <option value="spam">Spam / rahatsız edici mesaj</option>
                    <option value="harassment">
                      Taciz / hakaret / kötü davranış
                    </option>
                    <option value="fraud">Dolandırıcılık şüphesi</option>
                    <option value="inappropriate">Uygunsuz içerik</option>
                    <option value="unsafe_exchange">
                      Güvensiz takas davranışı
                    </option>
                    <option value="other">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.15em] text-red-400">
                    Açıklama
                  </label>

                  <textarea
                    name="description"
                    rows={4}
                    maxLength={1000}
                    placeholder="Kısaca ne olduğunu yaz..."
                    className="mt-2 w-full resize-none rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-red-600 px-5 py-3 text-xs font-black text-white transition hover:bg-red-700"
                >
                  Şikayeti Gönder
                </button>
              </form>
            </details>
          </section>
        </section>
      </section>
    </main>
  );
}