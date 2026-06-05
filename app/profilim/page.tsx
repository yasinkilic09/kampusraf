import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction, updateProfileAction } from "@/app/actions/profile";
import { updateSocialProfileAction } from "@/app/actions/social-profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileTrustCard } from "@/components/profile-trust-card";

type SearchParams = {
  success?: string;
  error?: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  profile_visibility: string | null;
  allow_friend_requests: boolean | null;
  show_books_on_profile: boolean | null;
  show_city_on_profile: boolean | null;
  show_university_on_profile: boolean | null;
  social_profile_updated_at: string | null;
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
  plan_type: string | null;
  plan_status: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  monthly_book_limit: number | null;
  monthly_request_limit: number | null;
  monthly_message_limit: number | null;
  monthly_match_limit: number | null;
  gender: string | null;
  match_gender_preference: string | null;
  show_gender_on_profile: boolean | null;
  match_preferences_updated_at: string | null;
};

function getPlanLabel(planType?: string | null) {
  if (planType === "plus") return "Plus Paket";
  if (planType === "premium") return "Premium Paket";
  if (planType === "pro") return "Pro Paket";
  return "Ücretsiz Paket";
}

function getPlanDescription(planType?: string | null) {
  if (planType === "plus") {
    return "Daha fazla kitap, daha fazla mesaj ve gelişmiş eşleşme özellikleri için orta seviye paket.";
  }

  if (planType === "premium") {
    return "Yoğun kullanan öğrenciler için daha yüksek limitler ve gelişmiş görünürlük özellikleri.";
  }

  if (planType === "pro") {
    return "Topluluk, kulüp veya kampüs temsilcileri için gelişmiş kullanım paketi.";
  }

  return "Başlangıç seviyesi. Temel kitap ekleme, arama, mesajlaşma ve eşleşme özellikleri.";
}

function canUseGenderMatchPreference(planType?: string | null) {
  return planType === "premium" || planType === "pro";
}

function getGenderLabel(gender?: string | null) {
  if (gender === "male") return "Erkek";
  if (gender === "female") return "Kadın";
  return "Belirtmek istemiyorum";
}

function getMatchGenderPreferenceLabel(preference?: string | null) {
  if (preference === "male") return "Erkek kullanıcılar";
  if (preference === "female") return "Kadın kullanıcılar";
  return "Herkes";
}

function getProfileVisibilityLabel(value?: string | null) {
  if (value === "public") return "Herkese Açık";
  if (value === "private") return "Gizli";
  return "Sadece Arkadaşlar";
}

function getStatusLabel(status?: string | null) {
  if (status === "trialing") return "Deneme Sürecinde";
  if (status === "past_due") return "Ödeme Bekleniyor";
  if (status === "canceled") return "İptal Edildi";
  return "Aktif";
}

function getAccountStatusLabel(status?: string | null) {
  if (status === "limited") return "Kısıtlı";
  if (status === "suspended") return "Askıya Alındı";
  if (status === "banned") return "Yasaklandı";
  return "Aktif";
}

function getAccountStatusClass(status?: string | null) {
  if (status === "suspended") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "banned") return "bg-red-50 text-red-600";
  if (status === "limited") return "bg-blue-50 text-blue-700";
  return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmemiş";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getProfileCompletionScore(profile: Profile | null) {
  if (!profile) return 0;

  const fields = [
    profile.full_name,
    profile.username,
    profile.university,
    profile.department,
    profile.city,
    profile.bio,
  ];

  const completedFields = fields.filter(
    (field) => field && String(field).trim().length > 0
  ).length;

  return Math.round((completedFields / fields.length) * 100);
}

function getCurrentMonthStart() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  ).toISOString();
}

function getUsagePercent(current: number, limit: number) {
  if (limit <= 0) return 100;

  return Math.min(Math.round((current / limit) * 100), 100);
}

