import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

type ProfileSocialPost = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  visibility: string;
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

function getFriendshipPairKey(userOneId: string, userTwoId: string) {
  return [userOneId, userTwoId].sort().join(":");
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
      description: "Bu kullanıcıya arkadaşlık isteği gönder.",
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
        description: "Karşı tarafın arkadaşlık isteğini kabul etmesi bekleniyor.",
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
    description: "Daha önceki istek kapandı. Yeniden istek gönderebilirsin.",
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
    const { data: postsData } = await supabase
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
        books (
          id,
          title,
          author,
          cover_url
        )
      `
      )
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(30);

    profilePosts = (postsData || []) as ProfileSocialPost[];
  }

  const visibleGender =
    profile.show_gender_on_profile === true
      ? getGenderLabel(profile.gender)
      : null;

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
              <p className="text-xs font-semibold text-slate-500">
                Sosyal Profil
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/akis" className="hover:text-[#2E7D5B]">
              Akış
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/arkadaslar" className="hover:text-[#2E7D5B]">
              Arkadaşlar
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm md:rounded-[2rem]">
          <div className="relative h-44 bg-[#2E7D5B] md:h-72">
            {profile.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.cover_url}
                alt={`${getDisplayName(profile)} kapak fotoğrafı`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2E7D5B] via-[#25684c] to-[#1F2933] text-sm font-black uppercase tracking-[0.22em] text-white/40">
                KampüsRaf Profili
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

            <div className="absolute -bottom-14 left-5 h-28 w-28 overflow-hidden rounded-[2rem] border-4 border-white bg-[#FAF7F0] shadow-xl md:-bottom-16 md:left-8 md:h-36 md:w-36 md:rounded-[2.4rem]">
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
          </div>

          <div className="px-5 pb-6 pt-20 md:px-8 md:pb-8 md:pt-24">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-3xl font-black tracking-tight md:text-5xl">
                    {getDisplayName(profile)}
                  </h1>

                  {profile.verification_status === "verified" && (
                    <StudentVerifiedBadge />
                  )}
                </div>

                <p className="mt-2 text-sm font-black text-[#2E7D5B] md:text-base">
                  {getUsernameLabel(profile)}
                </p>

                {profile.bio && (
                  <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-7 text-slate-600 md:text-base">
                    {profile.bio}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.show_university_on_profile !== false &&
                    profile.university && (
                      <span className="rounded-full bg-[#2E7D5B]/10 px-4 py-2 text-xs font-black text-[#2E7D5B]">
                        🎓 {profile.university}
                      </span>
                    )}

                  {profile.department && (
                    <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600">
                      {profile.department}
                    </span>
                  )}

                  {profile.show_city_on_profile !== false && profile.city && (
                    <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600">
                      📍 {profile.city}
                    </span>
                  )}

                  {visibleGender && (
                    <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600">
                      {visibleGender}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:flex sm:flex-wrap lg:justify-end">
                {friendshipState.type === "self" ? (
                  <Link
                    href="/profilim"
                    className="rounded-full bg-[#2E7D5B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                  >
                    Profil Ayarları
                  </Link>
                ) : friendshipState.type === "login" ? (
                  <Link
                    href="/auth/login"
                    className="rounded-full bg-[#2E7D5B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                  >
                    Giriş Yap
                  </Link>
                ) : friendshipState.type === "accepted" ? (
                  <Link
                    href="/arkadaslar"
                    className="rounded-full bg-[#F59E0B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                  >
                    Arkadaşsınız
                  </Link>
                ) : friendshipState.type === "incoming" ? (
                  <Link
                    href="/arkadaslar"
                    className="rounded-full bg-[#F59E0B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                  >
                    İsteği Yanıtla
                  </Link>
                ) : friendshipState.type === "disabled" ? (
                  <button
                    disabled
                    className="rounded-full border border-slate-200 px-6 py-3 text-sm font-black text-slate-400"
                  >
                    İstek Kapalı
                  </button>
                ) : (
                  <form action={sendFriendRequestAction}>
                    <input
                      type="hidden"
                      name="addresseeId"
                      value={profile.id}
                    />
                    <input
                      type="hidden"
                      name="redirectTo"
                      value={`/profil/${profile.username}`}
                    />

                    <button
                      type="submit"
                      disabled={friendshipState.type === "outgoing"}
                      className="w-full rounded-full bg-[#2E7D5B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {friendshipState.label}
                    </button>
                  </form>
                )}

                {user && user.id !== profile.id && (
                  <Link
                    href={`/mesajlar/kullanici/${profile.id}`}
                    className="rounded-full border border-[#2E7D5B]/20 px-6 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                  >
                    Mesaj Gönder
                  </Link>
                )}
              </div>
            </div>

            <p className="mt-4 text-xs font-semibold text-slate-400">
              {friendshipState.description}
            </p>

            <div className="mt-7 grid gap-3 md:grid-cols-4">
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
        </div>

        {!canView && (
          <section className="mt-6 rounded-[1.7rem] bg-white p-8 text-center shadow-sm md:mt-8 md:rounded-[2rem] md:p-12">
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
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] md:mt-8">
            <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
  <div className="flex items-center justify-between gap-3">
    <div>
      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
        Paylaşımlar
      </p>
      <h2 className="mt-2 text-2xl font-black">
        Fotoğraf Akışı
      </h2>
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
        Bu kullanıcının sosyal profilinde henüz fotoğraf paylaşımı görünmüyor.
      </p>

      {user?.id === profile.id && (
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

        return (
          <Link
  key={post.id}
  href={`/gonderi/${post.id}`}
  className="group relative aspect-square overflow-hidden rounded-2xl bg-[#FAF7F0]"
>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt={post.caption || "KampüsRaf paylaşımı"}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />

            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 via-black/10 to-transparent p-2 opacity-0 transition group-hover:opacity-100 md:p-3">
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
          </Link>
        );
      })}
    </div>
  )}
</section>
          </div>
        )}
      </section>
    </main>
  );
}