import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MessagesInbox,
  type InboxConversationGroup,
} from "@/components/messages-inbox";
import { createClient } from "@/lib/supabase/server";
import { MessagesRealtimeRefresh } from "@/components/messages-realtime-refresh";

type ProfileSummary = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  university: string | null;
  city: string | null;
};

type ConversationItem = {
  id: string;
  user_one_id: string;
  user_two_id: string;
  user_book_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
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

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getOtherUser(conversation: ConversationItem, currentUserId: string) {
  const userOne = first(conversation.user_one);
  const userTwo = first(conversation.user_two);

  const isCurrentUserOne = conversation.user_one_id === currentUserId;
  const other = isCurrentUserOne ? userTwo : userOne;
  const otherUserId = isCurrentUserOne
    ? conversation.user_two_id
    : conversation.user_one_id;

  return {
    id: otherUserId,
    name: other?.full_name || other?.username || "KampüsRaf kullanıcısı",
    username: other?.username || "",
    avatarUrl: other?.avatar_url || null,
    university: other?.university || "Üniversite bilgisi yok",
    city: other?.city || "Şehir bilgisi yok",
  };
}

function getBook(conversation: ConversationItem) {
  const userBook = first(conversation.user_books);
  const relatedBook = first(userBook?.books || null);

  return {
    title: userBook?.custom_title || relatedBook?.title || "Kitap bilgisi yok",
    author: userBook?.custom_author || relatedBook?.author || "",
    image: userBook?.image_url || relatedBook?.cover_url || null,
  };
}

export default async function MessagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      user_one_id,
      user_two_id,
      user_book_id,
      last_message,
      last_message_at,
      created_at,
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
    .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const conversations = (data || []) as ConversationItem[];
  const conversationIds = conversations.map((conversation) => conversation.id);

  const unreadCounts = new Map<string, number>();

  if (conversationIds.length > 0) {
    const { data: unreadMessages } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", conversationIds)
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    for (const message of unreadMessages || []) {
      const conversationId = message.conversation_id as string;

      unreadCounts.set(
        conversationId,
        (unreadCounts.get(conversationId) || 0) + 1
      );
    }
  }

  const groupedInbox = new Map<string, InboxConversationGroup>();

for (const conversation of conversations) {
  const otherUser = getOtherUser(conversation, user.id);
  const book = getBook(conversation);
  const unreadCount = unreadCounts.get(conversation.id) || 0;
  const groupKey = otherUser.id;

  const currentGroup = groupedInbox.get(groupKey);
  const currentTime = new Date(
    conversation.last_message_at || conversation.created_at
  ).getTime();

  if (!currentGroup) {
    groupedInbox.set(groupKey, {
      id: groupKey,
      otherUserId: otherUser.id,
      primaryConversationId: conversation.id,
      lastMessage: conversation.last_message,
      lastMessageAt: conversation.last_message_at,
      createdAt: conversation.created_at,
      unreadCount,
      conversationCount: 1,
      otherUser: {
        name: otherUser.name,
        username: otherUser.username,
        avatarUrl: otherUser.avatarUrl,
        university: otherUser.university,
        city: otherUser.city,
      },
      books: [
        {
          title: book.title,
          author: book.author,
          image: book.image,
          conversationId: conversation.id,
        },
      ],
    });

    continue;
  }

  const groupTime = new Date(
    currentGroup.lastMessageAt || currentGroup.createdAt
  ).getTime();

  const isNewer = currentTime > groupTime;

  groupedInbox.set(groupKey, {
    ...currentGroup,
    primaryConversationId: isNewer
      ? conversation.id
      : currentGroup.primaryConversationId,
    lastMessage: isNewer ? conversation.last_message : currentGroup.lastMessage,
    lastMessageAt: isNewer
      ? conversation.last_message_at
      : currentGroup.lastMessageAt,
    createdAt: isNewer ? conversation.created_at : currentGroup.createdAt,
    unreadCount: currentGroup.unreadCount + unreadCount,
    conversationCount: currentGroup.conversationCount + 1,
    books: [
      ...currentGroup.books,
      {
        title: book.title,
        author: book.author,
        image: book.image,
        conversationId: conversation.id,
      },
    ],
  });
}

const inboxConversations = Array.from(groupedInbox.values()).sort((a, b) => {
  const firstTime = new Date(a.lastMessageAt || a.createdAt).getTime();
  const secondTime = new Date(b.lastMessageAt || b.createdAt).getTime();

  return secondTime - firstTime;
});

  const unreadTotal = inboxConversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <MessagesRealtimeRefresh currentUserId={user.id} />
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📚
            </div>

            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">Mesajlar</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/takaslar" className="hover:text-[#2E7D5B]">
              Takaslar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <div className="overflow-hidden rounded-[1.7rem] bg-[#2E7D5B] text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem]">
          <div className="relative p-6 md:p-12">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-10 h-28 w-28 rounded-full bg-[#F59E0B]/20 blur-2xl" />

            <div className="relative">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
                Sohbetler
              </p>

              <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
                Mesajlar
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                Kitap takası, ödünç alma ve paylaşım sürecindeki tüm
                konuşmalarını tek yerden takip et.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-black">
                    {inboxConversations.length}
                  </p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    Toplam sohbet
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-black">{unreadTotal}</p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    Okunmamış mesaj
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-black">Aktif</p>
                  <p className="mt-1 text-xs font-bold text-white/70">
                    Realtime sohbet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 md:mt-8 md:p-5">
            Mesajlar yüklenirken hata oluştu: {error.message}
          </div>
        )}

        {!error && conversations.length === 0 ? (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-[#2E7D5B]/30 bg-white p-6 text-center shadow-sm md:mt-8 md:rounded-[2rem] md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              💬
            </div>

            <h2 className="mt-5 text-xl font-black md:text-2xl">
              Henüz sohbet yok
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Bir kitabın detay sayfasından “Mesaj Gönder” butonuna bastığında
              sohbet burada görünecek.
            </p>

            <Link
              href="/kitap-ara"
              className="mt-6 inline-flex w-full justify-center rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-1 sm:w-auto"
            >
              Kitap Ara
            </Link>
          </div>
        ) : (
          !error && <MessagesInbox conversations={inboxConversations} />
        )}
      </section>
    </main>
  );
}