function getInitial(profile: Profile | null, fallback?: string | null) {
  const value =
    profile?.full_name ||
    profile?.username ||
    fallback ||
    "KampüsRaf kullanıcısı";

  return value.trim().charAt(0).toUpperCase() || "K";
}

export default async function ProfilePage({
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
    .select(
      `
      id,
      full_name,
      username,
      email,
      avatar_url,
      cover_url,
      profile_visibility,
      allow_friend_requests,
      show_books_on_profile,
      show_city_on_profile,
      show_university_on_profile,
      social_profile_updated_at,
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
      plan_type,
      plan_status,
      plan_started_at,
      plan_expires_at,
      monthly_book_limit,
      monthly_request_limit,
      monthly_message_limit,
      monthly_match_limit,
      gender,
      match_gender_preference,
      show_gender_on_profile,
      match_preferences_updated_at
    `
    )
    .eq("id", user.id)
    .single();

  const profile = profileData as Profile | null;

  const monthStart = getCurrentMonthStart();

  const { count: myBooksCount } = await supabase
    .from("user_books")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: requestsCount } = await supabase
    .from("book_requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: matchesCount } = await supabase
    .from("book_matches")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`);

  const { count: monthlyBooksCount } = await supabase
    .from("user_books")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", monthStart);

  const { count: monthlyRequestsCount } = await supabase
    .from("book_requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", monthStart);

  const { count: monthlyMessagesCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", user.id)
    .gte("created_at", monthStart);

  const { count: monthlyMatchesCount } = await supabase
    .from("book_matches")
    .select("*", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
    .gte("created_at", monthStart);

  const planType = profile?.plan_type || "free";
  const planStatus = profile?.plan_status || "active";
  const canUseMatchPreference = canUseGenderMatchPreference(planType);
  const currentGender = profile?.gender || "prefer_not_to_say";
  const currentMatchPreference = profile?.match_gender_preference || "everyone";
  const showGenderOnProfile = profile?.show_gender_on_profile || false;
  const profileVisibility = profile?.profile_visibility || "friends";
  const allowFriendRequests = profile?.allow_friend_requests ?? true;
  const showBooksOnProfile = profile?.show_books_on_profile ?? true;
  const showCityOnProfile = profile?.show_city_on_profile ?? true;
  const showUniversityOnProfile = profile?.show_university_on_profile ?? true;
  const accountStatus = profile?.account_status || "active";
  const monthlyBookLimit = profile?.monthly_book_limit || 10;
  const monthlyRequestLimit = profile?.monthly_request_limit || 10;
  const monthlyMessageLimit = profile?.monthly_message_limit || 30;
  const monthlyMatchLimit = profile?.monthly_match_limit || 10;
  const profileCompletionScore = getProfileCompletionScore(profile);
  const displayName = profile?.full_name || user.email || "KampüsRaf kullanıcısı";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
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
                Profil merkezi
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
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
          </nav>

          {profile?.username ? (
            <Link
              href={`/profil/${profile.username}`}
              className="shrink-0 rounded-full bg-[#2E7D5B] px-4 py-2.5 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c] sm:px-5 sm:text-sm"
            >
              <span className="hidden sm:inline">Profilimi Gör</span>
              <span className="sm:hidden">Profil</span>
            </Link>
          ) : (
            <Link
              href="/akis"
              className="shrink-0 rounded-full border border-[#2E7D5B]/20 px-4 py-2.5 text-xs font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5 sm:px-5 sm:text-sm"
            >
              Akış
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="flex min-w-0 gap-4">
                <div className="hidden h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.7rem] border-2 border-white/25 bg-white/10 text-3xl md:flex">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getInitial(profile, user.email)}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                    Profil Merkezi
                  </p>

                  <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-5xl">
                    {displayName}
                  </h1>

                  <p className="mt-3 text-sm font-black text-white/80">
                    @{profile?.username || "kullaniciadi"}
                  </p>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                    Sosyal profilini, kitap görünürlüğünü, eşleşme tercihlerini,
                    güven durumunu ve paket limitlerini tek merkezden yönet.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-80">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {getPlanLabel(planType).replace(" Paket", "")}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Paket
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {profileCompletionScore}%
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Profil
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {profile?.trust_score || 0}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Güven
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success && (
          <div className="mt-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B] md:mt-6">
            {params.success === "social"
              ? "Sosyal profil ayarların güncellendi."
              : "Profil bilgilerin güncellendi."}
          </div>
        )}

        {params.error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
            {decodeURIComponent(params.error)}
          </div>
        )}

        {accountStatus !== "active" && (
          <div
            className={`mt-4 rounded-2xl p-4 text-sm font-black md:mt-6 ${getAccountStatusClass(
              accountStatus
            )}`}
          >
            Hesap durumun şu anda {getAccountStatusLabel(accountStatus)}. Bazı
            işlemler admin kararıyla sınırlandırılmış olabilir.
          </div>
        )}

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-4 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Kitaplarım</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B] md:mt-3 md:text-4xl">
              {myBooksCount || 0}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">
              Aradığım Kitaplar
            </p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B] md:mt-3 md:text-4xl">
              {requestsCount || 0}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Eşleşmeler</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B] md:mt-3 md:text-4xl">
              {matchesCount || 0}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">
              Profil Tamamlanma
            </p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B] md:mt-3 md:text-4xl">
              {profileCompletionScore}%
            </p>
          </div>
        </div>

        <section className="mt-5 grid gap-3 md:mt-6 md:grid-cols-4">
          <Link
            href="/kitaplarim"
            className="rounded-[1.4rem] bg-white p-4 text-sm font-black text-[#2E7D5B] shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            📚 Rafımı Gör
          </Link>

          <Link
            href="/paylas"
            className="rounded-[1.4rem] bg-white p-4 text-sm font-black text-[#2E7D5B] shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            ✍️ Paylaşım Yap
          </Link>

          <Link
            href="/arkadaslar"
            className="rounded-[1.4rem] bg-white p-4 text-sm font-black text-[#2E7D5B] shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            👥 Arkadaşlar
          </Link>

          <Link
            href="/paketler"
            className="rounded-[1.4rem] bg-white p-4 text-sm font-black text-[#2E7D5B] shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            ⭐ Paketler
          </Link>
        </section>

        <div className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8">
          <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                  Profil Bilgileri
                </p>

                <h2 className="mt-3 text-2xl font-black md:text-3xl">
                  Temel bilgilerini düzenle
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Bu bilgiler sosyal profilinde, kitap arama sonuçlarında ve
                  mesajlaşma akışlarında güven oluşturmak için kullanılır.
                </p>
              </div>

              {profile?.username && (
                <Link
                  href={`/profil/${profile.username}`}
                  className="rounded-full border border-[#2E7D5B]/20 px-5 py-2.5 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  Önizleme
                </Link>
              )}
            </div>

            <form
              action={updateProfileAction}
              className="mt-5 space-y-4 md:mt-7 md:space-y-5"
            >
              <div>
                <label className="text-sm font-bold text-slate-700">
                  E-posta
                </label>
                <input
                  disabled
                  defaultValue={profile?.email || user.email || ""}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Ad Soyad
                  </label>
                  <input
                    name="fullName"
                    defaultValue={profile?.full_name || ""}
                    placeholder="Ad Soyad"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Kullanıcı Adı
                  </label>
                  <input
                    name="username"
                    defaultValue={profile?.username || ""}
                    placeholder="kampusraf_kullanici"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Türkçe karakterler otomatik sadeleştirilir.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 md:gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Üniversite
                  </label>
                  <input
                    name="university"
                    defaultValue={profile?.university || ""}
                    placeholder="Aydın Adnan Menderes Üniversitesi"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Bölüm
                  </label>
                  <input
                    name="department"
                    defaultValue={profile?.department || ""}
                    placeholder="Bilgisayar Programcılığı"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Şehir
                  </label>
                  <input
                    name="city"
                    defaultValue={profile?.city || ""}
                    placeholder="Aydın"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Bio</label>
                <textarea
                  name="bio"
                  defaultValue={profile?.bio || ""}
                  rows={3}
                  placeholder="Kısaca kendinden, okuduğun kitaplardan veya takas tercihinden bahsedebilirsin."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <div className="rounded-[1.5rem] border border-[#2E7D5B]/10 bg-[#FAF7F0] p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
                      Eşleşme Tercihleri
                    </p>

                    <h3 className="mt-2 text-xl font-black text-[#1F2933]">
                      Karşına çıkacak kullanıcıları özelleştir
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Cinsiyet bilgisi isteğe bağlıdır. Eşleşme tercihi ise
                      Premium ve Pro paketlerde aktif olur.
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-4 py-2 text-xs font-black ${
                      canUseMatchPreference
                        ? "bg-[#2E7D5B]/10 text-[#2E7D5B]"
                        : "bg-[#F59E0B]/10 text-[#B45309]"
                    }`}
                  >
                    {canUseMatchPreference ? "Aktif" : "Premium Özellik"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 md:gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Cinsiyet
                    </label>

                    <select
                      name="gender"
                      defaultValue={currentGender}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B]"
                    >
                      <option value="prefer_not_to_say">
                        Belirtmek istemiyorum
                      </option>
                      <option value="female">Kadın</option>
                      <option value="male">Erkek</option>
                    </select>

                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      Bu bilgi isteğe bağlıdır. İstersen profilinde gizli kalır.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-700">
                      Karşıma çıkmasını istediğim kullanıcılar
                    </label>

                    <select
                      name="matchGenderPreference"
                      defaultValue={
                        canUseMatchPreference
                          ? currentMatchPreference
                          : "everyone"
                      }
                      disabled={!canUseMatchPreference}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="everyone">Herkes</option>
                      <option value="female">Kadın kullanıcılar</option>
                      <option value="male">Erkek kullanıcılar</option>
                    </select>

                    {!canUseMatchPreference && (
                      <input
                        type="hidden"
                        name="matchGenderPreference"
                        value="everyone"
                      />
                    )}

                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      Premium ve Pro kullanıcılar cinsiyet bazlı eşleşme tercihi
                      yapabilir.
                    </p>
                  </div>
                </div>

                <label className="mt-5 flex items-start gap-3 rounded-2xl bg-white p-4">
                  <input
                    type="checkbox"
                    name="showGenderOnProfile"
                    defaultChecked={showGenderOnProfile}
                    className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#2E7D5B]"
                  />

                  <span>
                    <span className="block text-sm font-black text-[#1F2933]">
                      Cinsiyetimi profilimde göster
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Kapalı bırakırsan bu bilgi yalnızca eşleşme tercihlerinde
                      kullanılır, profil kartında görünmez.
                    </span>
                  </span>
                </label>

                {!canUseMatchPreference && (
                  <div className="mt-5 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/10 p-4">
                    <p className="text-sm font-black text-[#1F2933]">
                      Daha isabetli eşleşmeler için Premium’a geç
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Premium ve Pro paketlerde karşına çıkacak kullanıcıları
                      tercihine göre filtreleyebilir, daha uygun kitap
                      sahiplerine ulaşabilirsin.
                    </p>

                    <Link
                      href="/paketler"
                      className="mt-3 inline-flex rounded-full bg-[#F59E0B] px-5 py-2.5 text-xs font-black text-white transition hover:-translate-y-0.5"
                    >
                      Paketleri İncele
                    </Link>
                  </div>
                )}

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Cinsiyet
                    </p>
                    <p className="mt-2 text-sm font-black text-[#1F2933]">
                      {getGenderLabel(currentGender)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Tercih
                    </p>
                    <p className="mt-2 text-sm font-black text-[#1F2933]">
                      {canUseMatchPreference
                        ? getMatchGenderPreferenceLabel(currentMatchPreference)
                        : "Herkes"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Profilde Gösterim
                    </p>
                    <p className="mt-2 text-sm font-black text-[#1F2933]">
                      {showGenderOnProfile ? "Açık" : "Kapalı"}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Profili Güncelle
              </button>
            </form>
          </section>

          <aside className="space-y-5 md:space-y-6 lg:sticky lg:top-28 lg:self-start">
            <section className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
              <div className="relative h-32 bg-[#2E7D5B] md:h-36">
                {profile?.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.cover_url}
                    alt="Kapak fotoğrafı"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2E7D5B] to-[#1F2933] text-xs font-black uppercase tracking-[0.18em] text-white/45">
                    Sosyal Profil
                  </div>
                )}

                <div className="absolute -bottom-9 left-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border-4 border-white bg-[#FAF7F0] text-3xl font-black text-[#2E7D5B] shadow-lg">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt="Profil fotoğrafı"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitial(profile, user.email)
                  )}
                </div>
              </div>

              <div className="p-5 pt-12 md:p-6 md:pt-12">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                      Sosyal Profil
                    </p>

                    <h2 className="mt-2 line-clamp-1 text-xl font-black">
                      {displayName}
                    </h2>

                    <p className="mt-1 truncate text-xs font-black text-[#2E7D5B]">
                      @{profile?.username || "kullaniciadi"}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-[11px] font-black text-[#2E7D5B]">
                    {getProfileVisibilityLabel(profileVisibility)}
                  </span>
                </div>

                {profile?.username ? (
                  <Link
                    href={`/profil/${profile.username}`}
                    className="mt-4 block rounded-2xl bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                  >
                    Profilimi Gör
                  </Link>
                ) : (
                  <div className="mt-4 rounded-2xl bg-[#F59E0B]/10 p-4 text-xs font-black text-[#B45309]">
                    Sosyal profil linki için kullanıcı adı gerekli.
                  </div>
                )}

                <form
                  action={updateSocialProfileAction}
                  className="mt-5 space-y-4"
                >
                  <div>
                    <label className="text-sm font-black text-[#1F2933]">
                      Profil Fotoğrafı
                    </label>

                    <input
                      type="file"
                      name="avatar"
                      accept="image/jpeg,image/png,image/webp"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-3 py-3 text-xs font-semibold text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#2E7D5B] file:px-3 file:py-2 file:text-[11px] file:font-black file:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-black text-[#1F2933]">
                      Kapak Fotoğrafı
                    </label>

                    <input
                      type="file"
                      name="cover"
                      accept="image/jpeg,image/png,image/webp"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-3 py-3 text-xs font-semibold text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#2E7D5B] file:px-3 file:py-2 file:text-[11px] file:font-black file:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-black text-[#1F2933]">
                      Profil Görünürlüğü
                    </label>

                    <select
                      name="profileVisibility"
                      defaultValue={profileVisibility}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                    >
                      <option value="public">Herkese açık</option>
                      <option value="friends">Sadece arkadaşlar</option>
                      <option value="private">Gizli</option>
                    </select>
                  </div>

                  <div className="space-y-3 rounded-[1.4rem] bg-[#FAF7F0] p-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="allowFriendRequests"
                        defaultChecked={allowFriendRequests}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#2E7D5B]"
                      />

                      <span className="text-xs font-bold leading-5 text-slate-600">
                        Arkadaşlık isteği al
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="showBooksOnProfile"
                        defaultChecked={showBooksOnProfile}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#2E7D5B]"
                      />

                      <span className="text-xs font-bold leading-5 text-slate-600">
                        Kitaplarım profilimde görünsün
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="showUniversityOnProfile"
                        defaultChecked={showUniversityOnProfile}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#2E7D5B]"
                      />

                      <span className="text-xs font-bold leading-5 text-slate-600">
                        Üniversitem görünsün
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="showCityOnProfile"
                        defaultChecked={showCityOnProfile}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#2E7D5B]"
                      />

                      <span className="text-xs font-bold leading-5 text-slate-600">
                        Şehrim görünsün
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                  >
                    Sosyal Profili Kaydet
                  </button>
                </form>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                Üyelik Statüsü
              </p>
              <h2 className="mt-3 text-2xl font-black md:text-3xl">
                {getPlanLabel(planType)}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {getPlanDescription(planType)}
              </p>

              <div className="mt-5 grid gap-3 md:mt-6">
                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Plan Durumu
                  </p>
                  <p className="mt-2 text-sm font-black text-[#2E7D5B]">
                    {getStatusLabel(planStatus)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Hesap Durumu
                  </p>
                  <p
                    className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-black ${getAccountStatusClass(
                      accountStatus
                    )}`}
                  >
                    {getAccountStatusLabel(accountStatus)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                      Başlangıç
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-700">
                      {formatDate(profile?.plan_started_at)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FAF7F0] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                      Bitiş
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-700">
                      {formatDate(profile?.plan_expires_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-[#2E7D5B]/10 bg-[#2E7D5B]/5 p-4 text-sm leading-7 text-slate-600">
                Bu alan ileride ödeme sistemi, paket yükseltme ve premium
                özellikler için kullanılacak. Şimdilik sadece statü gösterimi
                yapıyor.
              </div>

              <Link
                href="/paketler"
                className="mt-4 block rounded-full bg-[#2E7D5B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Paketleri İncele
              </Link>
            </section>

            <ProfileTrustCard
              isVerified={profile?.is_verified}
              verificationStatus={profile?.verification_status}
              trustScore={profile?.trust_score}
              completedExchangeCount={profile?.completed_exchange_count}
              responseScore={profile?.response_score}
              profileCompletionScore={profileCompletionScore}
              accountStatus={accountStatus}
            />

            <Link
              href="/ogrenci-dogrulama"
              className="block rounded-full bg-[#F59E0B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              Öğrenci Doğrulama
            </Link>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
                Aylık Kullanım
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Bu ay kullandığın hakları ve paket limitlerini buradan takip
                edebilirsin.
              </p>

              <div className="mt-5 grid gap-3">
                {[
                  {
                    label: "Kitap ekleme",
                    current: monthlyBooksCount || 0,
                    limit: monthlyBookLimit,
                  },
                  {
                    label: "Arama kaydı",
                    current: monthlyRequestsCount || 0,
                    limit: monthlyRequestLimit,
                  },
                  {
                    label: "Mesajlaşma",
                    current: monthlyMessagesCount || 0,
                    limit: monthlyMessageLimit,
                  },
                  {
                    label: "Eşleşme",
                    current: monthlyMatchesCount || 0,
                    limit: monthlyMatchLimit,
                  },
                ].map((item) => {
                  const percent = getUsagePercent(item.current, item.limit);
                  const isFull = item.current >= item.limit;

                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl bg-[#FAF7F0] p-3 md:p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-600">
                          {item.label}
                        </span>
                        <span
                          className={`shrink-0 text-sm font-black ${
                            isFull ? "text-red-600" : "text-[#2E7D5B]"
                          }`}
                        >
                          {item.current}/{item.limit}
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className={`h-full rounded-full ${
                            isFull ? "bg-red-500" : "bg-[#2E7D5B]"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {isFull
                          ? "Bu ayki limit doldu."
                          : `${Math.max(item.limit - item.current, 0)} hak kaldı.`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
              <h2 className="text-xl font-black md:text-2xl">
                Hesap İşlemleri
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Oturumunu güvenli şekilde kapatabilirsin.
              </p>

              <form action={signOutAction} className="mt-5">
                <button
                  type="submit"
                  className="w-full rounded-full border border-red-200 px-7 py-4 text-sm font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50"
                >
                  Çıkış Yap
                </button>
              </form>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}