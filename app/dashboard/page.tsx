import Link from "next/link";
import { redirect } from "next/navigation";
import { redirectIfBanned } from "@/lib/account-status";
import { createClient } from "@/lib/supabase/server";

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
  image_url: string;
  caption: string | null;
  created_at: string;
  profiles: PostProfile | PostProfile[] | null;
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

  const { data: profileData } = await supabase
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
    .maybeSingle();

  const profile = profileData as Profile | null;

  const { count: myBooksCount } = await supabase
    .from("user_books")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: requestsCount } = await supabase
    .from("book_requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: unreadMessagesCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  const { count: unreadNotificationsCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  const { count: myPostsCount } = await supabase
    .from("social_posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: friendsCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const { count: matchesCount } = await supabase
    .from("book_matches")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`);

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

  const { data: recentPostsData } = await supabase
    .from("social_posts")
    .select(
      `
      id,
      user_id,
      image_url,
      caption,
      created_at,
      profiles (
        id,
        full_name,
        username,
        avatar_url
      )
    `
    )
    .in("user_id", visibleUserIds)
    .order("created_at", { ascending: false })
    .limit(4);

  const recentPosts = (recentPostsData || []) as SocialPost[];

  const displayName = getDisplayName(profile, user.email);
  const isAdmin = profile?.role === "admin";

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

  const { count: quoteRollsCount } = await supabase
    .from("quote_rolls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("roll_date", today);

  const quoteRollsUsed = quoteRollsCount || 0;
  const remainingQuoteRolls = Math.max(quoteRollsLimit - quoteRollsUsed, 0);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📚
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Sosyal kitap platformu
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 lg:flex">
            <Link href="/akis" className="hover:text-[#2E7D5B]">
              Akış
            </Link>
            <Link href="/paylas" className="hover:text-[#2E7D5B]">
              Paylaş
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
            <Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
              Eşleşmeler
            </Link>
            <Link href="/rastgele-raf" className="hover:text-[#2E7D5B]">
  Rastgele Raf
</Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-[#F59E0B] hover:text-[#B45309]">
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
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
              >
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "👤"
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

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

                  return (
                    <Link
                      key={post.id}
                      href={`/gonderi/${post.id}`}
                      className="group overflow-hidden rounded-[1.4rem] bg-[#FAF7F0] transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="aspect-square overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.image_url}
                          alt={post.caption || "KampüsRaf paylaşımı"}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>

                      <div className="p-3">
                        <p className="line-clamp-1 text-xs font-black text-[#1F2933]">
                          {getProfileName(postProfile)}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400">
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

            <div className="rounded-[1.8rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  Kitap & Takas
                </p>
                <h2 className="mt-2 text-2xl font-black">Hızlı Erişim</h2>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {bookActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="rounded-[1.4rem] bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-2xl">{action.icon}</span>

                      {"badge" in action && action.badge ? (
                        <span className="rounded-full bg-[#2E7D5B] px-2.5 py-1 text-[11px] font-black text-white">
                          {action.badge}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-sm font-black text-[#1F2933]">
                      {action.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                      {action.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
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