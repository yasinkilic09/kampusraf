import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectIfBanned } from "@/lib/account-status";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { PageShortcuts } from "@/components/page-shortcuts";
import { AdSlot } from "@/components/ad-slot";
import { getDailyWordForUser } from "@/lib/daily-word";
import { shouldShowAdsForPlan } from "@/lib/monetization";
import { createPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "Kullanıcı Paneli",
  description:
    "KampüsRaf kullanıcı paneli; raf, sosyal akış, eşleşme, mesaj, bildirim ve paket alanlarını tek yerden yönetir.",
  path: "/dashboard",
});

function getDailyRollLimit(planType?: string | null) {
  if (planType === "plus") return 3;
  if (planType === "premium") return 10;
  if (planType === "pro") return 25;

  return 2;
}

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  plan_type: string | null;
  verification_status: string | null;
  trust_score: number | null;
  role: string | null;
};

type PostProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type SocialPost = {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  post_type: string | null;
  created_at: string;
  profiles: PostProfile | PostProfile[] | null;
  books:
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }[]
    | null;
  quote_items:
    | {
        id: string;
        quote_text: string;
        quote_text_tr: string | null;
        original_language: string | null;
        quote_books:
          | {
              title: string | null;
              author: string | null;
            }
          | {
              title: string | null;
              author: string | null;
            }[]
          | null;
      }
    | {
        id: string;
        quote_text: string;
        quote_text_tr: string | null;
        original_language: string | null;
        quote_books:
          | {
              title: string | null;
              author: string | null;
            }
          | {
              title: string | null;
              author: string | null;
            }[]
          | null;
      }[]
    | null;
};

