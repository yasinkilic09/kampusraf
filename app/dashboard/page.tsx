import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { count: myBooksCount } = await supabase
    .from("user_books")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: requestsCount } = await supabase
    .from("book_requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: messagesCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-6 py-5 backdrop-blur">
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
                Öğrenci paneli
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
  Kitap Ara
</Link>
<Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
  Kitap Ekle
</Link>
<Link href="/aradigim-kitaplar" className="hover:text-[#2E7D5B]">
  Aradığım Kitaplar
</Link>
<Link href="/mesajlar" className="hover:text-[#2E7D5B]">
  Mesajlar
</Link>
<Link href="/takaslar" className="hover:text-[#2E7D5B]">
  Takaslar
</Link>
<Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
  Eşleşmeler
</Link>
<Link href="/ogrenci-dogrulama" className="hover:text-[#2E7D5B]">
  Doğrulama
</Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-[2rem] bg-[#2E7D5B] p-8 text-white shadow-2xl shadow-[#2E7D5B]/20 md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Hoş geldin
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
            {profile?.full_name || user.email}
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">
            Bugün rafındaki kitapları paylaşabilir, aradığın kitapları
            keşfedebilir ve yakınındaki öğrencilerle iletişime geçebilirsin.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/kitap-ekle"
              className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-1"
            >
              Kitap Ekle
            </Link>
            <Link
              href="/kitap-ara"
              className="rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/10"
            >
              Kitap Ara
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-[2rem] bg-white p-7 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Kitaplarım</p>
            <p className="mt-3 text-4xl font-black text-[#2E7D5B]">
              {myBooksCount || 0}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Sisteme eklediğin kitap sayısı.
            </p>
          </div>

          <div className="rounded-[2rem] bg-white p-7 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Aradığım Kitaplar
            </p>
            <p className="mt-3 text-4xl font-black text-[#F59E0B]">
              {requestsCount || 0}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Takip ettiğin kitap talepleri.
            </p>
          </div>

          <div className="rounded-[2rem] bg-white p-7 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Yeni Mesajlar</p>
            <p className="mt-3 text-4xl font-black text-[#2E7D5B]">
              {messagesCount || 0}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Okunmamış mesaj sayısı.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black">Hızlı Başlangıç</h2>
            <div className="mt-5 grid gap-3">
              <Link
                href="/kitap-ekle"
                className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-black text-[#2E7D5B] transition hover:bg-[#F5EBDD]"
              >
                📚 Rafındaki ilk kitabı ekle
              </Link>
              <Link
  href="/kitap-ara"
  className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-black text-[#2E7D5B] transition hover:bg-[#F5EBDD]"
>
  🔎 Aradığın kitabı kampüste ara
</Link>

<Link
  href="/takaslar"
  className="rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
>
  <p className="text-2xl">🤝</p>
  <h3 className="mt-3 font-black text-[#1F2933]">Takaslarım</h3>
  <p className="mt-2 text-sm text-slate-500">
    Aktif ve geçmiş takas süreçlerini takip et.
  </p>
</Link>

<Link
  href="/aradigim-kitaplar"
  className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-black text-[#2E7D5B] transition hover:bg-[#F5EBDD]"
>
  📌 Bulamadığın kitabı takip listene ekle
</Link>

<Link
  href="/eslesmeler"
  className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-black text-[#2E7D5B] transition hover:bg-[#F5EBDD]"
>
  ✨ Kitap eşleşmelerini görüntüle
</Link>

<Link
  href="/profilim"
  className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-black text-[#2E7D5B] transition hover:bg-[#F5EBDD]"
>
  👤 Profil bilgilerini tamamla
</Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black">KampüsRaf Mantığı</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                <strong className="text-[#2E7D5B]">1.</strong> Kitabını sisteme
                ekle.
              </p>
              <p>
                <strong className="text-[#2E7D5B]">2.</strong> Başka öğrenciler
                arama yaptığında kitabını görebilsin.
              </p>
              <p>
                <strong className="text-[#2E7D5B]">3.</strong> Mesajlaşarak
                takas, ödünç veya paylaşım sürecini başlat.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}