import Link from "next/link";
import { redirect } from "next/navigation";
import { type InboxConversationGroup } from "@/components/messages-inbox";
import { MessagesRealtimeRefresh } from "@/components/messages-realtime-refresh";
import { createClient } from "@/lib/supabase/server";

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

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "K";
}

function formatMessageDate(value: string | null) {
  if (!value) return "Yeni sohbet";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
      lastMessage: isNewer
        ? conversation.last_message
        : currentGroup.lastMessage,
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

  const unreadConversationCount = inboxConversations.filter(
    (conversation) => conversation.unreadCount > 0
  ).length;

  const totalBookContextCount = inboxConversations.reduce(
    (total, conversation) => total + conversation.books.length,
    0
  );

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <MessagesRealtimeRefresh currentUserId={user.id} />

      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              💬
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Mesaj merkezi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
              Eşleşmeler
            </Link>
            <Link href="/takaslar" className="hover:text-[#2E7D5B]">
              Takaslar
            </Link>
          </nav>

          <Link
            href="/kitap-ara"
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Kitap Ara
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
                  Mesaj Merkezi
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Kitap sohbetlerini tek merkezden yönet.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Aynı kişiyle farklı kitaplar üzerinden açılan konuşmalar tek
                  kişi kartında birleşir. Okunmamış mesajlarını ve kitap
                  bağlamlarını buradan takip edebilirsin.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {inboxConversations.length}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Kişi Sohbeti
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {unreadTotal}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Okunmamış
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {totalBookContextCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Kitap Bağlamı
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">Canlı</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Realtime
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 md:mt-8 md:p-5">
            Mesajlar yüklenirken hata oluştu: {error.message}
          </div>
        )}

        {!error && conversations.length === 0 ? (
          <section className="mt-6 rounded-[1.8rem] border border-dashed border-[#2E7D5B]/30 bg-white p-6 text-center shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem] md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              💬
            </div>

            <h2 className="mt-5 text-xl font-black md:text-2xl">
              Henüz sohbet yok
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Bir kitabın detay sayfasından veya eşleşme kartından “Mesaj
              Gönder” dediğinde sohbet burada görünecek.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/kitap-ara"
                className="rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5"
              >
                Kitap Ara
              </Link>

              <Link
                href="/eslesmeler"
                className="rounded-full border border-[#2E7D5B]/20 px-7 py-4 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
              >
                Eşleşmelere Git
              </Link>
            </div>
          </section>
        ) : (
          !error && (
            <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-[1.8rem] bg-white p-4 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-5">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                      Sohbet Listesi
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      Kişi bazlı mesajlar
                    </h2>

                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {inboxConversations.length} kişiyle konuşma gösteriliyor.
                    </p>
                  </div>

                  {unreadTotal > 0 && (
                    <div className="w-fit rounded-full bg-[#F59E0B]/10 px-4 py-2 text-xs font-black text-[#B45309]">
                      {unreadTotal} okunmamış mesaj
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {inboxConversations.map((conversation) => {
                    const hasUnread = conversation.unreadCount > 0;
                    const firstBook = conversation.books[0];
                    const extraBookCount = Math.max(
                      conversation.books.length - 1,
                      0
                    );

                    return (
                      <Link
                        key={conversation.id}
                        href={`/mesajlar/kullanici/${conversation.otherUserId}`}
                        className={`group block rounded-[1.5rem] border p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 ${
                          hasUnread
                            ? "border-[#2E7D5B]/25 bg-[#2E7D5B]/5"
                            : "border-slate-100 bg-[#FAF7F0]"
                        }`}
                      >
                        <div className="flex gap-3 md:gap-4">
                          <div className="relative h-14 w-14 shrink-0 md:h-16 md:w-16">
                            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-white text-lg font-black text-[#2E7D5B] shadow-sm md:rounded-3xl">
                              {conversation.otherUser.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={conversation.otherUser.avatarUrl}
                                  alt={conversation.otherUser.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitial(conversation.otherUser.name)
                              )}
                            </div>

                            {hasUnread && (
                              <div className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#F59E0B] px-1.5 text-[11px] font-black text-white shadow-sm">
                                {conversation.unreadCount}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p
                                  className={`line-clamp-1 text-base leading-tight md:text-lg ${
                                    hasUnread
                                      ? "font-black text-[#1F2933]"
                                      : "font-extrabold text-[#1F2933]"
                                  }`}
                                >
                                  {conversation.otherUser.name}
                                </p>

                                {conversation.otherUser.username && (
                                  <p className="mt-1 line-clamp-1 text-xs font-bold text-[#2E7D5B]">
                                    @{conversation.otherUser.username}
                                  </p>
                                )}
                              </div>

                              <p className="shrink-0 text-[11px] font-bold text-slate-400">
                                {formatMessageDate(
                                  conversation.lastMessageAt ||
                                    conversation.createdAt
                                )}
                              </p>
                            </div>

                            <p
                              className={`mt-2 line-clamp-1 text-sm ${
                                hasUnread
                                  ? "font-black text-[#2E7D5B]"
                                  : "font-semibold text-slate-500"
                              }`}
                            >
                              {conversation.lastMessage ||
                                "Henüz mesaj yazılmamış."}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                                {conversation.conversationCount} sohbet
                              </span>

                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                                {conversation.otherUser.university}
                              </span>

                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                                {conversation.otherUser.city}
                              </span>
                            </div>

                            {firstBook && (
                              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3">
                                <div className="flex h-11 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#FAF7F0] text-sm">
                                  {firstBook.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={firstBook.image}
                                      alt={firstBook.title}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    "📖"
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-1 text-xs font-black text-[#1F2933]">
                                    {firstBook.title}
                                  </p>

                                  {firstBook.author && (
                                    <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-slate-400">
                                      {firstBook.author}
                                    </p>
                                  )}
                                </div>

                                {extraBookCount > 0 && (
                                  <span className="shrink-0 rounded-full bg-[#2E7D5B]/10 px-2.5 py-1 text-[11px] font-black text-[#2E7D5B]">
                                    +{extraBookCount}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
                <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                    Mesaj Özeti
                  </p>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl bg-[#FAF7F0] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Kişi Sohbeti
                      </p>
                      <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                        {inboxConversations.length}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FAF7F0] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Okunmamış Kişi
                      </p>
                      <p className="mt-2 text-2xl font-black text-[#F59E0B]">
                        {unreadConversationCount}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FAF7F0] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Kitap Konuşması
                      </p>
                      <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                        {totalBookContextCount}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem] md:p-6">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                    Hızlı Aksiyon
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    Yeni bir kitap konuşması başlat.
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/70">
                    Kitap ara, eşleşme bul veya kendi arama kayıtlarını kontrol
                    ederek yeni sohbet başlatabilirsin.
                  </p>

                  <div className="mt-5 grid gap-3">
                    <Link
                      href="/kitap-ara"
                      className="rounded-full bg-white px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                    >
                      Kitap Ara
                    </Link>

                    <Link
                      href="/eslesmeler"
                      className="rounded-full border border-white/25 px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                    >
                      Eşleşmelere Git
                    </Link>
                  </div>
                </section>

                <section className="rounded-[1.8rem] border border-[#2E7D5B]/10 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                    Güvenli Mesajlaşma
                  </p>

                  <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600">
                    <p className="rounded-2xl bg-[#FAF7F0] p-3">
                      ✓ Kitap tesliminden önce uygulama içinden konuş.
                    </p>
                    <p className="rounded-2xl bg-[#FAF7F0] p-3">
                      ✓ Buluşma için kampüs veya kalabalık noktaları tercih et.
                    </p>
                    <p className="rounded-2xl bg-[#FAF7F0] p-3">
                      ✓ Kişisel bilgilerini gereksiz yere paylaşma.
                    </p>
                  </div>
                </section>
              </aside>
            </section>
          )
        )}
      </section>
    </main>
  );
}