type Friendship = {
  requester_id: string;
  addressee_id: string;
  status: string;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getDisplayName(profile: Profile | null, email?: string | null) {
  return profile?.full_name || profile?.username || email || "KampüsRaf kullanıcısı";
}

function getPlanLabel(planType?: string | null) {
  if (planType === "plus") return "Plus";
  if (planType === "premium") return "Premium";
  if (planType === "pro") return "Pro";
  return "Free";
}

function getVerificationLabel(status?: string | null) {
  if (status === "verified") return "Doğrulanmış Öğrenci";
  if (status === "pending") return "Doğrulama Bekliyor";
  if (status === "rejected") return "Doğrulama Reddedildi";
  return "Doğrulanmamış";
}

function getProfileName(profile: PostProfile | null) {
  return profile?.full_name || profile?.username || "KampüsRaf kullanıcısı";
}

function getPostKindLabel(post: SocialPost) {
  if (post.post_type === "quote") return "Alıntı";
  if (first(post.books)) return "Kitaplı";
  return "Gönderi";
}

function getPostPreviewText(post: SocialPost) {
  const quote = first(post.quote_items);
  const book = first(post.books);

  if (quote) return quote.quote_text_tr || quote.quote_text;
  if (post.caption) return post.caption;
  if (book?.title) return book.title;

  return "KampüsRaf paylaşımı";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  await redirectIfBanned();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    profileResult,
    myBooksResult,
    requestsResult,
    unreadMessagesResult,
    unreadNotificationsResult,
    myPostsResult,
    friendsResult,
    matchesResult,
    friendshipsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        username,
        email,
        avatar_url,
        plan_type,
        verification_status,
        trust_score,
        role
      `
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_books")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("book_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
    supabase
      .from("social_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    supabase
      .from("book_matches")
      .select("*", { count: "exact", head: true })
      .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`),
    supabase
      .from("friendships")
      .select("requester_id, addressee_id, status")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
  ]);

  const profile = profileResult.data as Profile | null;
  const myBooksCount = myBooksResult.count;
  const requestsCount = requestsResult.count;
  const unreadMessagesCount = unreadMessagesResult.count;
  const unreadNotificationsCount = unreadNotificationsResult.count;
  const myPostsCount = myPostsResult.count;
  const friendsCount = friendsResult.count;
  const matchesCount = matchesResult.count;
  const friendshipsData = friendshipsResult.data;

  const friendships = (friendshipsData || []) as Friendship[];

  const friendIds = friendships.map((friendship) =>
    friendship.requester_id === user.id
      ? friendship.addressee_id
      : friendship.requester_id
  );

  const visibleUserIds = Array.from(new Set([user.id, ...friendIds]));

  const recentPostSelect = `
      id,
      user_id,
      image_url,
      caption,
      post_type,
      created_at,
      profiles (
        id,
        full_name,
        username,
        avatar_url
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
        quote_books (
          title,
          author
        )
      )
    `;

  const [publicRecentPostsResult, visibleRecentPostsResult] = await Promise.all([
    supabase
      .from("social_posts")
      .select(recentPostSelect)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("social_posts")
      .select(recentPostSelect)
      .in("user_id", visibleUserIds)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const recentPostsById = new Map<string, SocialPost>();

  [
    ...(publicRecentPostsResult.data || []),
    ...(visibleRecentPostsResult.data || []),
  ].forEach((post) => {
    const socialPost = post as SocialPost;
    recentPostsById.set(socialPost.id, socialPost);
  });

  const recentPosts = Array.from(recentPostsById.values())
    .sort(
      (firstPost, secondPost) =>
        new Date(secondPost.created_at).getTime() -
        new Date(firstPost.created_at).getTime()
    )
    .slice(0, 4);

  const displayName = getDisplayName(profile, user.email);
  const isAdmin = profile?.role === "admin";
  const showAds = shouldShowAdsForPlan(profile?.plan_type);

  const primaryActions = [
    {
      title: "Akışa Git",
      description: "Arkadaşlarının kitap ve kampüs paylaşımlarını gör.",
      href: "/akis",
      icon: "🌿",
      tone: "primary",
    },
    {
      title: "Paylaş",
      description: "Fotoğraf, açıklama ve kitap etiketiyle gönderi oluştur.",
      href: "/paylas",
      icon: "📸",
      tone: "gold",
    },
    {
      title: "Kitap Ara",
      description: "Kampüste aradığın kitabı ve uygun öğrencileri bul.",
      href: "/kitap-ara",
      icon: "🔎",
      tone: "light",
    },
    {
      title: "Mesajlar",
      description: "Okunmamış mesajlarını ve konuşmalarını yönet.",
      href: "/mesajlar",
      icon: "💬",
      tone: "light",
      badge: unreadMessagesCount || 0,
    },
  ];

  const socialActions = [
    {
      title: "Arkadaşlar",
      href: "/arkadaslar",
      icon: "👥",
      description: "Arkadaşlık istekleri ve sosyal çevren.",
    },
    {
      title: "Bildirimler",
      href: "/bildirimler",
      icon: "🔔",
      description: "Mesaj, eşleşme, takas ve sosyal bildirimler.",
      badge: unreadNotificationsCount || 0,
    },
    {
      title: "Profilim",
      href: "/profilim",
      icon: "👤",
      description: "Profil, güven, sosyal görünürlük ve paket ayarları.",
    },
  ];

  const bookActions = [
    {
      title: "Rafım",
      href: "/kitaplarim",
      icon: "📚",
      description: "Eklediğin kitapları düzenle ve durumlarını takip et.",
    },
    {
      title: "Kitap Ekle",
      href: "/kitap-ekle",
      icon: "➕",
      description: "Rafına yeni kitap ekle veya katalogdan seç.",
    },
    {
      title: "Aradığım Kitaplar",
      href: "/aradigim-kitaplar",
      icon: "📌",
      description: "Bulamadığın kitapları takip listene ekle.",
    },
    {
      title: "Eşleşmeler",
      href: "/eslesmeler",
      icon: "✨",
      description: "Akıllı eşleşmeleri ve kitap fırsatlarını incele.",
      badge: matchesCount || 0,
    },
    {
      title: "Rastgele Raf",
      href: "/rastgele-raf",
      icon: "🎲",
      description: "Günlük zar hakkınla kısa kitap alıntıları keşfet ve dinle.",
    },
    {
      title: "Kelime Sözlüğü",
      href: "/kelime-sozlugu",
      icon: "K",
      description: "Her gün yeni bir kelimeyi anlamı ve örneğiyle keşfet.",
    },
    {
      title: "Takaslarım",
      href: "/takaslar",
      icon: "🤝",
      description: "Aktif ve geçmiş takas süreçlerini yönet.",
    },
    {
      title: "Doğrulama",
      href: "/ogrenci-dogrulama",
      icon: "🎓",
      description: "Öğrenci doğrulama durumunu kontrol et.",
    },
  ];

  const quotePlanType = profile?.plan_type || "free";
  const quoteRollsLimit = getDailyRollLimit(quotePlanType);
  const today = new Date().toISOString().slice(0, 10);

  const [quoteRollsResult, dailyWord] = await Promise.all([
    supabase
      .from("quote_rolls")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("roll_date", today),
    getDailyWordForUser(user.id),
  ]);

  const quoteRollsUsed = quoteRollsResult.count || 0;
  const remainingQuoteRolls = Math.max(quoteRollsLimit - quoteRollsUsed, 0);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <AppHeader
        subtitle="Sosyal kitap platformu"
        active="panel"
        isAdmin={isAdmin}
        actions={
          <>
            <Link
              href="/paylas"
              className="hidden rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 md:inline-flex"
            >
              Paylaş
            </Link>

            {profile?.username && (
              <Link
                href={`/profil/${profile.username}`}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-lg ring-1 ring-[#2E7D5B]/10"
                aria-label="Profilim"
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "P"
                )}
              </Link>
            )}
          </>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2.2rem]">
            <div className="relative p-6 md:p-10">
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-0 left-1/2 h-44 w-44 rounded-full bg-[#F59E0B]/20 blur-3xl" />

              <div className="relative">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Hoş geldin
                </p>

                <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
                  Bugün KampüsRaf’ta ne yapmak istiyorsun?
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  {displayName}, kitap ara, paylaşım yap, arkadaşlarının akışını
                  incele veya eşleşmelerinden yeni bir takas başlat.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/akis"
                    className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-1"
                  >
                    Akışa Git
                  </Link>

                  <Link
                    href="/paylas"
                    className="rounded-full bg-[#F59E0B] px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-1"
                  >
                    Fotoğraf Paylaş
                  </Link>

                  <Link
                    href="/kitap-ara"
                    className="rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/10"
                  >
                    Kitap Ara
                  </Link>

                  <Link
  href="/rastgele-raf"
  className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B] px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-1 hover:bg-[#d88906]"
>
  🎲 Rastgele Raf
</Link>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[1.8rem] bg-white p-5 shadow-sm md:rounded-[2.2rem] md:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-[#FAF7F0] text-3xl">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "👤"
                )}
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-xl font-black">{displayName}</h2>
                <p className="truncate text-xs font-black text-[#2E7D5B]">
                  @{profile?.username || "kullaniciadi"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-xs font-black text-slate-400">Paket</p>
                <p className="mt-1 text-lg font-black text-[#2E7D5B]">
                  {getPlanLabel(profile?.plan_type)}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-xs font-black text-slate-400">Güven</p>
                <p className="mt-1 text-lg font-black text-[#F59E0B]">
                  {profile?.trust_score || 0}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-[#FAF7F0] p-4">
              <p className="text-xs font-black text-slate-400">
                Doğrulama Durumu
              </p>
              <p className="mt-1 text-sm font-black text-[#1F2933]">
                {getVerificationLabel(profile?.verification_status)}
              </p>
            </div>

            <div className="mt-5 grid gap-2">
              {profile?.username && (
                <Link
                  href={`/profil/${profile.username}`}
                  className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Sosyal Profilimi Gör
                </Link>
              )}

              <Link
                href="/profilim"
                className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
              >
                Profil Ayarları
              </Link>
            </div>
          </aside>
        </div>

        {dailyWord ? (
          <Link
            href="/kelime-sozlugu"
            className="group mt-6 grid gap-4 overflow-hidden rounded-[1.8rem] bg-[#1F2933] p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 md:mt-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:rounded-[2rem] md:p-6"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F59E0B] px-3 py-1 text-xs font-black text-white">
                  Günün Kelimesi
                </span>
                {dailyWord.category ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-[#F5EBDD]">
                    {dailyWord.category}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                {dailyWord.word}
              </h2>
              <p className="mt-3 line-clamp-2 max-w-4xl text-sm font-semibold leading-6 text-white/72">
                {dailyWord.meaning}
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[1.4rem] bg-white/10 p-4 md:min-w-[240px]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F5EBDD]">
                  Kelime Sözlüğü
                </p>
                <p className="mt-1 text-sm font-black text-[#F59E0B]">
                  Anlamı ve örneği gör
                </p>
              </div>
              <span className="text-2xl font-black text-[#F59E0B] transition group-hover:translate-x-0.5">
                →
              </span>
            </div>
          </Link>
        ) : null}

        <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 lg:grid-cols-4">
          {primaryActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group rounded-[1.6rem] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:rounded-[1.8rem] ${
                action.tone === "primary"
                  ? "bg-[#2E7D5B] text-white"
                  : action.tone === "gold"
                    ? "bg-[#F59E0B] text-white"
                    : "bg-white text-[#1F2933]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-3xl">{action.icon}</span>

                {"badge" in action && action.badge ? (
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                    {action.badge}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-5 text-xl font-black">{action.title}</h2>
              <p
                className={`mt-2 text-sm leading-6 ${
                  action.tone === "light" ? "text-slate-500" : "text-white/75"
                }`}
              >
                {action.description}
              </p>
            </Link>
          ))}
        </section>

        {showAds ? (
          <AdSlot placement="dashboard-inline" className="mt-6 md:mt-8" />
        ) : null}

        <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm md:rounded-[1.8rem]">
            <p className="text-sm font-bold text-slate-500">Kitaplarım</p>
            <p className="mt-3 text-4xl font-black text-[#2E7D5B]">
              {myBooksCount || 0}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Rafındaki toplam kitap.
            </p>
          </div>

          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm md:rounded-[1.8rem]">
            <p className="text-sm font-bold text-slate-500">Aramalarım</p>
            <p className="mt-3 text-4xl font-black text-[#F59E0B]">
              {requestsCount || 0}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Takip ettiğin kitap talebi.
            </p>
          </div>

          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm md:rounded-[1.8rem]">
            <p className="text-sm font-bold text-slate-500">Eşleşmeler</p>
            <p className="mt-3 text-4xl font-black text-[#2E7D5B]">
              {matchesCount || 0}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Akıllı kitap fırsatları.
            </p>
          </div>

          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm md:rounded-[1.8rem]">
            <p className="text-sm font-bold text-slate-500">Arkadaş</p>
            <p className="mt-3 text-4xl font-black text-[#2E7D5B]">
              {friendsCount || 0}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Sosyal çevren.
            </p>
          </div>

          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm md:rounded-[1.8rem]">
            <p className="text-sm font-bold text-slate-500">Paylaşım</p>
            <p className="mt-3 text-4xl font-black text-[#F59E0B]">
              {myPostsCount || 0}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Oluşturduğun gönderiler.
            </p>
          </div>

          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm md:rounded-[1.8rem]">
             <p className="text-sm font-bold text-slate-500">Rastgele Raf</p>
             <p className="mt-3 text-4xl font-black text-[#F59E0B]">
              {remainingQuoteRolls}
            </p>
             <p className="mt-2 text-xs font-semibold text-slate-400">
              Bugünkü kalan zar hakkın.
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-[1.8rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  Sosyal
                </p>
                <h2 className="mt-2 text-2xl font-black">Son Paylaşımlar</h2>
              </div>

              <Link
                href="/akis"
                className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-[#2E7D5B] transition hover:bg-[#2E7D5B]/10"
              >
                Tüm Akış
              </Link>
            </div>

            {recentPosts.length === 0 ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#2E7D5B]/20 bg-[#FAF7F0] p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-3xl">
                  📸
                </div>
                <h3 className="mt-4 text-lg font-black">Akış henüz sessiz</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  İlk paylaşımı sen yapabilir veya arkadaş ekleyerek onların
                  paylaşımlarını ana panelinde görebilirsin.
                </p>

                <Link
                  href="/paylas"
                  className="mt-5 inline-flex rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  İlk Paylaşımı Yap
                </Link>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {recentPosts.map((post) => {
                  const postProfile = first(post.profiles);
                  const quoteItem = first(post.quote_items);
                  const quoteBook = first(quoteItem?.quote_books || null);
                  const postBook = first(post.books);
                  const previewText = getPostPreviewText(post);

                  return (
                    <Link
                      key={post.id}
                      href={`/gonderi/${post.id}`}
                      className="group overflow-hidden rounded-[1.4rem] bg-[#FAF7F0] transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      {post.image_url ? (
                        <div className="aspect-square overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.image_url}
                            alt={post.caption || "KampüsRaf paylaşımı"}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-square flex-col justify-between bg-[#2E7D5B] p-4 text-white">
                          <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-[10px] font-black">
                            {getPostKindLabel(post)}
                          </span>
                          <p className="line-clamp-5 text-sm font-black leading-6">
                            “{previewText}”
                          </p>
                          <p className="line-clamp-1 text-[11px] font-semibold text-white/65">
                            {quoteBook?.title ||
                              postBook?.title ||
                              "KampüsRaf paylaşımı"}
                          </p>
                        </div>
                      )}

                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="line-clamp-1 text-xs font-black text-[#1F2933]">
                            {getProfileName(postProfile)}
                          </p>
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#2E7D5B]">
                            {getPostKindLabel(post)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-500">
                          {previewText}
                        </p>
                        <p className="mt-2 text-[11px] font-semibold text-slate-400">
                          {formatDate(post.created_at)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid gap-6">
            <div className="rounded-[1.8rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                    Sosyal Alan
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Bağlantılar</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {socialActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center justify-between gap-3 rounded-[1.4rem] bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-2xl">{action.icon}</span>
                      <div className="min-w-0">
                        <p className="font-black text-[#1F2933]">
                          {action.title}
                        </p>
                        <p className="line-clamp-1 text-xs font-semibold text-slate-500">
                          {action.description}
                        </p>
                      </div>
                    </div>

                    {"badge" in action && action.badge ? (
                      <span className="rounded-full bg-[#F59E0B] px-3 py-1 text-xs font-black text-white">
                        {action.badge}
                      </span>
                    ) : (
                      <span className="text-slate-300">›</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <PageShortcuts
              eyebrow="Kitap & Takas"
              title="Hızlı Erişim"
              description="Raf, keşif, eşleşme ve takas adımlarına tek yerden geç."
              columns="two"
              compact
              items={bookActions.map((action) => ({
                ...action,
                badge: "badge" in action ? action.badge : null,
                tone:
                  action.href === "/rastgele-raf" ||
                  action.href === "/eslesmeler"
                    ? "amber"
                    : "green",
              }))}
            />
          </section>
        </div>

        {isAdmin && (
          <section className="mt-6 rounded-[1.8rem] border border-[#F59E0B]/20 bg-[#F59E0B]/10 p-5 md:mt-8 md:rounded-[2rem] md:p-7">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#B45309]">
                  Admin Paneli
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Platform yönetim alanın hazır.
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Kullanıcılar, doğrulamalar ve şikayetleri hızlıca yönetebilirsin.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/admin"
                  className="rounded-full bg-[#F59E0B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Admin Paneli
                </Link>
                <Link
                  href="/admin/sikayetler"
                  className="rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#B45309] transition hover:-translate-y-0.5"
                >
                  Şikayetler
                </Link>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
