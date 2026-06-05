import Link from "next/link";
import { redirect } from "next/navigation";
import {
  sendStudentVerificationCodeAction,
  submitStudentVerificationAction,
  verifyStudentVerificationCodeAction,
} from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  success?: string;
  error?: string;
};

type ProfileVerification = {
  full_name: string | null;
  email: string | null;
  university: string | null;
  department: string | null;
  city: string | null;
  is_verified: boolean | null;
  trust_score: number | null;
  verification_status: string | null;
  verification_method: string | null;
  university_email: string | null;
  verification_note: string | null;
  verification_requested_at: string | null;
  verification_verified_at: string | null;
};

type VerificationCodeRow = {
  id: string;
  university_email: string;
  expires_at: string;
  attempts: number;
  created_at: string;
};

function getVerificationStatusLabel(status?: string | null) {
  if (status === "pending") return "İnceleme Bekliyor";
  if (status === "verified") return "Doğrulandı";
  if (status === "rejected") return "Reddedildi";
  return "Doğrulanmadı";
}

function getVerificationStatusClass(status?: string | null) {
  if (status === "verified") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getMethodLabel(method?: string | null) {
  if (method === "university_email_test_code") return "Üniversite E-posta Doğrulaması";
  if (method === "university_email_otp") return "Üniversite E-postası + Kod";
  if (method === "university_email") return "Üniversite E-postası";
  if (method === "document") return "Öğrenci Belgesi / Manuel Kontrol";
  if (method === "manual") return "Manuel İnceleme";
  return "Henüz seçilmedi";
}

function getMethodIcon(method?: string | null) {
  if (method === "university_email_test_code") return "🧪";
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
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSuccessMessage(success?: string) {
  if (success === "code-created") {
    return "Doğrulama kodu oluşturuldu. Lütfen kodu girerek öğrenci doğrulama işlemini tamamla.";
  }

  if (success === "code-sent") {
    return "Doğrulama kodu üniversite e-posta adresine gönderildi.";
  }

  if (success === "verified") {
    return "Öğrenci hesabın başarıyla doğrulandı. Rozetin artık aktif.";
  }

  if (success === "verification-requested") {
    return "Manuel doğrulama talebin başarıyla gönderildi. İnceleme bekliyor.";
  }

  return "İşlem başarıyla tamamlandı.";
}

function StatusStep({
  number,
  title,
  description,
  active,
  done,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        done
          ? "bg-[#2E7D5B]/10"
          : active
            ? "bg-[#F59E0B]/10"
            : "bg-[#FAF7F0]"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
            done
              ? "bg-[#2E7D5B] text-white"
              : active
                ? "bg-[#F59E0B] text-white"
                : "bg-white text-slate-500"
          }`}
        >
          {done ? "✓" : number}
        </div>

        <div>
          <p className="text-sm font-black text-[#1F2933]">{title}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {description}
          </p>
        </div>
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

export default async function StudentVerificationPage({
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
      full_name,
      email,
      university,
      department,
      city,
      is_verified,
      trust_score,
      verification_status,
      verification_method,
      university_email,
      verification_note,
      verification_requested_at,
      verification_verified_at
    `
    )
    .eq("id", user.id)
    .single();

  const profile = profileData as ProfileVerification | null;
  const verificationStatus = profile?.verification_status || "unverified";
const isVerified =
  verificationStatus === "verified" || Boolean(profile?.is_verified);
const isPending = verificationStatus === "pending";

  const { data: activeCodeData } = await supabase
    .from("student_verification_codes")
    .select("id, university_email, expires_at, attempts, created_at")
    .eq("user_id", user.id)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeCode = activeCodeData as VerificationCodeRow | null;
  const hasActiveCode =
    Boolean(activeCode) &&
    new Date(activeCode?.expires_at || "").getTime() > Date.now();

  const defaultUniversityEmail =
    activeCode?.university_email || profile?.university_email || "";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🎓
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Öğrenci doğrulama
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
            <Link href="/takaslar" className="hover:text-[#2E7D5B]">
              Takaslar
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
          </nav>

          <Link
            href="/profilim"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Profilim
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
                  Güvenli Kampüs Ağı
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Öğrenci hesabını gerçek e-posta koduyla doğrula.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Üniversite e-posta adresine gönderilen 6 haneli kodu
                  doğrulayarak profilinde doğrulanmış öğrenci rozetini aktif
                  hale getirebilirsin.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full bg-white px-4 py-2 text-xs font-black ${getVerificationStatusClass(
                      verificationStatus
                    )}`}
                  >
                    {getVerificationStatusLabel(verificationStatus)}
                  </span>

                  <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                    Güven Puanı: {profile?.trust_score ?? 60}/100
                  </span>

                  {hasActiveCode && (
                    <span className="rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-black text-white">
                      Kod Aktif
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {isVerified ? "Aktif" : isPending ? "Bekliyor" : "Pasif"}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Rozet
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {profile?.trust_score ?? 60}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Güven
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {hasActiveCode ? "Var" : "Yok"}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Aktif Kod
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {getMethodIcon(profile?.verification_method)}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Yöntem
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success && (
          <div className="mt-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B] md:mt-6">
            {getSuccessMessage(params.success)}
          </div>
        )}

        {params.error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                Mevcut Durum
              </p>

              <h2 className="mt-3 text-2xl font-black">
                {getVerificationStatusLabel(verificationStatus)}
              </h2>

              <div className="mt-5 grid gap-3">
                <InfoBox
                  label="Yöntem"
                  value={getMethodLabel(profile?.verification_method)}
                />

                <InfoBox
                  label="Üniversite E-postası"
                  value={profile?.university_email || "Belirtilmemiş"}
                />

                <InfoBox
                  label="Talep Tarihi"
                  value={formatDate(profile?.verification_requested_at)}
                />

                <InfoBox
                  label="Doğrulama Tarihi"
                  value={formatDate(profile?.verification_verified_at)}
                />
              </div>

              {profile?.verification_note && (
                <div className="mt-4 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[#B45309]">
                    Not / Red Sebebi
                  </p>
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-slate-700">
                    {profile.verification_note}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Doğrulama Akışı
              </p>

              <div className="mt-5 grid gap-3">
                <StatusStep
                  number="1"
                  title="Üniversite e-postanı gir"
                  description=".edu.tr uzantılı veya sisteme eklenmiş üniversite domaini kullan."
                  done={Boolean(profile?.university_email)}
                  active={!profile?.university_email}
                />

                <StatusStep
                  number="2"
                  title="6 haneli kodu al"
                  description="Kod 10 dakika geçerlidir ve yalnızca bir kez kullanılabilir."
                  done={isVerified}
                  active={hasActiveCode && !isVerified}
                />

                <StatusStep
                  number="3"
                  title="Rozeti aktif et"
                  description="Kod doğruysa öğrenci rozetin otomatik aktif olur."
                  done={Boolean(isVerified)}
                  active={!isVerified && isPending}
                />
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                Güven Etkisi
              </p>

              <h3 className="mt-2 text-xl font-black">
                Doğrulanmış profil daha güvenli takas sağlar.
              </h3>

              <p className="mt-3 text-sm font-semibold leading-7 text-white/75">
                Doğrulama tamamlandığında profilinde öğrenci rozeti görünür ve
                güven puanın artırılır.
              </p>
            </section>
          </aside>

          <section className="space-y-5">
            {isVerified ? (
              <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-8">
                <div className="rounded-[1.5rem] bg-[#2E7D5B]/10 p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2E7D5B] text-3xl text-white">
                    🎓
                  </div>

                  <h2 className="mt-5 text-2xl font-black text-[#1F2933]">
                    Öğrenci hesabın doğrulandı
                  </h2>

                  <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-500">
                    Profilinde doğrulanmış öğrenci rozeti aktif. Artık kitap
                    paylaşımı, mesajlaşma ve takas sürecinde karşı tarafa daha
                    güçlü güven sinyali veriyorsun.
                  </p>

                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                      href="/profilim"
                      className="rounded-full bg-[#2E7D5B] px-7 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                    >
                      Profilime Git
                    </Link>

                    <Link
                      href="/kitap-ara"
                      className="rounded-full border border-[#2E7D5B]/20 px-7 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                    >
                      Kitap Ara
                    </Link>
                  </div>
                </div>
              </section>
            ) : (
              <>
                <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-8">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                    1. E-posta Kodu Gönder
                  </p>

                  <h2 className="mt-3 text-2xl font-black md:text-3xl">
                    Üniversite e-postanı doğrula
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    En güvenilir doğrulama yöntemi budur. Üniversite e-postana
                    gönderilen 6 haneli kodu girince rozet otomatik aktif olur.
                  </p>

                  <form
                    action={sendStudentVerificationCodeAction}
                    className="mt-6 space-y-5"
                  >
                    <div>
                      <label className="text-sm font-bold text-slate-700">
                        Üniversite E-postası
                      </label>
                      <input
                        name="universityEmail"
                        type="email"
                        defaultValue={defaultUniversityEmail}
                        placeholder="ornek@ogrenci.edu.tr"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                      />
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                        Sistem .edu.tr domainlerini ve Supabase’de tanımlı
                        üniversite domainlerini kabul eder.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-700">
                        Ek Not
                      </label>
                      <textarea
                        name="verificationNote"
                        rows={3}
                        defaultValue={profile?.verification_note || ""}
                        placeholder="Üniversiten, bölümün veya doğrulama için eklemek istediğin kısa not..."
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                    >
                      Doğrulama Kodu Gönder
                    </button>
                  </form>
                </section>

                <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-8">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                    2. Kodu Doğrula
                  </p>

                  <h2 className="mt-3 text-2xl font-black md:text-3xl">
                    6 haneli kodu gir
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    E-posta kutuna gelen kodu buraya yaz. Kod 10 dakika
                    geçerlidir.
                  </p>

                  {hasActiveCode ? (
                    <div className="mt-4 rounded-2xl bg-[#F59E0B]/10 p-4 text-sm font-bold leading-7 text-[#B45309]">
                      Aktif kod: {activeCode?.university_email} adresi için
                      oluşturuldu. Son geçerlilik:{" "}
                      {formatDate(activeCode?.expires_at)}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm font-bold leading-7 text-slate-500">
                      Şu anda aktif doğrulama kodu görünmüyor. Önce kod gönder.
                    </div>
                  )}

                  <form
                    action={verifyStudentVerificationCodeAction}
                    className="mt-6 space-y-5"
                  >
                    <input
                      type="hidden"
                      name="universityEmail"
                      value={defaultUniversityEmail}
                    />

                    <div>
                      <label className="text-sm font-bold text-slate-700">
                        Doğrulama Kodu
                      </label>
                      <input
                        name="code"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-4 text-center text-2xl font-black tracking-[0.4em] outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!hasActiveCode}
                      className="w-full rounded-full bg-[#F59E0B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#F59E0B]/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Kodu Doğrula ve Rozeti Aktifleştir
                    </button>
                  </form>
                </section>

                <section className="rounded-[1.8rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                    Alternatif Yöntem
                  </p>

                  <h2 className="mt-3 text-2xl font-black md:text-3xl">
                    Üniversite e-postan yoksa manuel inceleme iste
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Üniversite e-postası kullanamıyorsan bu alanla admin
                    incelemesine talep gönderebilirsin. Bu yöntem otomatik rozet
                    vermez; admin onayı gerekir.
                  </p>

                  <form
                    action={submitStudentVerificationAction}
                    className="mt-6 space-y-5"
                  >
                    <input type="hidden" name="method" value="manual" />

                    <div>
                      <label className="text-sm font-bold text-slate-700">
                        Üniversite E-postası / Alternatif İletişim
                      </label>
                      <input
                        name="universityEmail"
                        type="email"
                        defaultValue={profile?.university_email || ""}
                        placeholder="Varsa üniversite e-postanı yaz"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-700">
                        Manuel İnceleme Notu
                      </label>
                      <textarea
                        name="verificationNote"
                        rows={4}
                        defaultValue={profile?.verification_note || ""}
                        placeholder="Üniversiteni, bölümünü ve neden manuel inceleme istediğini yaz..."
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-full border border-[#2E7D5B]/20 px-7 py-4 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                    >
                      Manuel İnceleme Talebi Gönder
                    </button>
                  </form>
                </section>
              </>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}