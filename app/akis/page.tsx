import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteSocialPostAction,
  togglePostLikeAction,
} from "@/app/actions/social-posts";
import { createClient } from "@/lib/supabase/server";
import { StudentVerifiedBadge } from "@/components/student-verified-badge";

type SearchParams = {
  success?: string;
};

type PostProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string | null;
  university: string | null;
};

type RelatedBook = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
};

type QuoteBook = {
  title: string | null;
  author: string | null;
  source_name: string | null;
};

type QuoteItem = {
  id: string;
  quote_text: string;
  quote_text_tr: string | null;
  original_language: string | null;
  mood: string | null;
  topic: string | null;
  quote_books: QuoteBook | QuoteBook[] | null;
};

type SocialPost = {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  visibility: string;
  post_type: string | null;
  quote_id: string | null;
  related_book_id: string | null;
  created_at: string;
  profiles: PostProfile | PostProfile[] | null;
  books: RelatedBook | RelatedBook[] | null;
  quote_items: QuoteItem | QuoteItem[] | null;
};

type Friendship = {
  requester_id: string;
  addressee_id: string;
  status: string;
};

type PostLike = {
  id: string;
  post_id: string;
  user_id: string;
};

type PostComment = {
  id: string;
  post_id: string;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getProfileName(profile: PostProfile | null) {
  return profile?.full_name || profile?.username || "KampüsRaf kullanıcısı";
}

function getUsername(profile: PostProfile | null) {
  return profile?.username ? `@${profile.username}` : "@kampusraf";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function countByPostId<T extends { post_id: string }>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.post_id] = (acc[item.post_id] || 0) + 1;
    return acc;
  }, {});
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, verification_status")
    .eq("id", user.id)
    .maybeSingle();

  const currentProfile = profileData as PostProfile | null;

  const { data: friendshipsData } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const friendships = (friendshipsData || []) as Friendship[];

  const friendIds = friendships.map((friendship) =>
    friendship.requester_id === user.id
      ? friendship.addressee_id
      : friendship.requester_id
  );

  const visibleUserIds = Array.from(new Set([user.id, ...friendIds]));

  const { data: postsData, error } = await supabase
    .from("social_posts")
    .select(
      `
      id,
      user_id,
      image_url,
      caption,
      visibility,
      post_type,
      quote_id,
      related_book_id,
      created_at,
      profiles (
        id,
        full_name,
        username,
        avatar_url,
        verification_status,
        university
      ),
      books (
        id,
        title,
        author,
        cover_url
      ),
      quote_items (
      id,
      quote_text,
      quote_text_tr,
      original_language,
      mood,
      topic,
      quote_books (
        title,
        author,
        source_name
      )
    )
    `
    )
    .in("user_id", visibleUserIds)
    .order("created_at", { ascending: false })
    .limit(50);

  const posts = (postsData || []) as SocialPost[];
  const postIds = posts.map((post) => post.id);

  let likes: PostLike[] = [];
  let comments: PostComment[] = [];

  if (postIds.length > 0) {
    const { data: likesData } = await supabase
      .from("post_likes")
      .select("id, post_id, user_id")
      .in("post_id", postIds);

    const { data: commentsData } = await supabase
      .from("post_comments")
      .select("id, post_id")
      .in("post_id", postIds);

    likes = (likesData || []) as PostLike[];
    comments = (commentsData || []) as PostComment[];
  }

  const likeCounts = countByPostId(likes);
  const commentCounts = countByPostId(comments);

  const likedPostIds = new Set(
    likes.filter((like) => like.user_id === user.id).map((like) => like.post_id)
  );

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🌿
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Sosyal akış
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/paylas" className="hover:text-[#2E7D5B]">
              Paylaş
            </Link>
            <Link href="/arkadaslar" className="hover:text-[#2E7D5B]">
              Arkadaşlar
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
          </nav>

          <Link
            href="/paylas"
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            Paylaş
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[0.72fr_0.28fr]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.1rem]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/2 h-36 w-36 rounded-full bg-[#F59E0B]/20 blur-3xl" />

                <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                      Kampüs Akışı
                    </p>

                    <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight md:text-5xl">
                      Kitaplardan doğan sosyal alan.
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">
                      Arkadaşlarının kitap anlarını, kampüs paylaşımlarını ve
                      etiketlediği kitapları tek akışta gör.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-72">
                    <div className="rounded-2xl bg-white/10 p-3 text-center">
                      <p className="text-2xl font-black">{posts.length}</p>
                      <p className="mt-1 text-[11px] font-bold text-white/65">
                        Gönderi
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-3 text-center">
                      <p className="text-2xl font-black">
                        {friendships.length}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-white/65">
                        Arkadaş
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-3 text-center">
                      <p className="text-2xl font-black">{likes.length}</p>
                      <p className="mt-1 text-[11px] font-bold text-white/65">
                        Beğeni
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {params.success === "post-created" && (
              <div className="rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B]">
                Paylaşımın akışa eklendi.
              </div>
            )}

            {params.success === "quote-post-created" && (
  <div className="rounded-2xl bg-[#F59E0B]/10 p-4 text-sm font-black text-[#B45309]">
    Favori alıntın akışa paylaşıldı.
  </div>
)}

            {error && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
                Akış yüklenirken hata oluştu: {error.message}
              </div>
            )}

            {!error && posts.length === 0 && (
              <section className="rounded-[1.8rem] bg-white p-8 text-center shadow-sm md:rounded-[2rem] md:p-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
                  📸
                </div>

                <h2 className="mt-5 text-2xl font-black">Akış henüz boş</h2>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                  İlk paylaşımı sen yapabilir veya arkadaş ekleyerek onların
                  kitap anlarını akışında görebilirsin.
                </p>

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/paylas"
                    className="rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                  >
                    İlk Paylaşımı Yap
                  </Link>

                  <Link
                    href="/arkadaslar"
                    className="rounded-full border border-[#2E7D5B]/20 px-6 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                  >
                    Arkadaşlara Git
                  </Link>
                </div>
              </section>
            )}

            <section className="grid gap-6">
              {posts.map((post) => {
                const profile = first(post.profiles);
                const book = first(post.books);
                const quoteItem = first(post.quote_items);
                const quoteBook = first(quoteItem?.quote_books || null);
                const isLiked = likedPostIds.has(post.id);
                const isMine = post.user_id === user.id;
                const isQuotePost = post.post_type === "quote" && Boolean(quoteItem);
                const displayQuote = quoteItem?.quote_text_tr || quoteItem?.quote_text || "";

                return (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-xl md:rounded-[2rem]"
                  >
                    <div className="flex items-center justify-between gap-3 p-4 md:p-5">
                      <Link
                        href={
                          profile?.username
                            ? `/profil/${profile.username}`
                            : "/akis"
                        }
                        className="flex min-w-0 items-center gap-3"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-xl">
                          {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profile.avatar_url}
                              alt={getProfileName(profile)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            "👤"
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-black text-[#1F2933]">
                              {getProfileName(profile)}
                            </p>

                            {profile?.verification_status === "verified" && (
                              <StudentVerifiedBadge />
                            )}
                          </div>

                          <p className="truncate text-xs font-semibold text-slate-500">
                            {getUsername(profile)} · {formatDate(post.created_at)}
                          </p>
                        </div>
                      </Link>

                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
  {isQuotePost && (
    <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-[11px] font-black text-[#B45309]">
      🎲 Alıntı
    </span>
  )}

  <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-[11px] font-black text-slate-500">
    {post.visibility === "public" ? "Herkese Açık" : "Arkadaşlar"}
  </span>
</div>
                    </div>

                    {isQuotePost && quoteItem ? (
  <Link
    href={`/gonderi/${post.id}`}
    className="block bg-[#2E7D5B] p-5 text-white transition hover:bg-[#25684c] md:p-7"
  >
    <div className="flex flex-wrap gap-2">
      {quoteItem.mood && (
        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black">
          {quoteItem.mood}
        </span>
      )}

      {quoteItem.topic && (
        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black">
          {quoteItem.topic}
        </span>
      )}

      <span className="rounded-full bg-[#F59E0B] px-3 py-1 text-[11px] font-black text-white">
        Rastgele Raf
      </span>
    </div>

    <p className="mt-6 text-2xl font-black leading-relaxed md:text-4xl">
      “{displayQuote}”
    </p>

    {quoteItem.original_language !== "tr" && quoteItem.quote_text_tr && (
      <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F5EBDD]">
          Orijinal Alıntı
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
          “{quoteItem.quote_text}”
        </p>
      </div>
    )}

    <div className="mt-6 rounded-[1.5rem] bg-white/10 p-4">
      <p className="text-sm font-black">
        {quoteBook?.title || "Kitap bilgisi yok"}
      </p>
      <p className="mt-1 text-sm font-semibold text-white/65">
        {quoteBook?.author || "Yazar bilgisi yok"}
      </p>
      {quoteBook?.source_name && (
        <p className="mt-2 text-xs font-semibold text-white/45">
          Kaynak: {quoteBook.source_name}
        </p>
      )}
    </div>
  </Link>
) : post.image_url ? (
  <Link
    href={`/gonderi/${post.id}`}
    className="block bg-[#FAF7F0]"
  >
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={post.image_url}
      alt="Paylaşım görseli"
      className="max-h-[820px] w-full object-contain"
    />
  </Link>
) : null}

                    <div className="p-4 md:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={togglePostLikeAction}>
                          <input type="hidden" name="postId" value={post.id} />
                          <input type="hidden" name="redirectTo" value="/akis" />

                          <button
                            type="submit"
                            className={`rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${
                              isLiked
                                ? "bg-red-50 text-red-600"
                                : "bg-[#FAF7F0] text-[#1F2933]"
                            }`}
                          >
                            {isLiked ? "❤️ Beğenildi" : "🤍 Beğen"}
                          </button>
                        </form>

                        <Link
                          href={`/gonderi/${post.id}`}
                          className="rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-[#2E7D5B]/5"
                        >
                          {likeCounts[post.id] || 0} beğeni
                        </Link>

                        <Link
                          href={`/gonderi/${post.id}`}
                          className="rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-[#2E7D5B]/5"
                        >
                          {commentCounts[post.id] || 0} yorum
                        </Link>

                        {isMine && (
                          <form action={deleteSocialPostAction} className="ml-auto">
                            <input type="hidden" name="postId" value={post.id} />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value="/akis"
                            />

                            <button
                              type="submit"
                              className="rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100"
                            >
                              Sil
                            </button>
                          </form>
                        )}
                      </div>

                      {post.caption && (
                        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                          <span className="font-black text-[#1F2933]">
                            {getUsername(profile)}
                          </span>{" "}
                          {post.caption}
                        </p>
                      )}

                      {book && (
                        <Link
                          href={`/kitap-ara?q=${encodeURIComponent(
                            book.title || ""
                          )}`}
                          className="mt-4 flex items-center gap-3 rounded-[1.4rem] bg-[#FAF7F0] p-3 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                        >
                          <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-xl">
                            {book.cover_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={book.cover_url}
                                alt={book.title || "Kitap"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "📖"
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-black text-[#1F2933]">
                              {book.title || "Kitap etiketi"}
                            </p>
                            <p className="line-clamp-1 text-xs font-semibold text-slate-500">
                              {book.author || "Yazar belirtilmemiş"}
                            </p>
                          </div>
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-2xl">
                  {currentProfile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentProfile.avatar_url}
                      alt={getProfileName(currentProfile)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "👤"
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-base font-black">
                    {getProfileName(currentProfile)}
                  </p>
                  <p className="truncate text-xs font-black text-[#2E7D5B]">
                    {getUsername(currentProfile)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link
                  href="/paylas"
                  className="rounded-2xl bg-[#2E7D5B] px-4 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Paylaş
                </Link>

                <Link
                  href={
                    currentProfile?.username
                      ? `/profil/${currentProfile.username}`
                      : "/profilim"
                  }
                  className="rounded-2xl bg-[#FAF7F0] px-4 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                >
                  Profilim
                </Link>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                Hızlı Erişim
              </p>

              <div className="mt-4 grid gap-2">
                <Link
                  href="/arkadaslar"
                  className="rounded-[1.3rem] bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  <p className="text-sm font-black">👥 Arkadaşlar</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Arkadaşlık istekleri ve sosyal çevren.
                  </p>
                </Link>

                <Link
                  href="/kitap-ara"
                  className="rounded-[1.3rem] bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  <p className="text-sm font-black">🔎 Kitap Ara</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Aradığın kitabı kampüste bul.
                  </p>
                </Link>

                <Link
  href="/rastgele-raf"
  className="rounded-[1.3rem] bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5 hover:bg-[#F59E0B]/10"
>
  <p className="text-sm font-black">🎲 Rastgele Raf</p>
  <p className="mt-1 text-xs font-semibold text-slate-500">
    Alıntı keşfet, favorile ve akışta paylaş.
  </p>
</Link>

                <Link
                  href="/mesajlar"
                  className="rounded-[1.3rem] bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  <p className="text-sm font-black">💬 Mesajlar</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Kitap ve takas sohbetlerini yönet.
                  </p>
                </Link>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem]">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F5EBDD]">
                İpucu
              </p>
              <h2 className="mt-2 text-xl font-black">
                Paylaşımlarını kitapla etiketle.
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Kitap etiketi olan gönderiler hem sosyal profilinde daha anlamlı
                durur hem de kitap keşfini güçlendirir.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}