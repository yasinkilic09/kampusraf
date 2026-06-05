import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  approveStudentVerificationAction,
  rejectStudentVerificationAction,
  resetStudentVerificationAction,
} from "@/app/actions/admin-verifications";

type SearchParams = {
  success?: string;
  error?: string;
};

type VerificationProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  university: string | null;
  department: string | null;
  city: string | null;
  trust_score: number | null;
  is_verified: boolean | null;
  verification_status: string | null;
  verification_method: string | null;
  university_email: string | null;
  verification_note: string | null;
  verification_requested_at: string | null;
  verification_verified_at: string | null;
  created_at: string | null;
};

function getStatusLabel(status?: string | null) {
  if (status === "pending") return "İnceleme Bekliyor";
  if (status === "verified") return "Doğrulandı";
  if (status === "rejected") return "Reddedildi";
  return "Doğrulanmadı";
}

function getStatusClass(status?: string | null) {
  if (status === "verified") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getMethodLabel(method?: string | null) {
  if (method === "university_email_test_code") return "Üniversite E-posta Doğrulaması";
  if (method === "university_email_otp") return "E-posta Kodu";
  if (method === "university_email") return "Üniversite E-postası";
  if (method === "document") return "Belge İncelemesi";
  if (method === "manual") return "Manuel İnceleme";

  return "Belirtilmemiş";
}

function getMethodIcon(method?: string | null) {
  if (method === "university_email_test_code") return "✉️";
  if (method === "university_email_otp") return "✉️";
  if (method === "university_email") return "✉️";
  if (method === "document") return "📄";
  if (method === "manual") return "👁️";

  return "🎓";
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmemiş";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDisplayName(profile: VerificationProfile) {
  return profile.full_name || profile.username || "İsimsiz Kullanıcı";
}

function getProfileInitial(profile: VerificationProfile) {
  return getDisplayName(profile).trim().charAt(0).toUpperCase() || "K";
}

function getTrustScore(profile: VerificationProfile) {
  return profile.trust_score ?? 60;
}

function getTrustClass(score: number) {
  if (score >= 80) return "text-[#2E7D5B]";
  if (score >= 60) return "text-[#F59E0B]";
  return "text-red-500";
}

function VerificationStatCard({
  label,
  value,
  icon,
  colorClass,
  description,
}: {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className={`mt-2 text-3xl font-black ${colorClass}`}>{value}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <span className="shrink-0 text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-[#FAF7F0] p-4">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-700">
        {value || "Belirtilmemiş"}
      </p>
    </div>
  );
}

function VerificationActions({ profile }: { profile: VerificationProfile }) {
  return (
    <div className="grid shrink-0 gap-2 lg:min-w-60">
      {profile.verification_status !== "verified" && (
        <form action={approveStudentVerificationAction}>
          <input type="hidden" name="profileId" value={profile.id} />

          <button
            type="submit"
            className="w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Öğrenciyi Onayla
          </button>
        </form>
      )}

      {profile.verification_status !== "rejected" && (
        <form action={rejectStudentVerificationAction}>
          <input type="hidden" name="profileId" value={profile.id} />

          <textarea
            name="reason"
            rows={3}
            placeholder="Red sebebi yaz..."
            className="mb-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs outline-none transition focus:border-[#2E7D5B] focus:bg-white"
          />

          <button
            type="submit"
            className="w-full rounded-full border border-red-100 bg-red-50 px-5 py-3 text-xs font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100"
          >
            Talebi Reddet
          </button>
        </form>
      )}

      <form action={resetStudentVerificationAction}>
        <input type="hidden" name="profileId" value={profile.id} />

        <button
          type="submit"
          className="w-full rounded-full bg-slate-100 px-5 py-3 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-200"
        >
          Durumu Sıfırla
        </button>
      </form>
    </div>
  );
}

export default async function AdminVerificationsPage({
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

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      username,
      email,
      university,
      department,
      city,
      trust_score,
      is_verified,
      verification_status,
      verification_method,
      university_email,
      verification_note,
      verification_requested_at,
      verification_verified_at,
      created_at
    `
    )
    .in("verification_status", ["pending", "verified", "rejected"])
    .order("verification_requested_at", {
      ascending: false,
      nullsFirst: false,
    });

  const profiles = (data || []) as VerificationProfile[];

  const pendingProfiles = profiles.filter(
    (item) => item.verification_status === "pending"
  );

  const verifiedProfiles = profiles.filter(
    (item) => item.verification_status === "verified"
  );

  const rejectedProfiles = profiles.filter(
    (item) => item.verification_status === "rejected"
  );

  const pendingCount = pendingProfiles.length;
  const verifiedCount = verifiedProfiles.length;
  const rejectedCount = rejectedProfiles.length;

  const orderedProfiles = [
    ...pendingProfiles,
    ...verifiedProfiles,
    ...rejectedProfiles,
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🎓
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Öğrenci doğrulama merkezi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/admin" className="hover:text-[#2E7D5B]">
              Admin
            </Link>
            <Link href="/admin/kullanicilar" className="hover:text-[#2E7D5B]">
              Kullanıcılar
            </Link>
            <Link href="/admin/sikayetler" className="hover:text-[#2E7D5B]">
              Şikayetler
            </Link>
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </nav>

          <Link
            href="/admin"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Admin
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Öğrenci Doğrulama Merkezi
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Doğrulama taleplerini güvenli şekilde yönet.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Bekleyen öğrenci doğrulama başvurularını inceleyebilir,
                  kullanıcıyı doğrulanmış öğrenci yapabilir, talebi reddedebilir
                  veya doğrulama durumunu sıfırlayabilirsin.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[360px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {pendingCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Bekleyen
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {verifiedCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Onaylı
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {rejectedCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Red
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
              >
                Admin Panele Dön
              </Link>

              <Link
                href="/ogrenci-dogrulama"
                className="rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Kullanıcı Doğrulama Formu
              </Link>
            </div>
          </div>
        </section>

        {params.success && (
          <div className="mt-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B] md:mt-6">
            İşlem başarıyla tamamlandı.
          </div>
        )}

        {params.error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
            {decodeURIComponent(params.error)}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 md:mt-6">
            Kayıtlar yüklenirken hata oluştu: {error.message}
          </div>
        )}

        <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
          <VerificationStatCard
            label="Bekleyen"
            value={pendingCount}
            icon="⏳"
            colorClass="text-[#F59E0B]"
            description="Admin incelemesi bekleyen öğrenci başvuruları."
          />

          <VerificationStatCard
            label="Doğrulanan"
            value={verifiedCount}
            icon="✅"
            colorClass="text-[#2E7D5B]"
            description="Doğrulanmış öğrenci rozeti aktif kullanıcılar."
          />

          <VerificationStatCard
            label="Reddedilen"
            value={rejectedCount}
            icon="❌"
            colorClass="text-red-500"
            description="Gerekçeli şekilde reddedilen doğrulama talepleri."
          />
        </section>

        {profiles.length === 0 ? (
          <section className="mt-6 rounded-[1.8rem] border border-dashed border-[#2E7D5B]/30 bg-white p-8 text-center shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem] md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              🎓
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Henüz doğrulama talebi yok
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Kullanıcılar öğrenci doğrulama talebi gönderdiğinde burada
              listelenecek.
            </p>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {orderedProfiles.map((profile) => {
                const trustScore = getTrustScore(profile);

                return (
                  <article
                    key={profile.id}
                    className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]"
                  >
                    <div className="p-4 md:p-6">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B]/10 text-xl font-black text-[#2E7D5B]">
                              {getProfileInitial(profile)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-black ${getStatusClass(
                                    profile.verification_status
                                  )}`}
                                >
                                  {getStatusLabel(profile.verification_status)}
                                </span>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                                  {getMethodIcon(profile.verification_method)}{" "}
                                  {getMethodLabel(profile.verification_method)}
                                </span>

                                {profile.is_verified && (
                                  <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-[11px] font-black text-[#2E7D5B]">
                                    🎓 Rozet Aktif
                                  </span>
                                )}
                              </div>

                              <h2 className="mt-3 break-words text-xl font-black leading-tight md:text-2xl">
                                {getDisplayName(profile)}
                              </h2>

                              {profile.username && (
                                <p className="mt-1 break-words text-xs font-black text-[#2E7D5B]">
                                  @{profile.username}
                                </p>
                              )}

                              <p className="mt-1 break-words text-sm font-bold text-slate-500">
                                {profile.email || "E-posta yok"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <InfoBox
                              label="Üniversite"
                              value={profile.university || "Belirtilmemiş"}
                            />

                            <InfoBox
                              label="Bölüm"
                              value={profile.department || "Belirtilmemiş"}
                            />

                            <InfoBox
                              label="Şehir"
                              value={profile.city || "Belirtilmemiş"}
                            />

                            <InfoBox
                              label="Güven Puanı"
                              value={`${trustScore}/100`}
                            />
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl bg-[#FAF7F0] p-4">
                              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                Üniversite E-postası
                              </p>
                              <p className="mt-2 break-words text-sm font-bold text-slate-700">
                                {profile.university_email || "Belirtilmemiş"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-[#FAF7F0] p-4">
                              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                Talep Tarihi
                              </p>
                              <p className="mt-2 text-sm font-bold text-slate-700">
                                {formatDate(profile.verification_requested_at)}
                              </p>
                            </div>
                          </div>

                          {profile.verification_note && (
                            <div className="mt-4 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/10 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#B45309]">
                                Kullanıcı Notu / Red Sebebi
                              </p>
                              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                                {profile.verification_note}
                              </p>
                            </div>
                          )}

                          <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                Güven Seviyesi
                              </p>
                              <p
                                className={`text-sm font-black ${getTrustClass(
                                  trustScore
                                )}`}
                              >
                                {trustScore}%
                              </p>
                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                              <div
                                className={`h-full rounded-full ${
                                  trustScore >= 80
                                    ? "bg-[#2E7D5B]"
                                    : trustScore >= 60
                                      ? "bg-[#F59E0B]"
                                      : "bg-red-500"
                                }`}
                                style={{
                                  width: `${Math.min(trustScore, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <VerificationActions profile={profile} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                  İnceleme Özeti
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl bg-[#F59E0B]/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B45309]">
                      Öncelik
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#B45309]">
                      {pendingCount}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Bekleyen talepler önce listelenir.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#2E7D5B]/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2E7D5B]">
                      Aktif Rozet
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                      {verifiedCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-red-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-red-400">
                      Reddedilen
                    </p>
                    <p className="mt-2 text-2xl font-black text-red-600">
                      {rejectedCount}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem] md:p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                  Doğrulama Kontrolü
                </p>

                <h3 className="mt-2 text-xl font-black">
                  Karar vermeden önce bilgileri kontrol et.
                </h3>

                <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-white/75">
                  <p className="rounded-2xl bg-white/10 p-3">
                    ✓ Üniversite bilgisi ve bölüm bilgisi tutarlı mı?
                  </p>
                  <p className="rounded-2xl bg-white/10 p-3">
                    ✓ Üniversite e-postası veya belge yöntemi mantıklı mı?
                  </p>
                  <p className="rounded-2xl bg-white/10 p-3">
                    ✓ Reddederken kısa ve anlaşılır bir sebep yaz.
                  </p>
                </div>
              </section>

              <section className="rounded-[1.8rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  Hızlı Erişim
                </p>

                <div className="mt-4 grid gap-3">
                  <Link
                    href="/admin"
                    className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                  >
                    Admin Panel
                  </Link>

                  <Link
                    href="/admin/kullanicilar"
                    className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                  >
                    Kullanıcı Yönetimi
                  </Link>

                  <Link
                    href="/admin/sikayetler"
                    className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                  >
                    Şikayetler
                  </Link>
                </div>
              </section>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}