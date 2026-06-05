import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePlanAction } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/server";

type PackageDefinition = {
  name: string;
  type: "free" | "plus" | "premium" | "pro";
  price: string;
  monthlyLabel: string;
  shortDescription: string;
  description: string;
  limits: {
    books: number;
    requests: number;
    messages: number;
    matches: number;
  };
  features: string[];
  bestFor: string;
  highlight: boolean;
  accent: "green" | "amber" | "purple" | "dark";
};

const packages: PackageDefinition[] = [
  {
    name: "Ücretsiz",
    type: "free",
    price: "₺0",
    monthlyLabel: "/ ay",
    shortDescription: "Başlangıç",
    description:
      "KampüsRaf’ı denemek ve temel kitap paylaşım akışını kullanmak isteyen öğrenciler için.",
    limits: {
      books: 10,
      requests: 10,
      messages: 30,
      matches: 10,
    },
    features: [
      "Kitap ekleme",
      "Kitap arama",
      "Mesajlaşma",
      "Temel eşleşme sistemi",
      "Profil ve güven kartı",
    ],
    bestFor: "Uygulamayı yeni deneyen öğrenciler",
    highlight: false,
    accent: "green",
  },
  {
    name: "Plus",
    type: "plus",
    price: "₺29",
    monthlyLabel: "/ ay",
    shortDescription: "Daha aktif kullanım",
    description:
      "Daha aktif kullanan öğrenciler için daha yüksek limitli kişisel paket.",
    limits: {
      books: 30,
      requests: 30,
      messages: 100,
      matches: 40,
    },
    features: [
      "Daha yüksek kullanım limitleri",
      "Daha fazla mesaj hakkı",
      "Daha fazla eşleşme takibi",
      "Gelişmiş filtre kullanımına hazırlık",
      "Aktif dönem kullanımı için ideal",
    ],
    bestFor: "Dönem içinde düzenli kitap takası yapanlar",
    highlight: true,
    accent: "amber",
  },
  {
    name: "Premium",
    type: "premium",
    price: "₺59",
    monthlyLabel: "/ ay",
    shortDescription: "Gelişmiş eşleşme",
    description:
      "Yoğun kitap takası yapan, dönem boyunca aktif kalan ve daha isabetli eşleşme isteyen öğrenciler için.",
    limits: {
      books: 75,
      requests: 75,
      messages: 300,
      matches: 150,
    },
    features: [
      "Geniş kullanım hakkı",
      "Daha güçlü eşleşme potansiyeli",
      "Eşleşme tercihleri kullanımı",
      "Profil görünürlüğü avantajı",
      "Yoğun kampüs kullanımı için ideal",
    ],
    bestFor: "Sık kitap arayan ve takas yapan öğrenciler",
    highlight: false,
    accent: "purple",
  },
  {
    name: "Pro",
    type: "pro",
    price: "₺149",
    monthlyLabel: "/ ay",
    shortDescription: "Topluluk seviyesi",
    description:
      "Kulüp, topluluk, sınıf temsilcisi veya kampüs içi kitap ağı yöneten kullanıcılar için.",
    limits: {
      books: 200,
      requests: 200,
      messages: 1000,
      matches: 500,
    },
    features: [
      "Topluluk kullanımına uygun yapı",
      "Yüksek işlem limitleri",
      "Geniş kampüs ağı kullanımı",
      "Toplu kitap paylaşım senaryosu",
      "Gelecekte yönetim paneli hazırlığı",
    ],
    bestFor: "Kulüp, topluluk ve temsilci kullanımı",
    highlight: false,
    accent: "dark",
  },
];

type SearchParams = {
  success?: string;
  error?: string;
};

