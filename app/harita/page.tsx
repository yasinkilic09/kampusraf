import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { NearbyBooksMap } from "@/components/nearby-books-map";
import {
  getMatchDistanceConfig,
  normalizeDistanceRadiusForPlan,
  normalizePlanType,
} from "@/lib/match-plans";
import { createClient } from "@/lib/supabase/server";

function isDistancePreferenceColumnError(error?: { code?: string; message?: string } | null) {
  if (!error) return false;

  const message = error.message?.toLocaleLowerCase("tr-TR") || "";

  return error.code === "42703" || error.code === "PGRST204" || message.includes("match_distance_");
}

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const profileResult = await supabase
    .from("profiles")
    .select("plan_type, match_distance_radius_km, match_distance_preference_enabled")
    .eq("id", user.id)
    .maybeSingle();

  let profile = profileResult.data;

  if (isDistancePreferenceColumnError(profileResult.error)) {
    const fallbackResult = await supabase
      .from("profiles")
      .select("plan_type")
      .eq("id", user.id)
      .maybeSingle();

    profile = fallbackResult.data as typeof profile;
  }

  const planType = normalizePlanType(profile?.plan_type);
  const distanceConfig = getMatchDistanceConfig(planType);
  const preferredRadius = normalizeDistanceRadiusForPlan(
    Number(profile?.match_distance_radius_km || distanceConfig.radiusKm),
    planType
  );

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <AppHeader
        subtitle="Yakındaki kitaplar"
        active="harita"
        actions={
          <Link
            href="/kitap-ekle"
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Kitap Ekle
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="mb-6 overflow-hidden rounded-[1.8rem] bg-[#1F2933] text-white shadow-xl shadow-slate-900/10 md:mb-8 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#2E7D5B]/35 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-[#F59E0B]/25 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Kampüs Haritası
                </p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
                  Yakınındaki açık rafları keşfet.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 md:text-base">
                  Takas, ödünç, satış veya bağışa açık kitapları konuma göre
                  gör. Konum verisi yaklaşıklaştırılır ve istediğin an
                  kapatılabilir.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-80">
                {[
                  ["1", "İzin ver"],
                  ["2", "Yakını bul"],
                  ["3", "Mesajlaş"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl bg-white/10 p-3 text-center">
                    <p className="text-xl font-black md:text-2xl">{value}</p>
                    <p className="mt-1 text-[11px] font-bold text-white/65">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <NearbyBooksMap
          initialDistanceSettings={{
            planType,
            radiusKm: preferredRadius,
            matchDistancePreferenceEnabled:
              profile?.match_distance_preference_enabled ?? true,
          }}
        />
      </section>
    </main>
  );
}
