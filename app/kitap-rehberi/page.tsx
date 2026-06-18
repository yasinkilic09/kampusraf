import Link from "next/link";
import {
  bookSeoHubFaq,
  bookSeoPages,
} from "@/lib/book-seo-content";
import {
  absoluteUrl,
  createJsonLd,
  createPageMetadata,
  siteName,
} from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Kitap Rehberi - Takas, İkinci El, Ödünç ve Sanal Kütüphane",
  description:
    "Kitap arayan, kitap paylaşmak isteyen ve sanal kütüphane oluşturmak isteyen öğrenciler için KampüsRaf kitap rehberi.",
  path: "/kitap-rehberi",
  keywords: [
    "kitap rehberi",
    "kitap arama",
    "kitap paylaşımı",
    "ikinci el kitap",
    "kitap takas",
    "sanal kütüphane",
  ],
});

const hubJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "KampüsRaf Kitap Rehberi",
    url: absoluteUrl("/kitap-rehberi"),
    description:
      "Öğrenciler için kitap takası, ikinci el kitap, ödünç alma, kitap bağışı, ders kitabı ve sanal kütüphane rehberleri.",
    inLanguage: "tr-TR",
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: absoluteUrl("/"),
    },
    hasPart: bookSeoPages.map((page) => ({
      "@type": "Article",
      name: page.title,
      url: absoluteUrl(`/kitap-rehberi/${page.slug}`),
      description: page.description,
      about: page.keywords,
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: bookSeoHubFaq.map((item) => ({
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
        name: "Kitap Rehberi",
        item: absoluteUrl("/kitap-rehberi"),
      },
    ],
  },
];

const featuredPages = bookSeoPages.slice(0, 4);
const remainingPages = bookSeoPages.slice(4);

export default function KitapRehberiPage() {
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
              href="/auth/login"
              className="hidden rounded-full px-5 py-2.5 text-sm font-bold text-[#2E7D5B] transition hover:bg-white md:inline-flex"
            >
              Giriş Yap
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
              Kitap arayanlar için rehber
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Kitap bulma, takas, ödünç alma ve sanal kütüphane rehberi.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              KampüsRaf Kitap Rehberi, öğrencilerin kitapla ilgili en sık
              aradığı konuları tek yerde toplar: ikinci el kitap, kitap takası,
              yakınındaki kitaplar, ders kitapları, kitap bağışı, alıntı
              paylaşımı ve sanal kütüphane.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth/sign-up"
                className="rounded-full bg-[#2E7D5B] px-8 py-4 text-center text-sm font-black text-white shadow-xl shadow-[#2E7D5B]/20 transition hover:-translate-y-1 hover:bg-[#25684c]"
              >
                Kitaplarını Rafa Ekle
              </Link>
              <Link
                href="/kitap-takas"
                className="rounded-full border border-[#2E7D5B]/20 bg-white px-8 py-4 text-center text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-1 hover:border-[#2E7D5B]/40"
              >
                Kitap Takasını İncele
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <div className="rounded-[1.6rem] bg-[#2E7D5B] p-6 text-white">
              <p className="text-sm font-black text-white/65">
                KampüsRaf arama odağı
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Kitapla ilgili ihtiyacı doğru sayfaya bağlar.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/70">
                Her rehber sayfası gerçek bir kullanıcı niyetine cevap verir ve
                KampüsRaf içindeki raf, harita, takas, topluluk ve mesajlaşma
                akışlarına bağlanır.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                "İkinci el",
                "Takas",
                "Ödünç",
                "Bağış",
                "Ders kitabı",
                "Yakındaki kitaplar",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl bg-[#FAF7F0] p-4 text-sm font-black text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            En çok aranan kitap konuları
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Kitap araması yapan kullanıcıyı doğru çözüme götüren sayfalar.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {featuredPages.map((page) => (
            <Link
              key={page.slug}
              href={`/kitap-rehberi/${page.slug}`}
              className="group rounded-[2rem] border border-[#2E7D5B]/10 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                {page.intent}
              </p>
              <h3 className="mt-4 text-2xl font-black text-[#2E7D5B]">
                {page.shortTitle}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                {page.summary}
              </p>
              <p className="mt-5 text-sm font-black text-[#F59E0B] transition group-hover:translate-x-1">
                Rehberi oku →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                Tüm rehberler
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Kitap ekosisteminin tamamını kapsayan içerik ağı.
              </h2>
            </div>
            <Link
              href="/kampusraf-nedir"
              className="text-sm font-black text-[#2E7D5B] transition hover:text-[#25684c]"
            >
              KampüsRaf nedir?
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {remainingPages.map((page) => (
              <Link
                key={page.slug}
                href={`/kitap-rehberi/${page.slug}`}
                className="group rounded-[1.5rem] bg-[#FAF7F0] p-5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
              >
                <h3 className="text-lg font-black text-[#2E7D5B]">
                  {page.shortTitle}
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  {page.description}
                </p>
                <p className="mt-4 text-sm font-black text-[#F59E0B] transition group-hover:translate-x-1">
                  Detaylar →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] bg-[#1F2933] p-8 text-white md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            Sık sorulanlar
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {bookSeoHubFaq.map((item) => (
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
