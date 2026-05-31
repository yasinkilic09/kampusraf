import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction, updateProfileAction } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/server";

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
  university: string | null;
  department: string | null;
  city: string | null;
  bio: string | null;
  trust_score: number | null;
  is_verified: boolean | null;
  account_status: string | null;
  plan_type: string | null;
  plan_status: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  monthly_book_limit: number | null;
  monthly_request_limit: number | null;
  monthly_message_limit: number | null;
  monthly_match_limit: number | null;
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

function getStatusLabel(status?: string | null) {
  if (status === "trialing") return "Deneme Sürecinde";
  if (status === "past_due") return "Ödeme Bekleniyor";
  if (status === "canceled") return "İptal Edildi";
  return "Aktif";
}

function getAccountStatusLabel(status?: string | null) {
  if (status === "limited") return "Kısıtlı";
  if (status === "suspended") return "Askıya Alındı";
  return "Aktif";
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmemiş";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
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
      university,
      department,
      city,
      bio,
      trust_score,
      is_verified,
      account_status,
      plan_type,
      plan_status,
      plan_started_at,
      plan_expires_at,
      monthly_book_limit,
      monthly_request_limit,
      monthly_message_limit,
      monthly_match_limit
    `
    )
    .eq("id", user.id)
    .single();

  const profile = profileData as Profile | null;

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

  const planType = profile?.plan_type || "free";
  const planStatus = profile?.plan_status || "active";
  const accountStatus = profile?.account_status || "active";

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              👤
            </div>
            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">Profilim</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
              Eşleşmeler
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
                Kullanıcı Profili
              </p>
              <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
  {profile?.full_name || user.email}
</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                Profil bilgilerini, kampüs bilgilerini ve üyelik statünü buradan
                takip edebilirsin.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                {getPlanLabel(planType)}
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                {getStatusLabel(planStatus)}
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                Hesap: {getAccountStatusLabel(accountStatus)}
              </span>
            </div>
          </div>
        </div>

        {params.success && (
          <div className="mt-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B] md:mt-6">
            Profil bilgilerin güncellendi.
          </div>
        )}

        {params.error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Kitaplarım</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B] md:mt-3 md:text-4xl">
              {myBooksCount || 0}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Aradığım Kitaplar</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B] md:mt-3 md:text-4xl">
              {requestsCount || 0}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Eşleşmeler</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B] md:mt-3 md:text-4xl">
              {matchesCount || 0}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:mt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-9">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
              Profil Bilgileri
            </p>
            <h2 className="mt-3 text-2xl font-black md:text-3xl">Bilgilerini düzenle</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Bu bilgiler kitap arama, eşleşme ve mesajlaşma akışlarında
              karşı tarafa güven vermek için kullanılır.
            </p>

            <form action={updateProfileAction} className="mt-5 space-y-4 md:mt-7 md:space-y-5">
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

              <button
                type="submit"
                className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Profili Güncelle
              </button>
            </form>
          </section>

          <aside className="space-y-5 md:space-y-6">
            <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                Üyelik Statüsü
              </p>
              <h2 className="mt-3 text-2xl font-black md:text-3xl">
  {getPlanLabel(planType)}
</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {getPlanDescription(planType)}
              </p>

              <div className="mt-5 space-y-3 md:mt-6">
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
                  <p className="mt-2 text-sm font-black text-[#2E7D5B]">
                    {getAccountStatusLabel(accountStatus)}
                  </p>
                </div>

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

              <div className="mt-6 rounded-2xl border border-[#2E7D5B]/10 bg-[#2E7D5B]/5 p-4 text-sm leading-7 text-slate-600">
                Bu alan ileride ödeme sistemi, paket yükseltme ve premium
                özellikler için kullanılacak. Şimdilik sadece statü gösterimi
                yapıyor.
              </div>
            </section>

            <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
                Paket Limitleri
              </p>

              <div className="mt-5 grid gap-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAF7F0] p-3 md:p-4">
                  <span className="text-sm font-bold text-slate-600">
                    Kitap ekleme
                  </span>
                  <span className="shrink-0 text-sm font-black text-[#2E7D5B]">
                    {profile?.monthly_book_limit || 10}/ay
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAF7F0] p-3 md:p-4">
                  <span className="text-sm font-bold text-slate-600">
                    Arama kaydı
                  </span>
                  <span className="shrink-0 text-sm font-black text-[#2E7D5B]">
                    {profile?.monthly_request_limit || 10}/ay
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAF7F0] p-3 md:p-4">
                  <span className="text-sm font-bold text-slate-600">
                    Mesajlaşma
                  </span>
                  <span className="shrink-0 text-sm font-black text-[#2E7D5B]">
                    {profile?.monthly_message_limit || 30}/ay
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAF7F0] p-3 md:p-4">
                  <span className="text-sm font-bold text-slate-600">
                    Eşleşme
                  </span>
                  <span className="shrink-0 text-sm font-black text-[#2E7D5B]">
                    {profile?.monthly_match_limit || 10}/ay
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
              <h2 className="text-xl font-black md:text-2xl">Hesap İşlemleri</h2>
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