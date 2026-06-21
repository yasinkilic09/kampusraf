import Link from "next/link";
import { Fragment } from "react";
import { AppHeader } from "@/components/app-header";
import { redirect } from "next/navigation";
import {
  createPostCommentAction,
  deleteSocialPostAction,
  togglePostLikeAction,
  togglePostSaveAction,
} from "@/app/actions/social-posts";
import { createClient } from "@/lib/supabase/server";
import { AdSlot } from "@/components/ad-slot";
import { FeedShareButton } from "@/components/feed-share-button";
import { PageShortcuts } from "@/components/page-shortcuts";
import { StudentVerifiedBadge } from "@/components/student-verified-badge";
import { shouldShowAdsForPlan } from "@/lib/monetization";
import { absoluteUrl } from "@/lib/seo";

type SearchParams = {
  success?: string;
  scope?: string;
};

type PostProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string | null;
  university: string | null;
  plan_type?: string | null;
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

type PostSave = {
  id: string;
  post_id: string;
  user_id: string;
};

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: PostProfile | PostProfile[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getProfileName(profile: PostProfile | null) {
  return profile?.full_name || profile?.username || "KampusRaf kullanicisi";
}

function getUsername(profile: PostProfile | null) {
  return profile?.username ? `@${profile.username}` : "@kampusraf";
}

function getInitial(profile: PostProfile | null) {
  return (
    getProfileName(profile).trim().slice(0, 1).toLocaleUpperCase("tr-TR") ||
    "K"
  );
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

function groupCommentsByPostId(comments: PostComment[]) {
  return comments.reduce<Record<string, PostComment[]>>((acc, comment) => {
    acc[comment.post_id] = [...(acc[comment.post_id] || []), comment];
    return acc;
  }, {});
}

function getPostKindLabel(post: SocialPost, quoteItem: QuoteItem | null) {
  if (post.post_type === "quote" && quoteItem) return "Alinti";
  if (post.related_book_id) return "Kitapli gonderi";
  if (post.image_url) return "Foto";
  return "Gonderi";
}

function getPostShareText({
  profile,
  book,
  quoteItem,
}: {
  profile: PostProfile | null;
  book: RelatedBook | null;
  quoteItem: QuoteItem | null;
}) {
  const author = getProfileName(profile);
  const quote = quoteItem?.quote_text_tr || quoteItem?.quote_text;
  const title = book?.title || first(quoteItem?.quote_books)?.title;

  if (quote) return `${author} KampusRaf'ta bir alinti paylasti: "${quote}"`;
  if (title) return `${author} KampusRaf'ta ${title} hakkinda paylasti.`;
  return `${author} KampusRaf'ta bir gonderi paylasti.`;
}

function extractFeedTags(posts: SocialPost[]) {
  const counts = new Map<string, number>();

  posts.forEach((post) => {
    const quoteItem = first(post.quote_items);
    const tags = [
      ...(post.caption?.match(/#[\p{L}\p{N}_-]+/gu) || []),
      quoteItem?.topic ? `#${quoteItem.topic}` : "",
      quoteItem?.mood ? `#${quoteItem.mood}` : "",
      post.post_type === "quote" ? "#RastgeleRaf" : "",
    ]
      .map((tag) => tag.trim())
      .filter(Boolean);

    tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function getSafeScope(value?: string) {
  if (value === "friends" || value === "mine") return value;
  return "community";
}

function buildFeedUrl(scope: string) {
  return scope === "community" ? "/akis" : `/akis?scope=${scope}`;
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  const selectedScope = getSafeScope(params.scope);
  const currentFeedUrl = buildFeedUrl(selectedScope);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      "id, full_name, username, avatar_url, verification_status, university, plan_type"
    )
    .eq("id", user.id)
    .maybeSingle();

  const currentProfile = profileData as PostProfile | null;
  const showAds = shouldShowAdsForPlan(currentProfile?.plan_type);

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

  const socialPostSelect = `
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
    `;

  let postsData: SocialPost[] = [];
  let feedErrorMessage: string | null = null;

  if (selectedScope === "mine") {
    const { data, error } = await supabase
      .from("social_posts")
      .select(socialPostSelect)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    postsData = (data || []) as SocialPost[];
    feedErrorMessage = error?.message || null;
  } else if (selectedScope === "friends") {
    const { data, error } = await supabase
      .from("social_posts")
      .select(socialPostSelect)
      .in("user_id", visibleUserIds)
      .order("created_at", { ascending: false })
      .limit(50);

    postsData = (data || []) as SocialPost[];
    feedErrorMessage = error?.message || null;
  } else {
    const [publicResult, visibleResult] = await Promise.all([
      supabase
        .from("social_posts")
        .select(socialPostSelect)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("social_posts")
        .select(socialPostSelect)
        .in("user_id", visibleUserIds)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    feedErrorMessage =
      publicResult.error?.message || visibleResult.error?.message || null;

    const mergedPosts = new Map<string, SocialPost>();

    [...(publicResult.data || []), ...(visibleResult.data || [])].forEach(
      (post) => {
        const socialPost = post as SocialPost;
        mergedPosts.set(socialPost.id, socialPost);
      }
    );

    postsData = Array.from(mergedPosts.values())
      .sort(
        (firstPost, secondPost) =>
          new Date(secondPost.created_at).getTime() -
          new Date(firstPost.created_at).getTime()
      )
      .slice(0, 50);
  }

  const posts = postsData;
  const postIds = posts.map((post) => post.id);

  let likes: PostLike[] = [];
  let comments: PostComment[] = [];
  let saves: PostSave[] = [];
  let savesAvailable = true;

  if (postIds.length > 0) {
    const [likesResult, commentsResult, savesResult] = await Promise.all([
      supabase
        .from("post_likes")
        .select("id, post_id, user_id")
        .in("post_id", postIds),
      supabase
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
            verification_status,
            university
          )
        `
        )
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(150),
      supabase
        .from("post_saves")
        .select("id, post_id, user_id")
        .in("post_id", postIds),
    ]);

    likes = (likesResult.data || []) as PostLike[];
    comments = (commentsResult.data || []) as PostComment[];

    if (savesResult.error) {
      savesAvailable = false;
    } else {
      saves = (savesResult.data || []) as PostSave[];
    }
  }

  const { data: suggestedProfilesData } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, verification_status, university")
    .neq("id", user.id)
    .limit(16);

  const suggestedProfiles = ((suggestedProfilesData || []) as PostProfile[])
    .filter((profile) => !visibleUserIds.includes(profile.id))
    .slice(0, 5);

  const likeCounts = countByPostId(likes);
  const commentCounts = countByPostId(comments);
  const saveCounts = countByPostId(saves);
  const commentsByPostId = groupCommentsByPostId(comments);
  const likedPostIds = new Set(
    likes.filter((like) => like.user_id === user.id).map((like) => like.post_id)
  );
  const savedPostIds = new Set(
    saves.filter((save) => save.user_id === user.id).map((save) => save.post_id)
  );

  const storyProfileMap = new Map<string, PostProfile>();
  if (currentProfile) storyProfileMap.set(currentProfile.id, currentProfile);
  posts.forEach((post) => {
    const profile = first(post.profiles);
    if (profile) storyProfileMap.set(profile.id, profile);
  });
  const storyProfiles = Array.from(storyProfileMap.values()).slice(0, 10);
  const trendingTags = extractFeedTags(posts);
  const hotPosts = posts
    .map((post) => ({
      post,
      score: (likeCounts[post.id] || 0) * 2 + (commentCounts[post.id] || 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <AppHeader
        subtitle="Sosyal akis"
        active="akis"
        actions={
          <Link
            href="/paylas"
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            Paylas
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.68fr)_minmax(320px,0.32fr)]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.1rem]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/2 h-36 w-36 rounded-full bg-[#F59E0B]/20 blur-3xl" />

                <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                      KampusRaf Social
                    </p>

                    <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight md:text-5xl">
                      Kitaplardan dogan profesyonel sosyal akis.
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">
                      Hikayeler, kitapli gonderiler, alinti kartlari, yorumlar,
                      kaydetmeler ve kampus kesfi tek ekranda.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-72">
                    <div className="rounded-2xl bg-white/10 p-3 text-center">
                      <p className="text-2xl font-black">{posts.length}</p>
                      <p className="mt-1 text-[11px] font-bold text-white/65">
                        Gonderi
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-3 text-center">
                      <p className="text-2xl font-black">
                        {friendships.length}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-white/65">
                        Cevre
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-3 text-center">
                      <p className="text-2xl font-black">
                        {likes.length + comments.length}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-white/65">
                        Etkilesim
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {params.success === "post-created" && (
              <div className="rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B]">
                Paylasimin akisa eklendi.
              </div>
            )}

            {params.success === "quote-post-created" && (
              <div className="rounded-2xl bg-[#F59E0B]/10 p-4 text-sm font-black text-[#B45309]">
                Favori alintin akisa paylasildi.
              </div>
            )}

            {feedErrorMessage && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
                Akis yuklenirken hata olustu: {feedErrorMessage}
              </div>
            )}

            <section className="rounded-[1.8rem] bg-white p-4 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
              <div className="flex gap-4 overflow-x-auto pb-1">
                <Link href="/paylas" className="group min-w-[76px] text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2E7D5B] p-1 shadow-lg shadow-[#2E7D5B]/20">
                    <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-[#F5EBDD] text-lg font-black text-[#2E7D5B]">
                      +
                    </span>
                  </span>
                  <span className="mt-2 block truncate text-xs font-black text-[#1F2933]">
                    Sen
                  </span>
                </Link>

                {storyProfiles.map((profile) => (
                  <Link
                    key={profile.id}
                    href={profile.username ? `/profil/${profile.username}` : "/akis"}
                    className="group min-w-[76px] text-center"
                  >
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#2E7D5B] via-[#F59E0B] to-[#2E7D5B] p-1 shadow-sm">
                      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#FAF7F0] text-lg font-black text-[#2E7D5B]">
                        {profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatar_url}
                            alt={getProfileName(profile)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitial(profile)
                        )}
                      </span>
                    </span>
                    <span className="mt-2 block truncate text-xs font-black text-slate-600">
                      {profile.id === user.id ? "Sen" : getProfileName(profile)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-white p-4 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-lg font-black text-[#2E7D5B]">
                  {currentProfile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentProfile.avatar_url}
                      alt={getProfileName(currentProfile)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitial(currentProfile)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href="/paylas"
                    className="block rounded-[1.4rem] bg-[#FAF7F0] px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-[#EAF5EF]"
                  >
                    Bugun hangi kitap anini paylasmak istersin?
                  </Link>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/paylas"
                      className="rounded-full bg-[#2E7D5B] px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5"
                    >
                      Foto paylas
                    </Link>
                    <Link
                      href="/rastgele-raf"
                      className="rounded-full bg-[#FFF7E6] px-4 py-2 text-xs font-black text-[#B45309] transition hover:-translate-y-0.5"
                    >
                      Alinti paylas
                    </Link>
                    <Link
                      href="/topluluklar"
                      className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600 transition hover:-translate-y-0.5"
                    >
                      Topluluk kesfet
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-white p-4 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex rounded-full bg-[#FAF7F0] p-1">
                  {[
                    { label: "Topluluk", value: "community" },
                    { label: "Arkadaslar", value: "friends" },
                    { label: "Benim", value: "mine" },
                  ].map((scope) => {
                    const active = selectedScope === scope.value;

                    return (
                      <Link
                        key={scope.value}
                        href={buildFeedUrl(scope.value)}
                        className={`rounded-full px-4 py-2 text-xs font-black transition ${
                          active
                            ? "bg-[#2E7D5B] text-white shadow-sm"
                            : "text-slate-600 hover:bg-white"
                        }`}
                      >
                        {scope.label}
                      </Link>
                    );
                  })}
                </div>

                <p className="text-xs font-bold text-slate-500">
                  Akis, herkese acik paylasimlari ve arkadas cevrendeki kitap
                  anlarini harmanlar.
                </p>
              </div>
            </section>

            {showAds ? <AdSlot placement="feed-inline" /> : null}

            {!feedErrorMessage && posts.length === 0 && (
              <section className="rounded-[1.8rem] bg-white p-8 text-center shadow-sm md:rounded-[2rem] md:p-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
                  KR
                </div>

                <h2 className="mt-5 text-2xl font-black">Akis henuz bos</h2>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                  Ilk paylasimi sen yapabilir veya arkadas ekleyerek onlarin
                  kitap anlarini akisinda gorebilirsin.
                </p>

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/paylas"
                    className="rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                  >
                    Ilk Paylasimi Yap
                  </Link>

                  <Link
                    href="/arkadaslar"
                    className="rounded-full border border-[#2E7D5B]/20 px-6 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                  >
                    Arkadaslara Git
                  </Link>
                </div>
              </section>
            )}

            <section className="grid gap-6">
              {posts.map((post, index) => {
                const profile = first(post.profiles);
                const book = first(post.books);
                const quoteItem = first(post.quote_items);
                const quoteBook = first(quoteItem?.quote_books || null);
                const isLiked = likedPostIds.has(post.id);
                const isSaved = savedPostIds.has(post.id);
                const isMine = post.user_id === user.id;
                const isQuotePost =
                  post.post_type === "quote" && Boolean(quoteItem);
                const displayQuote =
                  quoteItem?.quote_text_tr || quoteItem?.quote_text || "";
                const postUrl = absoluteUrl(`/gonderi/${post.id}`);
                const postComments = (commentsByPostId[post.id] || []).slice(0, 2);

                return (
                  <Fragment key={post.id}>
                    {showAds && index > 0 && index % 6 === 0 ? (
                      <AdSlot placement="feed-inline" />
                    ) : null}

                    <article className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-xl md:rounded-[2rem]">
                      <div className="flex items-center justify-between gap-3 p-4 md:p-5">
                        <Link
                          href={
                            profile?.username
                              ? `/profil/${profile.username}`
                              : "/akis"
                          }
                          className="flex min-w-0 items-center gap-3"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#2E7D5B] via-[#F59E0B] to-[#2E7D5B] p-0.5">
                            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#FAF7F0] text-sm font-black text-[#2E7D5B]">
                              {profile?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={profile.avatar_url}
                                  alt={getProfileName(profile)}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitial(profile)
                              )}
                            </span>
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
                              {getUsername(profile)} ·{" "}
                              {profile?.university || "KampusRaf"} ·{" "}
                              {formatDate(post.created_at)}
                            </p>
                          </div>
                        </Link>

                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                          <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-[11px] font-black text-slate-500">
                            {getPostKindLabel(post, quoteItem)}
                          </span>

                          <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-[11px] font-black text-slate-500">
                            {post.visibility === "public"
                              ? "Herkese acik"
                              : "Arkadaslar"}
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
                            &ldquo;{displayQuote}&rdquo;
                          </p>

                          {quoteItem.original_language !== "tr" &&
                            quoteItem.quote_text_tr && (
                              <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F5EBDD]">
                                  Orijinal alinti
                                </p>
                                <p className="mt-2 text-sm font-semibold leading-6 text-white/75">
                                  &ldquo;{quoteItem.quote_text}&rdquo;
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
                          className="block bg-[#111827]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.image_url}
                            alt="Paylasim gorseli"
                            className="max-h-[820px] w-full object-contain"
                          />
                        </Link>
                      ) : null}

                      <div className="p-4 md:p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={togglePostLikeAction}>
                            <input type="hidden" name="postId" value={post.id} />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={currentFeedUrl}
                            />

                            <button
                              type="submit"
                              className={`rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${
                                isLiked
                                  ? "bg-red-50 text-red-600"
                                  : "bg-[#FAF7F0] text-[#1F2933]"
                              }`}
                            >
                              {isLiked ? "Begenildi" : "Begen"}
                            </button>
                          </form>

                          <Link
                            href={`/gonderi/${post.id}`}
                            className="rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-[#2E7D5B]/5"
                          >
                            {likeCounts[post.id] || 0} begeni
                          </Link>

                          <Link
                            href={`/gonderi/${post.id}`}
                            className="rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-[#2E7D5B]/5"
                          >
                            {commentCounts[post.id] || 0} yorum
                          </Link>

                          {savesAvailable ? (
                            <form action={togglePostSaveAction}>
                              <input
                                type="hidden"
                                name="postId"
                                value={post.id}
                              />
                              <input
                                type="hidden"
                                name="redirectTo"
                                value={currentFeedUrl}
                              />
                              <button
                                type="submit"
                                className={`rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${
                                  isSaved
                                    ? "bg-[#2E7D5B] text-white"
                                    : "bg-[#FAF7F0] text-slate-600"
                                }`}
                              >
                                {isSaved ? "Kaydedildi" : "Kaydet"}
                              </button>
                            </form>
                          ) : (
                            <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-400">
                              Kaydetme SQL bekliyor
                            </span>
                          )}

                          <FeedShareButton
                            url={postUrl}
                            title="KampusRaf gonderisi"
                            text={getPostShareText({
                              profile,
                              book,
                              quoteItem,
                            })}
                          />

                          {isMine && (
                            <form action={deleteSocialPostAction} className="ml-auto">
                              <input
                                type="hidden"
                                name="postId"
                                value={post.id}
                              />
                              <input
                                type="hidden"
                                name="redirectTo"
                                value={currentFeedUrl}
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

                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-slate-500">
                          <span>{saveCounts[post.id] || 0} kaydetme</span>
                          <span>·</span>
                          <span>{formatDate(post.created_at)}</span>
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
                                "KR"
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="line-clamp-1 text-sm font-black text-[#1F2933]">
                                {book.title || "Kitap etiketi"}
                              </p>
                              <p className="line-clamp-1 text-xs font-semibold text-slate-500">
                                {book.author || "Yazar belirtilmemis"}
                              </p>
                            </div>
                          </Link>
                        )}

                        {postComments.length > 0 && (
                          <div className="mt-4 grid gap-2">
                            {postComments.map((comment) => {
                              const commentProfile = first(comment.profiles);
                              return (
                                <Link
                                  key={comment.id}
                                  href={`/gonderi/${post.id}`}
                                  className="rounded-2xl bg-[#FAF7F0] px-4 py-3 text-sm leading-6 text-slate-600 transition hover:bg-[#EAF5EF]"
                                >
                                  <span className="font-black text-[#1F2933]">
                                    {getUsername(commentProfile)}
                                  </span>{" "}
                                  {comment.content}
                                </Link>
                              );
                            })}
                          </div>
                        )}

                        <form
                          action={createPostCommentAction}
                          className="mt-4 flex gap-2 rounded-full bg-[#FAF7F0] p-1"
                        >
                          <input type="hidden" name="postId" value={post.id} />
                          <input
                            type="hidden"
                            name="redirectTo"
                            value={currentFeedUrl}
                          />
                          <input
                            name="content"
                            maxLength={600}
                            placeholder="Yorum ekle..."
                            className="min-h-11 flex-1 rounded-full bg-transparent px-4 text-sm font-semibold outline-none placeholder:text-slate-400"
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-[#2E7D5B] px-5 text-sm font-black text-white transition hover:bg-[#25684c]"
                          >
                            Gonder
                          </button>
                        </form>
                      </div>
                    </article>
                  </Fragment>
                );
              })}
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-lg font-black text-[#2E7D5B]">
                  {currentProfile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentProfile.avatar_url}
                      alt={getProfileName(currentProfile)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitial(currentProfile)
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
                  Paylas
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

            {suggestedProfiles.length > 0 && (
              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                      Kesfet
                    </p>
                    <h2 className="mt-1 text-xl font-black">Onerilen okurlar</h2>
                  </div>
                  <Link
                    href="/arkadaslar"
                    className="text-xs font-black text-[#2E7D5B]"
                  >
                    Tumunu gor
                  </Link>
                </div>

                <div className="mt-4 grid gap-3">
                  {suggestedProfiles.map((profile) => (
                    <Link
                      key={profile.id}
                      href={profile.username ? `/profil/${profile.username}` : "/arkadaslar"}
                      className="flex items-center gap-3 rounded-[1.3rem] bg-[#FAF7F0] p-3 transition hover:-translate-y-0.5 hover:bg-[#EAF5EF]"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-sm font-black text-[#2E7D5B]">
                        {profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatar_url}
                            alt={getProfileName(profile)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitial(profile)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">
                          {getProfileName(profile)}
                        </span>
                        <span className="block truncate text-xs font-semibold text-slate-500">
                          {profile.university || getUsername(profile)}
                        </span>
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#2E7D5B]">
                        Profil
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {trendingTags.length > 0 && (
              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
                  Gunun etiketleri
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {trendingTags.map((item) => (
                    <span
                      key={item.tag}
                      className="rounded-full bg-[#EAF5EF] px-3 py-2 text-xs font-black text-[#2E7D5B]"
                    >
                      {item.tag} · {item.count}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {hotPosts.length > 0 && (
              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                  Populer
                </p>
                <div className="mt-4 grid gap-3">
                  {hotPosts.map(({ post, score }, index) => {
                    const profile = first(post.profiles);
                    return (
                      <Link
                        key={post.id}
                        href={`/gonderi/${post.id}`}
                        className="rounded-[1.3rem] bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5 hover:bg-[#EAF5EF]"
                      >
                        <p className="text-xs font-black text-[#F59E0B]">
                          #{index + 1} · {score} puan
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm font-black">
                          {post.caption ||
                            first(post.quote_items)?.quote_text_tr ||
                            first(post.quote_items)?.quote_text ||
                            "Kitap paylasimi"}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {getUsername(profile)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <PageShortcuts
              eyebrow="Sosyal kisayollar"
              title="Hizli erisim"
              description="Akistan sonra en sik kullanilan sosyal adimlara gec."
              compact
              items={[
                {
                  title: "Topluluklar",
                  href: "/topluluklar",
                  icon: "T",
                  description: "Okuma gruplari ve kampus raflarini kesfet.",
                  tone: "green",
                },
                {
                  title: "Arkadaslar",
                  href: "/arkadaslar",
                  icon: "K",
                  description: "Arkadaslik istekleri ve sosyal cevren.",
                },
                {
                  title: "Kitap Ara",
                  href: "/kitap-ara",
                  icon: "B",
                  description: "Aradigin kitabi kampuste bul.",
                },
                {
                  title: "Rastgele Raf",
                  href: "/rastgele-raf",
                  icon: "Z",
                  description: "Alinti kesfet, favorile ve akista paylas.",
                  tone: "amber",
                },
                {
                  title: "Mesajlar",
                  href: "/mesajlar",
                  icon: "M",
                  description: "Kitap ve takas sohbetlerini yonet.",
                },
              ]}
            />

            {showAds ? <AdSlot placement="feed-sidebar" compact /> : null}

            <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem]">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F5EBDD]">
                Profesyonel akis ipucu
              </p>
              <h2 className="mt-2 text-xl font-black">
                Paylasimlarini kitapla etiketle.
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/75">
                Kitap etiketi olan gonderiler sosyal profilinde daha anlamli
                durur, arama ve kesif alanlarinda daha guclu gorunur.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
