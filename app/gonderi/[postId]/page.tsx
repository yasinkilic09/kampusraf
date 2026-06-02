import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createPostCommentAction,
  togglePostLikeAction,
} from "@/app/actions/social-posts";
import { createClient } from "@/lib/supabase/server";
import { StudentVerifiedBadge } from "@/components/student-verified-badge";

type PostPageParams = {
  postId: string;
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

type PostCommentProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string | null;
};

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: PostCommentProfile | PostCommentProfile[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getProfileName(profile: PostProfile | PostCommentProfile | null) {
  return profile?.full_name || profile?.username || "KampüsRaf kullanıcısı";
}

function getUsername(profile: PostProfile | PostCommentProfile | null) {
  return profile?.username ? `@${profile.username}` : "@kampusraf";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
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
    .eq("id", postId)
    .maybeSingle();

  if (postError || !postData) {
    notFound();
  }

  const post = postData as SocialPost;
  const profile = first(post.profiles);
  const book = first(post.books);

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
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/akis" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📸
            </div>

            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Gönderi Detayı
              </p>
            </div>
          </Link>

          <Link
            href="/akis"
            className="rounded-full border border-[#2E7D5B]/20 px-5 py-2.5 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            Akışa Dön
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        <article className="grid overflow-hidden rounded-[1.7rem] bg-white shadow-sm md:rounded-[2rem] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex min-h-[360px] items-center justify-center bg-[#111827] lg:min-h-[720px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt={post.caption || "KampüsRaf gönderisi"}
              className="max-h-[760px] w-full object-contain"
            />
          </div>

          <div className="flex flex-col">
            <div className="border-b border-slate-100 p-5">
              <Link
                href={profile?.username ? `/profil/${profile.username}` : "/akis"}
                className="flex items-center gap-3"
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
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {post.caption && (
                <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4">
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

              <div className="mt-5 flex flex-wrap items-center gap-2">
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
              </div>

              <section className="mt-6">
                <h2 className="text-lg font-black">Yorumlar</h2>

                {comments.length === 0 ? (
                  <div className="mt-3 rounded-[1.4rem] bg-[#FAF7F0] p-4 text-sm font-semibold text-slate-500">
                    Henüz yorum yok. İlk yorumu sen yazabilirsin.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {comments.map((comment) => {
                      const commentProfile = first(comment.profiles);

                      return (
                        <div
                          key={comment.id}
                          className="flex gap-3 rounded-[1.4rem] bg-[#FAF7F0] p-3"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-lg">
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
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-[#1F2933]">
                                {getProfileName(commentProfile)}
                              </p>

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
              className="border-t border-slate-100 p-4"
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
          </div>
        </article>
      </section>
    </main>
  );
}