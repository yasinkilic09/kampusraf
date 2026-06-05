import Link from "next/link";
import { redirect } from "next/navigation";
import { RandomQuoteClient } from "@/components/random-quote-client";
import { createClient } from "@/lib/supabase/server";

function getDailyRollLimit(planType?: string | null) {
  if (planType === "plus") return 3;
  if (planType === "premium") return 10;
  if (planType === "pro") return 25;
  return 2;
}

export default async function RandomQuotePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const planType = profile?.plan_type || "free";
  const rollsLimit = getDailyRollLimit(planType);
  const today = new Date().toISOString().slice(0, 10);

  const { count } = await supabase
    .from("quote_rolls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("roll_date", today);

  const rollsUsed = count || 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🎲
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Rastgele Raf
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
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
          </nav>

          <Link
            href="/kitap-ara"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Kitap Ara
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Günlük Kitap Keşfi
                </p>

                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
                  Rastgele bir alıntı, yeni bir kitabın kapısını açabilir.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Zar at, kısa bir alıntı keşfet. İstersen sesli dinle,
                  istersen kitabı arama yolculuğuna dönüştür.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {rollsUsed}/{rollsLimit}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Bugünkü Hak
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {Math.max(rollsLimit - rollsUsed, 0)}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Kalan Zar
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {planType.toUpperCase()}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Paket
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">🔊</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Dinleme
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 md:mt-8">
          <RandomQuoteClient
            initialRollsUsed={rollsUsed}
            initialRollsLimit={rollsLimit}
            planType={planType}
          />
        </section>
      </section>
    </main>
  );
}