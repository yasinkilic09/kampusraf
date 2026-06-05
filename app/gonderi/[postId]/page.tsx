import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createPostCommentAction,
  deleteSocialPostAction,
  togglePostLikeAction,
} from "@/app/actions/social-posts";
import { createClient } from "@/lib/supabase/server";
import { StudentVerifiedBadge } from "@/components/student-verified-badge";

type PostPageParams = {
  postId: string;
};

type BasicProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string | null;
};

type PostProfile = BasicProfile & {
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

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: BasicProfile | BasicProfile[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getProfileName(profile: BasicProfile | null) {
  return profile?.full_name || profile?.username || "KampüsRaf kullanıcısı";
}

function getUsername(profile: BasicProfile | null) {
  return profile?.username ? `@${profile.username}` : "@kampusraf";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<PostPageParams>;
}) {
  const { postId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: postData, error: postError } = await supabase
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
    .eq("id", postId)
    .maybeSingle();

  if (postError || !postData) {
    notFound();
  }

  const post = postData as SocialPost;
  const profile = first(post.profiles);
  const book = first(post.books);
  const quoteItem = first(post.quote_items);
  const quoteBook = first(quoteItem?.quote_books || null);
  const isMine = post.user_id === user.id;
  const isQuotePost = post.post_type === "quote" && Boolean(quoteItem);
  const displayQuote = quoteItem?.quote_text_tr || quoteItem?.quote_text || "";

  const { count: likesCount } = await supabase
    .from("post_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", post.id);

  const { data: myLike } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", post.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: commentsData } = await supabase
    .from("post_comments")
    .select(
      `
      id,
      post_id,
      user_id,
      content,
      created_at,
      profiles (
        id,
        full_name,
        username,
        avatar_url,
        verification_status
      )
    `
    )
    .eq("post_id", post.id)
    .order("created_at", { ascending: true });

  const comments = (commentsData || []) as PostComment[];

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/akis" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📸
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Gönderi detayı
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/akis" className="hover:text-[#2E7D5B]">
              Akış
            </Link>
            <Link href="/paylas" className="hover:text-[#2E7D5B]">
              Paylaş
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
          </nav>

          <Link
            href="/akis"
            className="rounded-full border border-[#2E7D5B]/20 px-5 py-2.5 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            Akışa Dön
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <article className="grid overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2.2rem] lg:grid-cols-[1.12fr_0.88fr]">
          <section
  className={`flex min-h-[360px] items-center justify-center ${
    isQuotePost ? "bg-[#2E7D5B]" : "bg-[#111827]"
  } lg:min-h-[760px]`}
>
  {isQuotePost && quoteItem ? (
    <div className="w-full p-6 text-white md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap gap-2">
          {quoteItem.mood && (
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
              {quoteItem.mood}
            </span>
          )}

          {quoteItem.topic && (
            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
              {quoteItem.topic}
            </span>
          )}

          <span className="rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-black text-white">
            🎲 Rastgele Raf
          </span>
        </div>

        <p className="mt-8 text-3xl font-black leading-relaxed tracking-tight md:text-5xl">
          “{displayQuote}”
        </p>

        {quoteItem.original_language !== "tr" && quoteItem.quote_text_tr && (
          <div className="mt-6 rounded-[1.5rem] bg-white/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F5EBDD]">
              Orijinal Alıntı
            </p>
            <p className="mt-2 text-base font-semibold leading-7 text-white/75">
              “{quoteItem.quote_text}”
            </p>
          </div>
        )}

        <div className="mt-7 rounded-[1.5rem] bg-white/10 p-5">
          <p className="text-base font-black">
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

        <div className="mt-6">
          <Link
            href="/rastgele-raf"
            className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
          >
            🎲 Rastgele Raf’a Git
          </Link>
        </div>
      </div>
    </div>
  ) : post.image_url ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={post.image_url}
        alt={post.caption || "KampüsRaf gönderisi"}
        className="max-h-[800px] w-full object-contain"
      />
    </>
  ) : (
    <div className="p-8 text-center text-white">
      <p className="text-4xl">📭</p>
      <p className="mt-3 text-sm font-black">
        Bu gönderinin içeriği görüntülenemiyor.
      </p>
    </div>
  )}
</section>

          <section className="flex min-h-[620px] flex-col">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={profile?.username ? `/profil/${profile.username}` : "/akis"}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-xl">
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
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-wrap items-center gap-2">
                <form action={togglePostLikeAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <input
                    type="hidden"
                    name="redirectTo"
                    value={`/gonderi/${post.id}`}
                  />

                  <button
                    type="submit"
                    className={`rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${
                      myLike
                        ? "bg-red-50 text-red-600"
                        : "bg-[#FAF7F0] text-[#1F2933]"
                    }`}
                  >
                    {myLike ? "❤️ Beğenildi" : "🤍 Beğen"}
                  </button>
                </form>

                <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-600">
                  {likesCount || 0} beğeni
                </span>

                <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-600">
                  {comments.length} yorum
                </span>

                {isMine && (
                  <form action={deleteSocialPostAction} className="ml-auto">
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="redirectTo" value="/akis" />

                    <button
                      type="submit"
                      className="rounded-full bg-red-50 px-4 py-2 text-sm font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100"
                    >
                      Gönderiyi Sil
                    </button>
                  </form>
                )}
              </div>

              {post.caption && (
                <div className="mt-5 rounded-[1.5rem] bg-[#FAF7F0] p-4">
                  <p className="text-sm leading-7 text-slate-700">
                    <span className="font-black text-[#1F2933]">
                      {getUsername(profile)}
                    </span>{" "}
                    {post.caption}
                  </p>
                </div>
              )}

              {book && (
                <Link
                  href={`/kitap-ara?q=${encodeURIComponent(book.title || "")}`}
                  className="mt-4 flex items-center gap-3 rounded-[1.5rem] bg-[#FAF7F0] p-3 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
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

              <section className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                      Yorumlar
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      Gönderi sohbeti
                    </h2>
                  </div>

                  <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-xs font-black text-slate-500">
                    {comments.length}
                  </span>
                </div>

                {comments.length === 0 ? (
                  <div className="mt-4 rounded-[1.5rem] bg-[#FAF7F0] p-5 text-sm font-semibold leading-6 text-slate-500">
                    Henüz yorum yok. İlk yorumu sen yazabilirsin.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {comments.map((comment) => {
                      const commentProfile = first(comment.profiles);

                      return (
                        <div
                          key={comment.id}
                          className="flex gap-3 rounded-[1.5rem] bg-[#FAF7F0] p-3"
                        >
                          <Link
                            href={
                              commentProfile?.username
                                ? `/profil/${commentProfile.username}`
                                : "/akis"
                            }
                            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-lg"
                          >
                            {commentProfile?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={commentProfile.avatar_url}
                                alt={getProfileName(commentProfile)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "👤"
                            )}
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={
                                  commentProfile?.username
                                    ? `/profil/${commentProfile.username}`
                                    : "/akis"
                                }
                                className="text-sm font-black text-[#1F2933] hover:text-[#2E7D5B]"
                              >
                                {getProfileName(commentProfile)}
                              </Link>

                              {commentProfile?.verification_status ===
                                "verified" && <StudentVerifiedBadge />}

                              <span className="text-xs font-semibold text-slate-400">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>

                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <form
              action={createPostCommentAction}
              className="border-t border-slate-100 bg-white p-4"
            >
              <input type="hidden" name="postId" value={post.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`/gonderi/${post.id}`}
              />

              <div className="flex gap-2">
                <input
                  name="content"
                  required
                  maxLength={500}
                  placeholder="Yorum yaz..."
                  className="min-w-0 flex-1 rounded-full border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />

                <button
                  type="submit"
                  className="rounded-full bg-[#2E7D5B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Gönder
                </button>
              </div>
            </form>
          </section>
        </article>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Link
            href="/akis"
            className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <p className="text-2xl">🌿</p>
            <h3 className="mt-3 font-black">Akışa Dön</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Arkadaşlarının diğer paylaşımlarını gör.
            </p>
          </Link>

          <Link
            href="/paylas"
            className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <p className="text-2xl">📸</p>
            <h3 className="mt-3 font-black">Yeni Paylaşım</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Kendi kitap anını paylaş.
            </p>
          </Link>

          <Link
            href="/kitap-ara"
            className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <p className="text-2xl">🔎</p>
            <h3 className="mt-3 font-black">Kitap Ara</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Etiketlenen veya aradığın kitapları keşfet.
            </p>
          </Link>

          <Link
  href="/rastgele-raf"
  className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-lg"
>
  <p className="text-2xl">🎲</p>
  <h3 className="mt-3 font-black">Rastgele Raf</h3>
  <p className="mt-1 text-sm font-semibold text-slate-500">
    Yeni alıntılar keşfet ve favorilerine ekle.
  </p>
</Link>
        </div>
      </section>
    </main>
  );
}