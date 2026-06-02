import Link from "next/link";
import { redirect } from "next/navigation";
import { togglePostLikeAction } from "@/app/actions/social-posts";
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

type SocialPost = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  visibility: string;
  related_book_id: string | null;
  created_at: string;
  profiles: PostProfile | PostProfile[] | null;
  books: RelatedBook | RelatedBook[] | null;
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
    month: "long",
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
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📚
            </div>

            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Sosyal Akış
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/paylas"
              className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              Paylaş
            </Link>

            <Link
              href="/arkadaslar"
              className="hidden rounded-full border border-[#2E7D5B]/20 px-5 py-2.5 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5 sm:inline-flex"
            >
              Arkadaşlar
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2rem] md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Kampüs Akışı
          </p>

          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            Arkadaşlarının kitap anları.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">
            Arkadaşlarının paylaştığı fotoğrafları, kitap etiketlerini ve
            okuma anlarını burada görebilirsin.
          </p>
        </div>

        {params.success === "post-created" && (
          <div className="mt-5 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B]">
            Paylaşımın akışa eklendi.
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
            Akış yüklenirken hata oluştu: {error.message}
          </div>
        )}

        {!error && posts.length === 0 && (
          <div className="mt-6 rounded-[1.7rem] bg-white p-8 text-center shadow-sm md:rounded-[2rem] md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              📸
            </div>

            <h2 className="mt-5 text-2xl font-black">Akış henüz boş</h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              İlk paylaşımı sen yapabilir veya arkadaş ekleyerek onların kitap
              anlarını akışında görebilirsin.
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
          </div>
        )}

        <div className="mt-6 grid gap-6">
          {posts.map((post) => {
            const profile = first(post.profiles);
            const book = first(post.books);
            const isLiked = likedPostIds.has(post.id);

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm md:rounded-[2rem]"
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

                  <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-[11px] font-black text-slate-500">
                    {post.visibility === "public" ? "Herkese Açık" : "Arkadaşlar"}
                  </span>
                </div>

                <Link href={`/gonderi/${post.id}`} className="block bg-[#FAF7F0]">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img
    src={post.image_url}
                    alt="Paylaşım görseli"
                    className="max-h-[760px] w-full object-contain"
                  />
                </Link>

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

                    <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-600">
                      {likeCounts[post.id] || 0} beğeni
                    </span>

                    <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-600">
                      {commentCounts[post.id] || 0} yorum
                    </span>
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
                      href={`/kitap-ara?q=${encodeURIComponent(book.title || "")}`}
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
        </div>
      </section>
    </main>
  );
}