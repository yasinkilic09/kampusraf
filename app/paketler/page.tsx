import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePlanAction } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/server";

const packages = [
  {
    name: "Ücretsiz",
    type: "free",
    price: "₺0",
    description:
      "KampüsRaf’ı denemek ve temel kitap paylaşım akışını kullanmak isteyen öğrenciler için.",
    limits: [
      "Ayda 10 kitap ekleme",
      "Ayda 10 arama kaydı",
      "Ayda 30 mesaj gönderme",
      "Ayda 10 eşleşme",
    ],
    features: [
      "Kitap ekleme",
      "Kitap arama",
      "Mesajlaşma",
      "Temel eşleşme sistemi",
    ],
    highlight: false,
  },
  {
    name: "Plus",
    type: "plus",
    price: "₺29",
    description:
      "Daha aktif kullanan öğrenciler için daha yüksek limitli kişisel paket.",
    limits: [
      "Ayda 30 kitap ekleme",
      "Ayda 30 arama kaydı",
      "Ayda 100 mesaj gönderme",
      "Ayda 40 eşleşme",
    ],
    features: [
      "Daha yüksek görünürlük",
      "Daha fazla mesaj hakkı",
      "Gelişmiş eşleşme hazırlığı",
      "Öncelikli geliştirme özellikleri",
    ],
    highlight: true,
  },
  {
    name: "Premium",
    type: "premium",
    price: "₺59",
    description:
      "Yoğun kitap takası yapan, dönem boyunca aktif kalan öğrenciler için.",
    limits: [
      "Ayda 75 kitap ekleme",
      "Ayda 75 arama kaydı",
      "Ayda 300 mesaj gönderme",
      "Ayda 150 eşleşme",
    ],
    features: [
      "Geniş kullanım hakkı",
      "Daha güçlü eşleşme potansiyeli",
      "Profil görünürlüğü hazırlığı",
      "Gelişmiş kampüs ağı kullanımı",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    type: "pro",
    price: "₺149",
    description:
      "Kulüp, topluluk, sınıf temsilcisi veya kampüs içi kitap ağı yöneten kullanıcılar için.",
    limits: [
      "Ayda 200 kitap ekleme",
      "Ayda 200 arama kaydı",
      "Ayda 1000 mesaj gönderme",
      "Ayda 500 eşleşme",
    ],
    features: [
      "Topluluk kullanımına uygun yapı",
      "Yüksek işlem limitleri",
      "Kampüs temsilcisi kullanım senaryosu",
      "Gelecekte yönetim paneli hazırlığı",
    ],
    highlight: false,
  },
];

type SearchParams = {
  success?: string;
  error?: string;
};

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

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
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
                Paketler
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
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            KampüsRaf Paketleri
          </p>

          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
            Kullanımına göre paketini seç.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
            KampüsRaf şu an MVP aşamasında. Paketler, ileride ödeme sistemi ve
            abonelik altyapısı bağlandığında kullanılmak üzere hazırlanmıştır.
            Şimdilik kullanım limitlerini göstermek ve sistemi ölçeklenebilir
            hale getirmek için kullanılır.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-8">
            <Link
              href="/profilim"
              className="w-full rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-1 sm:w-auto"
            >
              Mevcut Paketimi Gör
            </Link>

            <Link
              href="/dashboard"
              className="w-full rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/10 sm:w-auto"
            >
              Panele Dön
            </Link>
          </div>
        </div>

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

        <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2 xl:grid-cols-4">
          {packages.map((item) => (
            <article
              key={item.type}
              className={`relative overflow-hidden rounded-[1.7rem] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem] md:p-7 ${
                item.highlight ? "ring-2 ring-[#F59E0B]" : ""
              }`}
            >
              {item.highlight && (
                <div className="absolute right-4 top-4 rounded-full bg-[#F59E0B] px-3 py-1 text-[11px] font-black text-white">
                  Önerilen
                </div>
              )}

              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#2E7D5B]">
                {item.name}
              </p>

              {currentPlan === item.type && (
  <div className="mt-3 inline-flex rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-[11px] font-black text-[#2E7D5B]">
    Aktif paket
  </div>
)}

              <div className="mt-4 flex items-end gap-1">
                <p className="text-4xl font-black text-[#1F2933]">
                  {item.price}
                </p>
                <p className="pb-1 text-sm font-bold text-slate-400">/ ay</p>
              </div>

              <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-500">
                {item.description}
              </p>

              <div className="mt-5 rounded-2xl bg-[#FAF7F0] p-4">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                  Limitler
                </p>

                <div className="mt-3 grid gap-2">
                  {item.limits.map((limit) => (
                    <p
                      key={limit}
                      className="text-sm font-semibold text-slate-600"
                    >
                      ✓ {limit}
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {item.features.map((feature) => (
                  <p
                    key={feature}
                    className="text-sm font-semibold text-slate-600"
                  >
                    • {feature}
                  </p>
                ))}
              </div>

             <form action={updatePlanAction} className="mt-6">
  <input type="hidden" name="planType" value={item.type} />

  <button
    type="submit"
    disabled={currentPlan === item.type}
    className={`block w-full rounded-full px-5 py-3 text-center text-sm font-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
      currentPlan === item.type
        ? "bg-slate-200 text-slate-500"
        : item.highlight
          ? "bg-[#F59E0B] text-white"
          : "bg-[#2E7D5B] text-white"
    }`}
  >
    {currentPlan === item.type ? "Mevcut Paket" : "Bu Paketi Seç"}
  </button>
</form>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-[1.7rem] border border-[#2E7D5B]/10 bg-white p-5 shadow-sm md:mt-8 md:rounded-[2rem] md:p-7">
          <h2 className="text-xl font-black md:text-2xl">
            Ödeme sistemi henüz aktif değil
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Bu sayfa şu an paket modelini ve kullanım limitlerini göstermek için
            hazırlandı. Sonraki aşamada Stripe, iyzico veya PayTR gibi ödeme
            altyapılarından biriyle paket yükseltme akışı bağlanabilir.
          </p>
        </div>
      </section>
    </main>
  );
}