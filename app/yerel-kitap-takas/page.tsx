import Link from "next/link";
import {
  geoSeoHubFaq,
  geoSeoPages,
} from "@/lib/geo-seo-content";
import {
  absoluteUrl,
  createJsonLd,
  createPageMetadata,
  siteName,
} from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Yerel Kitap Takas - Şehir ve Kampüs Bazlı Kitap Paylaşımı",
  description:
    "İstanbul, Ankara, İzmir, Eskişehir, Bursa ve diğer öğrenci şehirlerinde kitap takas, ikinci el kitap, ödünç kitap ve yakındaki kitapları bulma rehberi.",
  path: "/yerel-kitap-takas",
  keywords: [
    "yerel kitap takas",
    "şehir bazlı kitap takas",
    "yakınımdaki kitaplar",
    "kampüs kitap paylaşımı",
  ],
});

const hubJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Yerel kitap takas rehberi",
    url: absoluteUrl("/yerel-kitap-takas"),
    description:
      "Türkiye'deki öğrenci şehirleri için kitap takas, ikinci el kitap, ödünç kitap ve yakın kitap keşfi rehberleri.",
    inLanguage: "tr-TR",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: absoluteUrl("/"),
    },
    about: [
      "şehir bazlı kitap takas",
      "yakındaki kitaplar",
      "kampüs kitap paylaşımı",
      "öğrenci kitap platformu",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Şehir bazlı kitap takas sayfaları",
    numberOfItems: geoSeoPages.length,
    itemListElement: geoSeoPages.map((page, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: page.shortTitle,
      url: absoluteUrl(`/yerel-kitap-takas/${page.slug}`),
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: geoSeoHubFaq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana sayfa",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Yerel Kitap Takas",
        item: absoluteUrl("/yerel-kitap-takas"),
      },
    ],
  },
];

export default function YerelKitapTakasPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createJsonLd(hubJsonLd) }}
      />

      <section className="relative overflow-hidden px-6 py-6">
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#2E7D5B]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#F59E0B]/15 blur-3xl" />

        <nav className="relative mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            Kampüs<span className="text-[#F59E0B]">Raf</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/kitap-rehberi"
              className="hidden rounded-full px-5 py-2.5 text-sm font-bold text-[#2E7D5B] transition hover:bg-white md:inline-flex"
            >
              Kitap Rehberi
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
            >
              Ücretsiz Başla
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-7xl gap-10 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-24">
          <div>
            <div className="inline-flex rounded-full border border-[#2E7D5B]/20 bg-white/70 px-4 py-2 text-sm font-black text-[#2E7D5B] shadow-sm">
              Şehir ve kampüs bazlı kitap keşfi
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Türkiye&apos;deki öğrenci şehirlerinde kitap takas ve yakın kitap keşfi.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              KampüsRaf, kitap paylaşımını yalnızca genel bir liste olarak değil;
              şehir, üniversite, yaklaşık mesafe ve paylaşım türü bağlamıyla ele
              alır. Böylece arayan öğrenci kendi şehrindeki rafları daha anlamlı
              keşfedebilir.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth/sign-up"
                className="rounded-full bg-[#2E7D5B] px-8 py-4 text-center text-sm font-black text-white shadow-xl shadow-[#2E7D5B]/20 transition hover:-translate-y-1 hover:bg-[#25684c]"
              >
                Şehrinde Raf Oluştur
              </Link>
              <Link
                href="/kitap-rehberi/yakindaki-kitaplar"
                className="rounded-full border border-[#2E7D5B]/20 bg-white px-8 py-4 text-center text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-1 hover:border-[#2E7D5B]/40"
              >
                Yakındaki Kitapları Öğren
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <div className="rounded-[1.6rem] bg-[#2E7D5B] p-6 text-white">
              <p className="text-sm font-black text-white/65">
                Yerel arama odağı
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Kitap araması şehirden ve kampüsten başlar.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/70">
                İstanbul, Ankara, İzmir, Eskişehir ve diğer öğrenci şehirleri
                için yerel kitap paylaşım sayfaları; arama motorlarına ve AI
                cevap motorlarına daha net bağlam verir.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Şehir", "Üniversite", "Yakınlık", "Takas", "Ödünç", "Bağış"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-3xl bg-[#FAF7F0] p-4 text-sm font-black text-slate-700"
                  >
                    {item}
                  </div>
                )
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            Şehir rehberleri
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Öğrencilerin kitap aradığı yerel bağlamları görünür kıl.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {geoSeoPages.map((page) => (
            <Link
              key={page.slug}
              href={`/yerel-kitap-takas/${page.slug}`}
              className="group rounded-[2rem] border border-[#2E7D5B]/10 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                {page.region}
              </p>
              <h3 className="mt-4 text-2xl font-black text-[#2E7D5B]">
                {page.shortTitle}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                {page.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {page.universities.slice(0, 3).map((university) => (
                  <span
                    key={university}
                    className="rounded-full bg-[#FAF7F0] px-3 py-1 text-xs font-black text-slate-600"
                  >
                    {university}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-sm font-black text-[#F59E0B] transition group-hover:translate-x-1">
                Şehir rehberini oku →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] bg-[#1F2933] p-8 text-white md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            Sık sorulanlar
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {geoSeoHubFaq.map((item) => (
              <article
                key={item.question}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <h2 className="text-lg font-black">{item.question}</h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/70">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
