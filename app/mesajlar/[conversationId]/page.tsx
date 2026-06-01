import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createExchangeAction,
  updateExchangeStatusAction,
} from "@/app/actions/exchanges";
import { submitUserReportAction } from "@/app/actions/user-reports";
import { ChatRoom } from "@/components/chat-room";

type ProfileSummary = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  university: string | null;
  city: string | null;
};

type ConversationDetail = {
  id: string;
  user_one_id: string;
  user_two_id: string;
  user_book_id: string | null;
  user_one: ProfileSummary | ProfileSummary[] | null;
  user_two: ProfileSummary | ProfileSummary[] | null;
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

type MessageItem = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type ExchangeItem = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  canceled_at: string | null;
};

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
    return "Takas süreci başlatıldı. Şimdi buluşma veya teslim yöntemi netleştirilebilir.";
  }

  if (status === "meeting_planned") {
    return "Görüşme planlandı. Kitap teslim edildiğinde sonraki adıma geçebilirsin.";
  }

  if (status === "handed_over") {
    return "Kitap teslim edildi olarak işaretlendi. Süreç sorunsuz tamamlandıysa takası tamamlayabilirsin.";
  }

  if (status === "completed") {
    return "Bu takas başarıyla tamamlandı. Güven profiline tamamlanan takas olarak işlendi.";
  }

  if (status === "canceled") {
    return "Bu takas süreci iptal edildi.";
  }

  return "Kitap paylaşım sürecini buradan takip edebilirsin.";
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

