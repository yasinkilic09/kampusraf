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
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#F59E0B]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getMethodLabel(method?: string | null) {
  if (method === "university_email") return "Üniversite E-postası";
  if (method === "document") return "Öğrenci Belgesi";
  if (method === "manual") return "Manuel İnceleme";
  return "Belirtilmemiş";
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

  const pendingCount = profiles.filter(
    (item) => item.verification_status === "pending"
  ).length;

  const verifiedCount = profiles.filter(
    (item) => item.verification_status === "verified"
  ).length;

  const rejectedCount = profiles.filter(
    (item) => item.verification_status === "rejected"
  ).length;

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🛡️
            </div>
            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Admin Doğrulamalar
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/ogrenci-dogrulama" className="hover:text-[#2E7D5B]">
              Öğrenci Doğrulama
            </Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Admin Paneli
          </p>

          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
            Öğrenci doğrulama talepleri
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
            Bekleyen öğrenci doğrulama başvurularını inceleyebilir, kullanıcıyı
            doğrulanmış öğrenci yapabilir veya talebi reddedebilirsin.
          </p>
        </div>

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

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Bekleyen</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B]">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Doğrulanan</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">
              {verifiedCount}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Reddedilen</p>
            <p className="mt-2 text-3xl font-black text-red-500">
              {rejectedCount}
            </p>
          </div>
        </div>

        {profiles.length === 0 ? (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-[#2E7D5B]/30 bg-white p-8 text-center shadow-sm md:mt-8 md:rounded-[2rem] md:p-12">
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
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:mt-8">
            {profiles.map((profile) => (
              <article
                key={profile.id}
                className="rounded-[1.7rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black ${getStatusClass(
                          profile.verification_status
                        )}`}
                      >
                        {getStatusLabel(profile.verification_status)}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                        {getMethodLabel(profile.verification_method)}
                      </span>

                      {profile.is_verified && (
                        <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-[11px] font-black text-[#2E7D5B]">
                          🎓 Rozet Aktif
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 break-words text-xl font-black md:text-2xl">
                      {profile.full_name ||
                        profile.username ||
                        "İsimsiz Kullanıcı"}
                    </h2>

                    <p className="mt-1 break-words text-sm font-bold text-slate-500">
                      {profile.email || "E-posta yok"}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Üniversite
                        </p>
                        <p className="mt-2 break-words text-sm font-bold text-slate-700">
                          {profile.university || "Belirtilmemiş"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Bölüm
                        </p>
                        <p className="mt-2 break-words text-sm font-bold text-slate-700">
                          {profile.department || "Belirtilmemiş"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Şehir
                        </p>
                        <p className="mt-2 break-words text-sm font-bold text-slate-700">
                          {profile.city || "Belirtilmemiş"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Güven Puanı
                        </p>
                        <p className="mt-2 text-sm font-black text-[#2E7D5B]">
                          {profile.trust_score ?? 60}/100
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                        Üniversite E-postası
                      </p>
                      <p className="mt-2 break-words text-sm font-bold text-slate-700">
                        {profile.university_email || "Belirtilmemiş"}
                      </p>
                    </div>

                    {profile.verification_note && (
                      <div className="mt-3 rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Kullanıcı Notu / Red Sebebi
                        </p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {profile.verification_note}
                        </p>
                      </div>
                    )}

                    <p className="mt-4 text-xs font-bold text-slate-400">
                      Talep tarihi: {formatDate(profile.verification_requested_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 lg:min-w-56">
                    {profile.verification_status !== "verified" && (
                      <form action={approveStudentVerificationAction}>
                        <input
                          type="hidden"
                          name="profileId"
                          value={profile.id}
                        />
                        <button
                          type="submit"
                          className="w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5"
                        >
                          Onayla
                        </button>
                      </form>
                    )}

                    {profile.verification_status !== "rejected" && (
                      <form action={rejectStudentVerificationAction}>
                        <input
                          type="hidden"
                          name="profileId"
                          value={profile.id}
                        />

                        <input
                          name="reason"
                          placeholder="Red sebebi"
                          className="mb-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs outline-none focus:border-[#2E7D5B]"
                        />

                        <button
                          type="submit"
                          className="w-full rounded-full bg-red-50 px-5 py-3 text-xs font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100"
                        >
                          Reddet
                        </button>
                      </form>
                    )}

                    <form action={resetStudentVerificationAction}>
                      <input
                        type="hidden"
                        name="profileId"
                        value={profile.id}
                      />

                      <button
                        type="submit"
                        className="w-full rounded-full bg-slate-100 px-5 py-3 text-xs font-black text-slate-600 transition hover:-translate-y-0.5"
                      >
                        Sıfırla
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}