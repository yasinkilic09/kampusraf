import Link from "next/link";
import { redirect } from "next/navigation";
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

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function formatDate(value: string | null) {
  if (!value) return "Yeni sohbet";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getOtherUser(conversation: ConversationItem, currentUserId: string) {
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

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
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
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Sohbetler
          </p>
          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
  Mesajlar
</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
            Kitap takası, ödünç alma veya paylaşım sürecini buradan takip
            edebilirsin.
          </p>
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
            <h2 className="mt-5 text-xl font-black md:text-2xl">Henüz sohbet yok</h2>
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
          <div className="mt-6 space-y-3 md:mt-8 md:space-y-4">
            {conversations.map((conversation) => {
              const otherUser = getOtherUser(conversation, user.id);
              const book = getBook(conversation);

              return (
                <Link
                  key={conversation.id}
                  href={`/mesajlar/${conversation.id}`}
                  className="block rounded-[1.7rem] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem] md:p-5"
                >
                  <div className="flex gap-3 md:gap-4">
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-xl md:h-16 md:w-16 md:rounded-3xl md:text-2xl">
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

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div className="min-w-0">
  <h2 className="line-clamp-1 text-lg font-black leading-tight md:text-xl">
    {otherUser.name}
  </h2>
                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
  {otherUser.university} · {otherUser.city}
</p>
                        </div>

                        <p className="shrink-0 text-xs font-bold text-slate-400">
  {formatDate(conversation.last_message_at)}
</p>
                      </div>

                      <div className="mt-3 rounded-2xl bg-[#FAF7F0] p-3 md:mt-4 md:p-4">
                        <p className="line-clamp-1 text-sm font-black text-[#2E7D5B]">
  {book.title}
</p>
                        {book.author && (
                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
  {book.author}
</p>
                        )}
                      </div>

                      <p className="mt-3 line-clamp-1 text-sm font-semibold text-slate-500 md:mt-4">
  {conversation.last_message || "Sohbet başlatıldı."}
</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}