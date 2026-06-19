import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { redirectIfBanned } from "@/lib/account-status";
import { getDailyWordForUser } from "@/lib/daily-word";
import { createPrivatePageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "Kelime Sözlüğü",
  description:
    "KampüsRaf Kelime Sözlüğü, her gün kullanıcıya anlamı ve örnek cümlesiyle yeni bir kelime sunar.",
  path: "/kelime-sozlugu",
});

export default async function DailyWordPage() {
  await redirectIfBanned();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const dailyWord = await getDailyWordForUser(user.id);
  const isAdmin = profile?.role === "admin";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <AppHeader
        subtitle="Kelime Sözlüğü"
        active="kelime-sozlugu"
        actions={
          isAdmin ? (
            <Link
              href="/admin/kelimeler"
              className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
            >
              Kelime yönetimi
            </Link>
          ) : null
        }
      />

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Günün Kelimesi
                </p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
                  Okuma alışkanlığı biraz da kelime hazinesiyle büyür.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
                  Her gün anlamı ve örnek cümlesiyle yeni bir kelime keşfet.
                  Günlük kelime, hesabına göre o gün boyunca sabit kalır.
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
                  Bugünün tarihi
                </p>
                <p className="mt-2 text-2xl font-black">
                  {dailyWord?.dateLabel || "Hazırlanıyor"}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/65">
                  Kelimeler admin panelinden genişledikçe bu alan daha zengin
                  hale gelir.
                </p>
              </div>
            </div>
          </div>
        </section>

        {dailyWord ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#2E7D5B]/5 md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                  {dailyWord.category || "Kelime"}
                </span>
                <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#B45309]">
                  Günlük seçim
                </span>
              </div>

              <h2 className="mt-5 text-5xl font-black tracking-tight text-[#1F2933] md:text-7xl">
                {dailyWord.word}
              </h2>

              <div className="mt-6 rounded-[1.5rem] bg-[#FAF7F0] p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  Anlamı
                </p>
                <p className="mt-3 whitespace-pre-line text-lg font-bold leading-8 text-[#1F2933]">
                  {dailyWord.meaning}
                </p>
              </div>

              {dailyWord.example_sentence ? (
                <blockquote className="mt-5 rounded-[1.5rem] border-l-4 border-[#2E7D5B] bg-[#EAF5EF] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                    Örnek cümle
                  </p>
                  <p className="mt-3 text-base font-semibold leading-7 text-[#1F2933]">
                    {dailyWord.example_sentence}
                  </p>
                </blockquote>
              ) : null}

              {dailyWord.source_note ? (
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                  Kaynak notu: {dailyWord.source_note}
                </p>
              ) : null}
            </article>

            <aside className="grid gap-4 self-start">
              <div className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  Küçük Alışkanlık
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  Kelimeyi rafına taşı.
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Bugünün kelimesini bir alıntıda, kitap notunda veya paylaşımda
                  kullanmayı dene. Okuma belleği tekrar ettikçe kalıcı olur.
                </p>
                <div className="mt-5 grid gap-2">
                  <Link
                    href="/paylas"
                    className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                  >
                    Paylaşım yap
                  </Link>
                  <Link
                    href="/rastgele-raf"
                    className="rounded-full bg-[#FAF7F0] px-5 py-3 text-center text-sm font-black text-[#1F2933] transition hover:-translate-y-0.5"
                  >
                    Rastgele alıntı keşfet
                  </Link>
                </div>
              </div>
            </aside>
          </section>
        ) : (
          <section className="mt-6 rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-[#2E7D5B]/5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Henüz Hazır Değil
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Günlük kelime havuzu bekleniyor.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              Admin panelinden kelimeler eklendiğinde burada her gün yeni bir
              kelime ve anlamı görünecek.
            </p>
            {isAdmin ? (
              <Link
                href="/admin/kelimeler"
                className="mt-6 inline-flex rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                Kelime eklemeye git
              </Link>
            ) : null}
          </section>
        )}
      </section>
    </main>
  );
}