type SearchParams = {
  error?: string;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getOtherUser(conversation: ConversationDetail, currentUserId: string) {
  const userOne = first(conversation.user_one);
  const userTwo = first(conversation.user_two);

  const other = conversation.user_one_id === currentUserId ? userTwo : userOne;

  return {
    name: other?.full_name || other?.username || "KampüsRaf kullanıcısı",
    username: other?.username || "",
    avatarUrl: other?.avatar_url || null,
    university: other?.university || "Üniversite bilgisi yok",
    city: other?.city || "Şehir bilgisi yok",
  };
}

function getBook(conversation: ConversationDetail) {
  const userBook = first(conversation.user_books);
  const relatedBook = first(userBook?.books || null);

  return {
    title: userBook?.custom_title || relatedBook?.title || "Kitap bilgisi yok",
    author: userBook?.custom_author || relatedBook?.author || "",
    image: userBook?.image_url || relatedBook?.cover_url || null,
  };
}

export default async function ConversationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { conversationId } = await params;
  const queryParams = (await searchParams) || {};

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      user_one_id,
      user_two_id,
      user_book_id,
      user_one:profiles!conversations_user_one_id_fkey (
        full_name,
        username,
        avatar_url,
        university,
        city
      ),
      user_two:profiles!conversations_user_two_id_fkey (
        full_name,
        username,
        avatar_url,
        university,
        city
      ),
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
    .eq("id", conversationId)
    .single();

  if (error || !conversation) {
    notFound();
  }

  const currentConversation = conversation as ConversationDetail;

  const isMember =
    currentConversation.user_one_id === user.id ||
    currentConversation.user_two_id === user.id;

  if (!isMember) {
    redirect("/mesajlar");
  }

  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", currentConversation.id)
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, is_read, created_at")
    .eq("conversation_id", currentConversation.id)
    .order("created_at", { ascending: true });

    const { data: exchangeData } = await supabase
  .from("exchanges")
  .select("id, status, created_at, updated_at, completed_at, canceled_at")
  .eq("conversation_id", currentConversation.id)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const exchange = exchangeData as ExchangeItem | null;

  const messageList = (messages || []) as MessageItem[];

  const otherUser = getOtherUser(currentConversation, user.id);
  const book = getBook(currentConversation);

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/mesajlar" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              💬
            </div>
            <div>
              <p className="text-xl font-black">Sohbet</p>
              <p className="text-xs font-semibold text-slate-500">
                KampüsRaf mesajlaşma
              </p>
            </div>
          </Link>

          <Link
  href="/mesajlar"
  className="rounded-full bg-[#FAF7F0] px-4 py-2.5 text-xs font-black text-[#2E7D5B] md:px-5 md:py-3 md:text-sm"
>
  Tüm Mesajlar
</Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-4 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3 md:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 text-xl md:h-16 md:w-16 md:rounded-3xl md:text-2xl">
                {otherUser.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={otherUser.avatarUrl}
                    alt={otherUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "👤"
                )}
              </div>

              <div className="min-w-0">
  <h1 className="line-clamp-1 text-xl font-black leading-tight md:text-2xl">
    {otherUser.name}
  </h1>
  <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/65 md:text-sm">
    {otherUser.university} · {otherUser.city}
  </p>
</div>
            </div>

            <div className="min-w-0 rounded-2xl bg-white/10 p-3 md:rounded-3xl md:p-4">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-white/45">
                Kitap
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-black leading-tight">
  {book.title}
</p>
              {book.author && (
                <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/60">
  {book.author}
</p>
              )}
            </div>
          </div>
        </div>

        {queryParams.error && (
  <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
    {decodeURIComponent(queryParams.error)}
  </div>
)}
        <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
                Takas Süreci
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#1F2933]">
                {exchange
                  ? getExchangeStatusLabel(exchange.status)
                  : "Henüz takas başlatılmadı"}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {exchange
                  ? getExchangeStatusDescription(exchange.status)
                  : "Mesajlaştıktan sonra kitap teslim sürecini buradan başlatabilirsin."}
              </p>
            </div>

            {exchange && (
              <span
                className={`w-fit rounded-full px-4 py-2 text-xs font-black ${getExchangeStatusClass(
                  exchange.status
                )}`}
              >
                {getExchangeStatusLabel(exchange.status)}
              </span>
            )}
          </div>

          {!exchange && currentConversation.user_book_id && (
            <form action={createExchangeAction} className="mt-5">
              <input
                type="hidden"
                name="conversationId"
                value={currentConversation.id}
              />

              <button
                type="submit"
                className="w-full rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 sm:w-auto"
              >
                Takas Sürecini Başlat
              </button>
            </form>
          )}

          {exchange &&
            exchange.status !== "completed" &&
            exchange.status !== "canceled" && (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {exchange.status === "requested" && (
                  <ExchangeActionButton
                    exchangeId={exchange.id}
                    conversationId={currentConversation.id}
                    status="meeting_planned"
                  >
                    Görüşme Planlandı
                  </ExchangeActionButton>
                )}

                {exchange.status === "meeting_planned" && (
                  <ExchangeActionButton
                    exchangeId={exchange.id}
                    conversationId={currentConversation.id}
                    status="handed_over"
                  >
                    Kitap Teslim Edildi
                  </ExchangeActionButton>
                )}

                {exchange.status === "handed_over" && (
                  <ExchangeActionButton
                    exchangeId={exchange.id}
                    conversationId={currentConversation.id}
                    status="completed"
                  >
                    Takası Tamamla
                  </ExchangeActionButton>
                )}

                <ExchangeActionButton
                  exchangeId={exchange.id}
                  conversationId={currentConversation.id}
                  status="canceled"
                  danger
                >
                  Takası İptal Et
                </ExchangeActionButton>
              </div>
            )}

          {exchange?.status === "completed" && (
            <div className="mt-5 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-bold text-[#2E7D5B]">
              Bu takas tamamlandı. İki kullanıcının güven profiline tamamlanan
              takas olarak işlendi.
            </div>
          )}

          {exchange?.status === "canceled" && (
            <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
              Bu takas iptal edildi. Aynı sohbet üzerinden mesajlaşmaya devam
              edebilirsin.
            </div>
          )}
        </div>

        <details className="mt-5 rounded-[1.7rem] border border-red-100 bg-red-50/70 p-4 shadow-sm md:mt-6 md:rounded-[2rem] md:p-5">
          <summary className="cursor-pointer text-sm font-black text-red-600">
            Kullanıcıyı Şikayet Et / Bildir
          </summary>

          <form action={submitUserReportAction} className="mt-4 space-y-3">
            <input
              type="hidden"
              name="conversationId"
              value={currentConversation.id}
            />

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
                <option value="harassment">Taciz / hakaret / kötü davranış</option>
                <option value="fraud">Dolandırıcılık şüphesi</option>
                <option value="inappropriate">Uygunsuz içerik</option>
                <option value="unsafe_exchange">Güvensiz takas davranışı</option>
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
              className="w-full rounded-full bg-red-600 px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-red-700"
            >
              Şikayeti Gönder
            </button>

            <p className="text-xs leading-5 text-red-400">
              Şikayetler admin tarafından incelenir. Gerektiğinde kullanıcı
              askıya alınabilir veya engellenebilir.
            </p>
          </form>
        </details>

        <div className="mt-5 md:mt-6">
  <ChatRoom
    initialMessages={messageList}
    conversationId={currentConversation.id}
    currentUserId={user.id}
  />
</div>
      </section>
    </main>
  );
}