function getAccentClasses(accent: PackageDefinition["accent"]) {
  if (accent === "amber") {
    return {
      badge: "bg-[#F59E0B]/10 text-[#B45309]",
      button: "bg-[#F59E0B] text-white hover:bg-[#d98b08]",
      ring: "ring-[#F59E0B]",
      icon: "bg-[#F59E0B]/10 text-[#B45309]",
    };
  }

  if (accent === "purple") {
    return {
      badge: "bg-purple-50 text-purple-700",
      button: "bg-purple-600 text-white hover:bg-purple-700",
      ring: "ring-purple-200",
      icon: "bg-purple-50 text-purple-700",
    };
  }

  if (accent === "dark") {
    return {
      badge: "bg-slate-100 text-slate-700",
      button: "bg-[#1F2933] text-white hover:bg-black",
      ring: "ring-slate-200",
      icon: "bg-slate-100 text-slate-700",
    };
  }

  return {
    badge: "bg-[#2E7D5B]/10 text-[#2E7D5B]",
    button: "bg-[#2E7D5B] text-white hover:bg-[#25684c]",
    ring: "ring-[#2E7D5B]/10",
    icon: "bg-[#2E7D5B]/10 text-[#2E7D5B]",
  };
}

function getPlanLabel(planType: string) {
  if (planType === "plus") return "Plus";
  if (planType === "premium") return "Premium";
  if (planType === "pro") return "Pro";
  return "Ücretsiz";
}

function getTotalLimit(packageItem: PackageDefinition) {
  return (
    packageItem.limits.books +
    packageItem.limits.requests +
    packageItem.limits.messages +
    packageItem.limits.matches
  );
}

function LimitRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FAF7F0] px-4 py-3">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <span className="text-sm font-black text-[#1F2933]">{value}</span>
    </div>
  );
}

