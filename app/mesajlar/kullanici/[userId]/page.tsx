import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UserChatRoom } from "@/components/user-chat-room";
import { createClient } from "@/lib/supabase/server";
import { submitUserReportAction } from "@/app/actions/user-reports";
import {
  createExchangeAction,
  updateExchangeStatusAction,
} from "@/app/actions/exchanges";
import { UserExchangePanel } from "@/components/user-exchange-panel";

type UserChatPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

type ProfileSummary = {
  full_name: string | null;
  username: string | null;
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

function getExchangeStatusLabel(status: string) {
  if (status === "requested") return "Takas Talebi Başlatıldı";
  if (status === "meeting_planned") return "Görüşme Planlandı";
  if (status === "handed_over") return "Kitap Teslim Edildi";
  if (status === "completed") return "Takas Tamamlandı";
  if (status === "canceled") return "Takas İptal Edildi";
  return "Takas Süreci";
}

function getExchangeStatusDescription(status: string) {
  if (status === "requested") {
    return "Takas süreci başlatıldı. Taraflar teslim/görüşme detaylarını netleştirebilir.";
  }

  if (status === "meeting_planned") {
    return "Görüşme planlandı. Kitap teslim edildiğinde süreci bir sonraki adıma taşıyabilirsin.";
  }

  if (status === "handed_over") {
    return "Kitap teslim edildi olarak işaretlendi. Süreç tamamlandığında takası bitirebilirsin.";
  }

  if (status === "completed") {
    return "Bu takas tamamlandı ve güven profiline işlendi.";
  }

  if (status === "canceled") {
    return "Bu takas iptal edildi. Aynı kullanıcıyla mesajlaşmaya devam edebilirsin.";
  }

  return "Mesajlaştıktan sonra kitap teslim sürecini buradan başlatabilirsin.";
}

function getExchangeStatusClass(status: string) {
  if (status === "requested") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "meeting_planned") return "bg-blue-50 text-blue-600";
  if (status === "handed_over") return "bg-purple-50 text-purple-600";
  if (status === "completed") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "canceled") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
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
    .select("full_name, username, university, city")
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

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/mesajlar" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              ←
            </div>

            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Kişi sohbeti
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
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <div className="mb-5 rounded-[1.7rem] bg-white p-4 shadow-sm md:mb-6 md:rounded-[2rem] md:p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
            Birleşik Sohbet
          </p>

          <h1 className="mt-2 text-2xl font-black md:text-3xl">
            {otherUserName}
          </h1>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Bu kişiyle olan {conversations.length} kitap sohbeti tek akışta
            gösteriliyor.
          </p>
        </div>

                <details className="mb-5 rounded-[1.7rem] border border-red-100 bg-red-50/70 p-4 shadow-sm md:mb-6 md:rounded-[2rem] md:p-5">
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
              Bu bildirim {otherUserName} kullanıcısı için oluşturulur.
              Şikayetler admin tarafından incelenir.
            </p>
          </form>
        </details>

                        <UserExchangePanel
          targets={sendTargets.map((target) => {
            const exchange = exchangeByConversationId.get(
              target.conversationId
            );

            return {
              conversationId: target.conversationId,
              title: target.title,
              author: target.author,
              exchangeId: exchange?.id || null,
              status: exchange?.status || null,
            };
          })}
          returnTo={`/mesajlar/kullanici/${userId}`}
        />

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
    </main>
  );
}