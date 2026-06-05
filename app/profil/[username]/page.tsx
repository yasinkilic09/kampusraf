import Link from "next/link";
import { notFound } from "next/navigation";
import { sendFriendRequestAction } from "@/app/actions/friends";
import { createClient } from "@/lib/supabase/server";
import { StudentVerifiedBadge } from "@/components/student-verified-badge";

type ProfilePageParams = {
  username: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  university: string | null;
  department: string | null;
  city: string | null;
  bio: string | null;
  trust_score: number | null;
  is_verified: boolean | null;
  verification_status: string | null;
  completed_exchange_count: number | null;
  response_score: number | null;
  account_status: string | null;
  gender: string | null;
  show_gender_on_profile: boolean | null;
  profile_visibility: string | null;
  allow_friend_requests: boolean | null;
  show_books_on_profile: boolean | null;
  show_city_on_profile: boolean | null;
  show_university_on_profile: boolean | null;
};

type FriendshipSummary = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

type UserBook = {
  id: string;
  custom_title: string | null;
  custom_author: string | null;
  condition: string | null;
  exchange_type: string | null;
  status: string | null;
  created_at: string;
  books:
    | {
        id: string;
        title: string | null;
        author: string | null;
        category: string | null;
        cover_url: string | null;
      }
    | {
        id: string;
        title: string | null;
        author: string | null;
        category: string | null;
        cover_url: string | null;
      }[]
    | null;
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

type ProfileSocialPost = {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  visibility: string;
  post_type: string | null;
  quote_id: string | null;
  related_book_id: string | null;
  created_at: string;
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
  quote_items: QuoteItem | QuoteItem[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getDisplayName(profile: Profile) {
  return profile.full_name || profile.username || "KampüsRaf kullanıcısı";
}

function getUsernameLabel(profile: Profile) {
  return profile.username ? `@${profile.username}` : "@kampusraf";
}

function getInitial(profile: Profile) {
  const name = getDisplayName(profile).trim();
  return name.charAt(0).toUpperCase() || "K";
}

function getGenderLabel(gender?: string | null) {
  if (gender === "male") return "Erkek";
  if (gender === "female") return "Kadın";
  return null;
}

function getConditionLabel(condition?: string | null) {
  if (condition === "new") return "Yeni";
  if (condition === "like_new") return "Yeni gibi";
  if (condition === "good") return "İyi";
  if (condition === "fair") return "Orta";
  if (condition === "worn") return "Yıpranmış";
  return "Belirtilmemiş";
}

function getExchangeTypeLabel(exchangeType?: string | null) {
  if (exchangeType === "borrow") return "Ödünç";
  if (exchangeType === "swap") return "Takas";
  if (exchangeType === "sell") return "Satış";
  if (exchangeType === "donate") return "Bağış";
  return "Paylaşım";
}

function getVisibilityLabel(visibility?: string | null) {
  if (visibility === "public") return "Herkese Açık";
  if (visibility === "private") return "Gizli Profil";
  return "Arkadaşlara Açık";
}

function getFriendshipViewState(
  friendship: FriendshipSummary | null,
  currentUserId: string | null,
  targetProfile: Profile
) {
  if (!currentUserId) {
    return {
      label: "Giriş Yap",
      description: "Arkadaşlık isteği göndermek için giriş yapmalısın.",
      type: "login",
    };
  }

  if (currentUserId === targetProfile.id) {
    return {
      label: "Profil Ayarları",
      description: "Bu senin sosyal profilin.",
      type: "self",
    };
  }

  if (targetProfile.allow_friend_requests === false) {
    return {
      label: "İstek Kapalı",
      description: "Bu kullanıcı yeni arkadaşlık isteği almıyor.",
      type: "disabled",
    };
  }

  if (!friendship) {
    return {
      label: "Arkadaş Ekle",
      description: "Bu kullanıcıya arkadaşlık isteği gönderebilirsin.",
      type: "send",
    };
  }

  if (friendship.status === "accepted") {
    return {
      label: "Arkadaşsınız",
      description: "Bu kullanıcı arkadaş listende.",
      type: "accepted",
    };
  }

  if (friendship.status === "pending") {
    if (friendship.requester_id === currentUserId) {
      return {
        label: "İstek Gönderildi",
        description: "Karşı tarafın isteğini kabul etmesi bekleniyor.",
        type: "outgoing",
      };
    }

    return {
      label: "İsteği Yanıtla",
      description: "Bu kullanıcı sana arkadaşlık isteği göndermiş.",
      type: "incoming",
    };
  }

  return {
    label: "Tekrar Arkadaş Ekle",
    description: "Yeniden arkadaşlık isteği gönderebilirsin.",
    type: "send",
  };
}

function canViewFullProfile({
  profile,
  currentUserId,
  friendship,
}: {
  profile: Profile;
  currentUserId: string | null;
  friendship: FriendshipSummary | null;
}) {
  const visibility = profile.profile_visibility || "friends";

  if (currentUserId === profile.id) return true;
  if (visibility === "public") return true;
  if (visibility === "private") return false;

  return friendship?.status === "accepted";
}

function getVisibilityMessage(profile: Profile) {
  if (profile.profile_visibility === "private") {
    return "Bu kullanıcı sosyal profilini gizli tutuyor.";
  }

  return "Bu profil sadece arkadaşlara açık. Profil detaylarını görmek için arkadaşlık isteği gönderebilirsin.";
}

function getTrustLabel(profile: Profile) {
  const trustScore = profile.trust_score || 0;

  if (profile.verification_status === "verified" && trustScore >= 80) {
    return "Güçlü Takas Profili";
  }

  if ((profile.completed_exchange_count || 0) >= 5) {
    return "Deneyimli Takasçı";
  }

  if (trustScore < 40) {
    return "Yeni / Gelişen Profil";
  }

  return "Güven Profili Aktif";
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<ProfilePageParams>;
}) {
  const { username } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const safeUsername = decodeURIComponent(username).trim();

  if (!safeUsername) {
    notFound();
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      username,
      email,
      avatar_url,
      cover_url,
      university,
      department,
      city,
      bio,
      trust_score,
      is_verified,
      verification_status,
      completed_exchange_count,
      response_score,
      account_status,
      gender,
      show_gender_on_profile,
      profile_visibility,
      allow_friend_requests,
      show_books_on_profile,
      show_city_on_profile,
      show_university_on_profile
    `
    )
    .eq("username", safeUsername)
    .maybeSingle();

  if (profileError || !profileData) {
    notFound();
  }

  const profile = profileData as Profile;

  if (profile.account_status === "banned") {
    notFound();
  }

  let friendship: FriendshipSummary | null = null;

  if (user && user.id !== profile.id) {
    const { data: friendshipData } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

    friendship = friendshipData as FriendshipSummary | null;
  }

  const friendshipState = getFriendshipViewState(
    friendship,
    user?.id || null,
    profile
  );

  const canView = canViewFullProfile({
    profile,
    currentUserId: user?.id || null,
    friendship,
  });

  const { count: friendsCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`)
    .eq("status", "accepted");

  const { count: booksCount } = await supabase
    .from("user_books")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("status", "available");

  let userBooks: UserBook[] = [];

  if (canView && profile.show_books_on_profile !== false) {
    const { data: userBooksData } = await supabase
      .from("user_books")
      .select(
        `
        id,
        custom_title,
        custom_author,
        condition,
        exchange_type,
        status,
        created_at,
        books (
          id,
          title,
          author,
          category,
          cover_url
        )
      `
      )
      .eq("user_id", profile.id)
      .eq("status", "available")
      .order("created_at", { ascending: false })
      .limit(8);

    userBooks = (userBooksData || []) as UserBook[];
  }

  let profilePosts: ProfileSocialPost[] = [];

  if (canView) {
    let postsQuery = supabase
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
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (user?.id !== profile.id && friendship?.status !== "accepted") {
      postsQuery = postsQuery.eq("visibility", "public");
    }

    const { data: postsData } = await postsQuery;

    profilePosts = (postsData || []) as ProfileSocialPost[];
  }

  const visibleGender =
    profile.show_gender_on_profile === true
      ? getGenderLabel(profile.gender)
      : null;

  const isOwnProfile = user?.id === profile.id;

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              👤
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Sosyal profil
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
            <Link href="/arkadaslar" className="hover:text-[#2E7D5B]">
              Arkadaşlar
            </Link>
            <Link href="/rastgele-raf" className="hover:text-[#2E7D5B]">
              Rastgele Raf
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
        <section className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2.2rem]">
          <div className="relative h-48 bg-[#2E7D5B] md:h-80">
            {profile.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.cover_url}
                alt={`${getDisplayName(profile)} kapak fotoğrafı`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#2E7D5B] via-[#25684c] to-[#111827]">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/2 h-48 w-48 rounded-full bg-[#F59E0B]/20 blur-3xl" />
                <p className="relative text-sm font-black uppercase tracking-[0.28em] text-white/45">
                  KampüsRaf Profili
                </p>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
              <div className="flex min-w-0 items-end gap-4">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[2rem] border-4 border-white bg-[#FAF7F0] shadow-xl md:h-36 md:w-36 md:rounded-[2.4rem]">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={`${getDisplayName(profile)} profil fotoğrafı`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-black text-[#2E7D5B]">
                      {getInitial(profile)}
                    </div>
                  )}
                </div>

                <div className="hidden min-w-0 pb-2 text-white md:block">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-4xl font-black tracking-tight">
                      {getDisplayName(profile)}
                    </h1>

                    {profile.verification_status === "verified" && (
                      <StudentVerifiedBadge />
                    )}
                  </div>

                  <p className="mt-1 text-sm font-black text-white/75">
                    {getUsernameLabel(profile)}
                  </p>
                </div>
              </div>

              <span className="hidden rounded-full bg-white/90 px-4 py-2 text-xs font-black text-[#1F2933] md:inline-flex">
                {getVisibilityLabel(profile.profile_visibility)}
              </span>
            </div>
          </div>

          <div className="p-5 md:p-8">
            <div className="md:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-3xl font-black tracking-tight">
                  {getDisplayName(profile)}
                </h1>

                {profile.verification_status === "verified" && (
                  <StudentVerifiedBadge />
                )}
              </div>

              <p className="mt-2 text-sm font-black text-[#2E7D5B]">
                {getUsernameLabel(profile)}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                {profile.bio && canView && (
                  <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-600 md:text-base">
                    {profile.bio}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.show_university_on_profile !== false &&
                    profile.university &&
                    canView && (
                      <span className="rounded-full bg-[#2E7D5B]/10 px-4 py-2 text-xs font-black text-[#2E7D5B]">
                        🎓 {profile.university}
                      </span>
                    )}

                  {profile.department && canView && (
                    <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600">
                      {profile.department}
                    </span>
                  )}

                  {profile.show_city_on_profile !== false &&
                    profile.city &&
                    canView && (
                      <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600">
                        📍 {profile.city}
                      </span>
                    )}

                  {visibleGender && canView && (
                    <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600">
                      {visibleGender}
                    </span>
                  )}

                  <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600">
                    {getVisibilityLabel(profile.profile_visibility)}
                  </span>
                </div>

                <p className="mt-4 text-xs font-semibold text-slate-400">
                  {friendshipState.description}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-[360px] lg:justify-end">
  {friendshipState.type === "self" ? (
    <Link
      href="/profilim"
      className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#2E7D5B] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#25684c]"
    >
      Profil Ayarları
    </Link>
  ) : friendshipState.type === "login" ? (
    <Link
      href="/auth/login"
      className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#2E7D5B] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#25684c]"
    >
      Giriş Yap
    </Link>
  ) : friendshipState.type === "accepted" ? (
    <Link
      href="/arkadaslar"
      className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#F59E0B] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
    >
      Arkadaşsınız
    </Link>
  ) : friendshipState.type === "incoming" ? (
    <Link
      href="/arkadaslar"
      className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#F59E0B] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
    >
      İsteği Yanıtla
    </Link>
  ) : friendshipState.type === "disabled" ? (
    <button
      disabled
      className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-400"
    >
      İstek Kapalı
    </button>
  ) : (
    <form action={sendFriendRequestAction} className="sm:inline-flex">
      <input type="hidden" name="addresseeId" value={profile.id} />
      <input
        type="hidden"
        name="redirectTo"
        value={`/profil/${profile.username}`}
      />

      <button
        type="submit"
        disabled={friendshipState.type === "outgoing"}
        className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#2E7D5B] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {friendshipState.label}
      </button>
    </form>
  )}

  {user && user.id !== profile.id && (
    <Link
      href={`/mesajlar/kullanici/${profile.id}`}
      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#2E7D5B]/20 bg-white px-5 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
    >
      Mesaj Gönder
    </Link>
  )}

  {isOwnProfile && (
    <Link
      href="/paylas"
      className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-5 text-sm font-black text-[#B45309] transition hover:-translate-y-0.5 hover:bg-[#F59E0B]/15"
    >
      Paylaşım Yap
    </Link>
  )}
</div>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-5">
              <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Paylaşım
                </p>
                <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                  {profilePosts.length}
                </p>
              </div>

              <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Kitap
                </p>
                <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                  {booksCount || 0}
                </p>
              </div>

              <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Arkadaş
                </p>
                <p className="mt-2 text-2xl font-black text-[#F59E0B]">
                  {friendsCount || 0}
                </p>
              </div>

              <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Güven
                </p>
                <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                  {profile.trust_score || 0}
                </p>
              </div>

              <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Takas
                </p>
                <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                  {profile.completed_exchange_count || 0}
                </p>
              </div>
            </div>
          </div>
        </section>

        {!canView && (
          <section className="mt-6 rounded-[1.8rem] bg-white p-8 text-center shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem] md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              🔒
            </div>

            <h2 className="mt-5 text-2xl font-black">Profil sınırlı</h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              {getVisibilityMessage(profile)}
            </p>
          </section>
        )}

        {canView && (
          <div className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                    Paylaşımlar
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Sosyal Akış</h2>
                </div>

                <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-500">
                  {profilePosts.length} gönderi
                </span>
              </div>

              {profilePosts.length === 0 ? (
                <div className="mt-6 rounded-[1.7rem] border border-dashed border-[#2E7D5B]/20 bg-[#FAF7F0] p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl">
                    📸
                  </div>

                  <h3 className="mt-5 text-xl font-black">
                    Henüz paylaşım yok
                  </h3>

                  <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500">
                    Bu kullanıcının sosyal profilinde henüz paylaşım
                    görünmüyor.
                  </p>

                  {isOwnProfile && (
                    <Link
                      href="/paylas"
                      className="mt-6 inline-flex rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                    >
                      İlk Paylaşımı Yap
                    </Link>
                  )}
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-3 gap-2 md:gap-3">
                  {profilePosts.map((post) => {
                    const book = first(post.books);
                    const quoteItem = first(post.quote_items);
                    const quoteBook = first(quoteItem?.quote_books || null);
                    const isQuotePost =
                      post.post_type === "quote" && Boolean(quoteItem);
                    const displayQuote =
                      quoteItem?.quote_text_tr || quoteItem?.quote_text || "";

                    return (
                      <Link
                        key={post.id}
                        href={`/gonderi/${post.id}`}
                        className={`group relative aspect-square overflow-hidden rounded-2xl ${
                          isQuotePost ? "bg-[#2E7D5B]" : "bg-[#FAF7F0]"
                        }`}
                      >
                        {isQuotePost && quoteItem ? (
                          <div className="flex h-full w-full flex-col justify-between p-3 text-white md:p-4">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-[#F59E0B] px-2 py-1 text-[9px] font-black text-white md:text-[10px]">
                                🎲 Alıntı
                              </span>

                              {quoteItem.mood && (
                                <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-black md:text-[10px]">
                                  {quoteItem.mood}
                                </span>
                              )}
                            </div>

                            <div>
                              <p className="line-clamp-5 text-sm font-black leading-5 md:text-base md:leading-6">
                                “{displayQuote}”
                              </p>

                              <div className="mt-3 rounded-xl bg-white/10 px-3 py-2">
                                <p className="line-clamp-1 text-[10px] font-black text-white md:text-xs">
                                  {quoteBook?.title || "Kitap bilgisi yok"}
                                </p>
                                <p className="line-clamp-1 text-[9px] font-semibold text-white/60 md:text-[10px]">
                                  {quoteBook?.author || "Yazar bilgisi yok"}
                                </p>
                              </div>
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 opacity-0 transition group-hover:opacity-100" />
                          </div>
                        ) : post.image_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={post.image_url}
                              alt={post.caption || "KampüsRaf paylaşımı"}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />

                            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-2 opacity-0 transition group-hover:opacity-100 md:p-3">
                              {post.caption && (
                                <p className="line-clamp-2 text-[11px] font-bold leading-4 text-white md:text-xs">
                                  {post.caption}
                                </p>
                              )}

                              {book && (
                                <div className="mt-2 rounded-xl bg-white/90 px-2 py-1">
                                  <p className="line-clamp-1 text-[10px] font-black text-[#1F2933] md:text-[11px]">
                                    📖 {book.title || "Kitap etiketi"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-slate-400">
                            <p className="text-3xl">📭</p>
                            <p className="mt-2 text-xs font-black">
                              İçerik görüntülenemiyor
                            </p>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                  Güven Profili
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {getTrustLabel(profile)}
                </h2>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black text-slate-400">
                      Güven Puanı
                    </p>
                    <p className="mt-1 text-3xl font-black text-[#2E7D5B]">
                      {profile.trust_score || 0}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4">
                      <p className="text-xs font-black text-slate-400">
                        Tamamlanan Takas
                      </p>
                      <p className="mt-1 text-2xl font-black text-[#F59E0B]">
                        {profile.completed_exchange_count || 0}
                      </p>
                    </div>

                    <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4">
                      <p className="text-xs font-black text-slate-400">
                        Yanıt Skoru
                      </p>
                      <p className="mt-1 text-2xl font-black text-[#2E7D5B]">
                        {profile.response_score || 0}
                      </p>
                    </div>
                  </div>

                  {profile.verification_status === "verified" ? (
                    <div className="rounded-[1.4rem] bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B]">
                      🎓 Doğrulanmış öğrenci profili.
                    </div>
                  ) : (
                    <div className="rounded-[1.4rem] bg-[#FAF7F0] p-4 text-sm font-semibold leading-6 text-slate-500">
                      Bu kullanıcı henüz öğrenci doğrulamasını tamamlamamış.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                      Kitaplar
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Rafından</h2>
                  </div>

                  <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-500">
                    {booksCount || 0}
                  </span>
                </div>

                {profile.show_books_on_profile === false ? (
                  <div className="mt-5 rounded-[1.5rem] bg-[#FAF7F0] p-5 text-sm font-semibold leading-6 text-slate-500">
                    Bu kullanıcı kitaplarını profilinde göstermemeyi seçmiş.
                  </div>
                ) : userBooks.length === 0 ? (
                  <div className="mt-5 rounded-[1.5rem] bg-[#FAF7F0] p-5 text-sm font-semibold leading-6 text-slate-500">
                    Şu anda profilde gösterilecek aktif kitap yok.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {userBooks.map((userBook) => {
                      const book = first(userBook.books);
                      const title =
                        userBook.custom_title || book?.title || "Kitap";
                      const author =
                        userBook.custom_author ||
                        book?.author ||
                        "Yazar belirtilmemiş";

                      return (
                        <Link
                          key={userBook.id}
                          href={`/kitaplar/${userBook.id}`}
                          className="flex items-center gap-3 rounded-[1.4rem] bg-[#FAF7F0] p-3 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                        >
                          <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-xl">
                            {book?.cover_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={book.cover_url}
                                alt={title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "📖"
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-black text-[#1F2933]">
                              {title}
                            </p>
                            <p className="line-clamp-1 text-xs font-semibold text-slate-500">
                              {author}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                                {getExchangeTypeLabel(userBook.exchange_type)}
                              </span>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                                {getConditionLabel(userBook.condition)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}