export default async function PackagesPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("id", user.id)
    .single();

  const currentPlan = profile?.plan_type || "free";
  const currentPackage =
    packages.find((item) => item.type === currentPlan) || packages[0];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              💳
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Paket merkezi
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
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
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
                  Paket Merkezi
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Kullanımına göre KampüsRaf paketini seç.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Paketler şu an MVP altyapısında kullanım limitlerini ve
                  premium özellik hazırlığını yönetmek için kullanılır. Ödeme
                  entegrasyonu henüz aktif değildir.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/profilim"
                    className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                  >
                    Mevcut Paketimi Gör
                  </Link>

                  <Link
                    href="/dashboard"
                    className="rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Panele Dön
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-white/10 p-4 backdrop-blur sm:min-w-[340px]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
                  Aktif Paket
                </p>

                <p className="mt-2 text-3xl font-black">
                  {getPlanLabel(currentPlan)}
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-white/65">
                  {currentPackage.shortDescription}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/10 p-3 text-center">
                    <p className="text-xl font-black">
                      {currentPackage.limits.messages}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-white/60">
                      Mesaj
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-3 text-center">
                    <p className="text-xl font-black">
                      {currentPackage.limits.matches}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-white/60">
                      Eşleşme
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success && (
          <div className="mt-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B] md:mt-6">
            Paket seçimin başarıyla güncellendi.
          </div>
        )}

        {params.error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2 xl:grid-cols-4">
          {packages.map((item) => {
            const isCurrent = currentPlan === item.type;
            const accent = getAccentClasses(item.accent);

            return (
              <article
                key={item.type}
                className={`relative flex min-h-full flex-col overflow-hidden rounded-[1.7rem] bg-white p-5 shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem] md:p-6 ${
                  item.highlight ? `ring-2 ${accent.ring}` : "ring-[#2E7D5B]/5"
                }`}
              >
                {item.highlight && (
                  <div className="absolute right-4 top-4 rounded-full bg-[#F59E0B] px-3 py-1 text-[11px] font-black text-white shadow-sm">
                    Önerilen
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute left-4 top-4 rounded-full bg-[#2E7D5B] px-3 py-1 text-[11px] font-black text-white shadow-sm">
                    Aktif Paket
                  </div>
                )}

                <div className={isCurrent || item.highlight ? "pt-8" : ""}>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${accent.icon}`}
                  >
                    {item.type === "free"
                      ? "🌱"
                      : item.type === "plus"
                        ? "⭐"
                        : item.type === "premium"
                          ? "🚀"
                          : "🏛️"}
                  </div>

                  <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
                    {item.name}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-[#1F2933]">
                    {item.shortDescription}
                  </h2>

                  <div className="mt-4 flex items-end gap-1">
                    <p className="text-4xl font-black text-[#1F2933]">
                      {item.price}
                    </p>
                    <p className="pb-1 text-sm font-bold text-slate-400">
                      {item.monthlyLabel}
                    </p>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>

                  <div className={`mt-5 rounded-2xl p-4 ${accent.badge}`}>
                    <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">
                      Kimler için?
                    </p>
                    <p className="mt-2 text-sm font-black">{item.bestFor}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  <LimitRow label="Kitap" value={item.limits.books} />
                  <LimitRow label="Arama" value={item.limits.requests} />
                  <LimitRow label="Mesaj" value={item.limits.messages} />
                  <LimitRow label="Eşleşme" value={item.limits.matches} />
                </div>

                <div className="mt-5 rounded-2xl border border-[#2E7D5B]/10 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                    Özellikler
                  </p>

                  <div className="mt-3 grid gap-2">
                    {item.features.map((feature) => (
                      <p
                        key={feature}
                        className="text-sm font-semibold leading-6 text-slate-600"
                      >
                        ✓ {feature}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Toplam Aylık Hak
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                    {getTotalLimit(item)}
                  </p>
                </div>

                <form action={updatePlanAction} className="mt-auto pt-6">
                  <input type="hidden" name="planType" value={item.type} />

                  <button
                    type="submit"
                    disabled={isCurrent}
                    className={`block w-full rounded-full px-5 py-3 text-center text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${
                      isCurrent
                        ? "bg-slate-200 text-slate-500"
                        : accent.button
                    }`}
                  >
                    {isCurrent ? "Mevcut Paket" : "Bu Paketi Seç"}
                  </button>
                </form>
              </article>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
              Paket Karşılaştırması
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Hangi paket sana uygun?
            </h2>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-sm font-black text-[#1F2933]">
                  Sadece birkaç kitap ekleyip denemek istiyorsan:
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Ücretsiz paket yeterli olur.
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-sm font-black text-[#1F2933]">
                  Dönem içinde düzenli kitap arıyorsan:
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Plus daha dengeli bir kullanım sunar.
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-sm font-black text-[#1F2933]">
                  Eşleşme tercihleri ve yoğun kullanım istiyorsan:
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Premium daha uygun olur.
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-sm font-black text-[#1F2933]">
                  Topluluk veya kulüp adına kullanacaksan:
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Pro paketi tercih edebilirsin.
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                Ödeme Durumu
              </p>

              <h3 className="mt-2 text-xl font-black">
                Ödeme sistemi henüz aktif değil.
              </h3>

              <p className="mt-3 text-sm leading-7 text-white/70">
                Bu sayfa şu an paket modelini, kullanım limitlerini ve plan
                seçimini test etmek için kullanılır. Sonraki aşamada Stripe,
                iyzico veya PayTR gibi ödeme altyapıları bağlanabilir.
              </p>
            </section>

            <section className="rounded-[1.8rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Paket Notu
              </p>

              <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600">
                <p className="rounded-2xl bg-[#FAF7F0] p-3">
                  ✓ Paket seçimi profilindeki kullanım limitlerini etkiler.
                </p>
                <p className="rounded-2xl bg-[#FAF7F0] p-3">
                  ✓ Premium ve Pro paketler gelişmiş eşleşme tercihleri için
                  hazırlanmıştır.
                </p>
                <p className="rounded-2xl bg-[#FAF7F0] p-3">
                  ✓ Şimdilik gerçek ödeme alınmaz; MVP test altyapısıdır.
                </p>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                Hızlı Erişim
              </p>

              <div className="mt-4 grid gap-3">
                <Link
                  href="/profilim"
                  className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Profilime Git
                </Link>

                <Link
                  href="/kitap-ara"
                  className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  Kitap Ara
                </Link>

                <Link
                  href="/mesajlar"
                  className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  Mesajlara Git
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}