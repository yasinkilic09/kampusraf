import Link from "next/link";
import { redirect } from "next/navigation";
import { submitStudentVerificationAction } from "@/app/actions/profile";
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

function getVerificationStatusLabel(status?: string | null) {
  if (status === "pending") return "İnceleme Bekliyor";
  if (status === "verified") return "Doğrulandı";
  if (status === "rejected") return "Reddedildi";
  return "Doğrulanmadı";
}

function getVerificationStatusClass(status?: string | null) {
  if (status === "verified") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#F59E0B]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getMethodLabel(method?: string | null) {
  if (method === "university_email") return "Üniversite E-postası";
  if (method === "document") return "Öğrenci Belgesi";
  if (method === "manual") return "Manuel İnceleme";
  return "Henüz seçilmedi";
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

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🎓
            </div>
            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Öğrenci Doğrulama
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
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
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Güvenli Kampüs Ağı
          </p>

          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
            Öğrenci hesabını doğrula.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
            Doğrulanmış öğrenci rozeti, kitap paylaşımı ve takas sürecinde
            karşı tarafa daha fazla güven verir. Bu alan ileride otomatik
            üniversite e-postası doğrulama ve belge inceleme sistemiyle
            genişletilecek.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-4 py-2 text-xs font-black ${getVerificationStatusClass(
                verificationStatus
              )}`}
            >
              {getVerificationStatusLabel(verificationStatus)}
            </span>

            <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
              Güven Puanı: {profile?.trust_score ?? 60}/100
            </span>
          </div>
        </div>

        {params.success && (
          <div className="mt-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B] md:mt-6">
            Doğrulama talebin başarıyla gönderildi. İnceleme bekliyor.
          </div>
        )}

        {params.error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <div className="mt-6 grid gap-5 md:mt-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <aside className="space-y-5">
            <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
                Mevcut Durum
              </p>

              <h2 className="mt-3 text-2xl font-black">
                {getVerificationStatusLabel(verificationStatus)}
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Yöntem
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    {getMethodLabel(profile?.verification_method)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Üniversite E-postası
                  </p>
                  <p className="mt-2 break-words text-sm font-bold text-slate-700">
                    {profile?.university_email || "Belirtilmemiş"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Talep Tarihi
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    {formatDate(profile?.verification_requested_at)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Doğrulama Tarihi
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    {formatDate(profile?.verification_verified_at)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                Güven Etkisi
              </p>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                Öğrenci doğrulaması tamamlandığında profilinde doğrulanmış rozet
                görünür. Bu sistem güven puanı, takas geçmişi ve profil
                doluluğu ile birlikte çalışır.
              </p>

              <div className="mt-5 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-bold text-[#2E7D5B]">
                Doğrulama tamamlandığında güven puanı manuel veya otomatik
                kuralla artırılabilir.
              </div>
            </section>
          </aside>

          <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-9">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
              Doğrulama Talebi
            </p>

            <h2 className="mt-3 text-2xl font-black md:text-3xl">
              Öğrenci hesabını incelemeye gönder
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              Şimdilik bu alan doğrulama talebi oluşturur. Sonraki aşamada
              gerçek e-posta kodu, belge yükleme ve admin onay paneli
              bağlanabilir.
            </p>

            {verificationStatus === "verified" ? (
              <div className="mt-6 rounded-2xl bg-[#2E7D5B]/10 p-5 text-sm font-bold leading-7 text-[#2E7D5B]">
                Hesabın doğrulanmış görünüyor. Profilinde doğrulanmış öğrenci
                rozeti aktif şekilde kullanılabilir.
              </div>
            ) : (
              <form
                action={submitStudentVerificationAction}
                className="mt-6 space-y-5"
              >
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Doğrulama Yöntemi
                  </label>
                  <select
                    name="method"
                    defaultValue={profile?.verification_method || "university_email"}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  >
                    <option value="university_email">
                      Üniversite e-postası ile doğrulama
                    </option>
                    <option value="document">
                      Öğrenci belgesi ile doğrulama hazırlığı
                    </option>
                    <option value="manual">Manuel inceleme</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Üniversite E-postası
                  </label>
                  <input
                    name="universityEmail"
                    type="email"
                    defaultValue={profile?.university_email || ""}
                    placeholder="ornek@ogrenci.edu.tr"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    V1 sürümünde bu e-posta inceleme talebi olarak kaydedilir.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Ek Not
                  </label>
                  <textarea
                    name="verificationNote"
                    rows={4}
                    defaultValue={profile?.verification_note || ""}
                    placeholder="Üniversiten, bölümün veya doğrulama için eklemek istediğin kısa not..."
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5"
                >
                  Doğrulama Talebi Gönder
                </button>
              </form>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}