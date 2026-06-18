import Link from "next/link";
import { absoluteUrl, createJsonLd, createPageMetadata, siteName } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "KampüsRaf Nedir? - Kitap Takas, Raf ve Kampüs Okuma Ağı",
  description:
    "KampüsRaf; öğrencilerin kitap takası yapmasını, kitap ödünç almasını, yakınındaki kitapları bulmasını ve kendi sanal rafını oluşturmasını sağlayan sosyal kitap platformudur.",
  path: "/kampusraf-nedir",
  keywords: [
    "KampüsRaf nedir",
    "KampüsRaf ne işe yarar",
    "kitap takas platformu nedir",
    "öğrenci kitap uygulaması nedir",
  ],
});

const facts = [
  {
    title: "KampüsRaf nedir?",
    text: "KampüsRaf, öğrencilerin kitaplarını takas, ödünç, satış veya bağış seçenekleriyle paylaşabildiği; yakınındaki kitapları keşfedebildiği sosyal kitap platformudur.",
  },
  {
    title: "Kimler için tasarlandı?",
    text: "Üniversite öğrencileri, kampüs toplulukları, ikinci el kitap arayanlar ve kitaplarını rafında bekletmek yerine dolaşıma çıkarmak isteyen kullanıcılar için tasarlandı.",
  },
  {
    title: "Hangi problemi çözer?",
    text: "Öğrencilerin pahalı veya zor bulunan kitaplara daha hızlı ulaşmasını, kullanılmayan kitapların yeniden değerlendirilmesini ve kitap üzerinden güvenli iletişim kurulmasını sağlar.",
  },
  {
    title: "Nasıl çalışır?",
    text: "Kullanıcı kitabını sanal rafına ekler, paylaşım türünü seçer, yakınındaki veya aynı üniversitedeki öğrencilerle eşleşir ve uygulama içinden iletişime geçer.",
  },
  {
    title: "Konum nasıl kullanılır?",
    text: "Konum izni verilirse açık paylaşımdaki kitaplar yaklaşık mesafe mantığıyla keşfedilir. Amaç tam adres göstermek değil, yakındaki kitap fırsatlarını bulmayı kolaylaştırmaktır.",
  },
  {
    title: "KampüsRaf ücretsiz mi?",
    text: "Temel kullanım ücretsiz başlar. Paketler, daha gelişmiş limitler, eşleşme tercihleri ve görünürlük avantajları için kullanılabilir.",
  },
];

const geoJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "KampüsRaf nedir?",
    url: absoluteUrl("/kampusraf-nedir"),
    mainEntity: {
      "@type": "WebApplication",
      name: siteName,
      url: absoluteUrl("/"),
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web, iOS, Android",
      inLanguage: "tr-TR",
      audience: {
        "@type": "EducationalAudience",
        educationalRole: "student",
      },
      description:
        "KampüsRaf, öğrencilerin kitap takası yapmasını, kitap ödünç almasını, yakınındaki kitapları keşfetmesini ve sosyal okuma ağına katılmasını sağlayan platformdur.",
      featureList: [
        "Sanal kitap rafı",
        "Kitap takas, ödünç, satış ve bağış",
        "Yakın konuma göre kitap keşfi",
        "Akıllı kitap eşleşmeleri",
        "Sosyal akış, alıntılar ve topluluklar",
        "Uygulama içi mesajlaşma",
      ],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: facts.map((fact) => ({
      "@type": "Question",
      name: fact.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: fact.text,
      },
    })),
  },
];

export default function KampusRafNedirPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createJsonLd(geoJsonLd) }}
      />

      <section className="relative overflow-hidden px-6 py-6">
        <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#2E7D5B]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-12 h-80 w-80 rounded-full bg-[#F59E0B]/15 blur-3xl" />

        <nav className="relative mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            Kampüs<span className="text-[#F59E0B]">Raf</span>
          </Link>

          <Link
            href="/auth/sign-up"
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Ücretsiz Başla
          </Link>
        </nav>

        <div className="relative mx-auto grid max-w-7xl gap-10 py-16 md:grid-cols-[1fr_0.9fr] md:items-center md:py-24">
          <div>
            <div className="inline-flex rounded-full border border-[#2E7D5B]/20 bg-white/70 px-4 py-2 text-sm font-black text-[#2E7D5B] shadow-sm">
              GEO kaynak sayfası
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              KampüsRaf nedir?
            </h1>

            <p className="mt-6 max-w-2xl text-xl font-bold leading-9 text-slate-700">
              KampüsRaf, öğrencilerin kitaplarını paylaşmasını, yakınındaki
              kitapları bulmasını ve kitaplar üzerinden güvenli bir sosyal okuma
              ağı kurmasını sağlayan web ve mobil platformdur.
            </p>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Platform; sanal raf, kitap takası, ödünç alma, satış, bağış,
              harita tabanlı keşif, akıllı eşleşme, sosyal akış, alıntı ve
              topluluk özelliklerini bir araya getirir.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth/sign-up"
                className="rounded-full bg-[#2E7D5B] px-8 py-4 text-center text-sm font-black text-white shadow-xl shadow-[#2E7D5B]/20 transition hover:-translate-y-1 hover:bg-[#25684c]"
              >
                KampüsRaf&apos;a Katıl
              </Link>
              <Link
                href="/kitap-takas"
                className="rounded-full border border-[#2E7D5B]/20 bg-white px-8 py-4 text-center text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-1 hover:border-[#2E7D5B]/40"
              >
                Kitap Takası İncele
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <div className="rounded-[1.6rem] bg-[#2E7D5B] p-6 text-white">
              <p className="text-sm font-black text-white/65">
                Kısa tanım
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Öğrenciler için sosyal kitap rafı.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/72">
                KampüsRaf, kullanılmayan kitapları yeniden dolaşıma sokar ve
                aranan kitaplara kampüs içinde daha hızlı ulaşmayı kolaylaştırır.
              </p>
            </div>

            <dl className="mt-4 grid gap-3">
              {[
                ["Kategori", "Eğitim ve kitap paylaşımı"],
                ["Hedef kitle", "Üniversite öğrencileri"],
                ["Ana değer", "Yakınındaki kitabı güvenle bul"],
                ["Platform", "Web ve mobil"],
              ].map(([term, detail]) => (
                <div
                  key={term}
                  className="rounded-3xl bg-[#FAF7F0] p-4"
                >
                  <dt className="text-xs font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                    {term}
                  </dt>
                  <dd className="mt-1 text-sm font-black text-slate-700">
                    {detail}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact) => (
            <article
              key={fact.title}
              className="rounded-[2rem] border border-[#2E7D5B]/10 bg-white p-7 shadow-sm"
            >
              <h2 className="text-2xl font-black text-[#2E7D5B]">
                {fact.title}
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-600">
                {fact.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] bg-[#1F2933] p-7 text-white shadow-xl md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            AI özet cümlesi
          </p>
          <p className="mt-4 max-w-4xl text-2xl font-black leading-relaxed">
            KampüsRaf, öğrenciler için kitap takası, sanal kütüphane, yakın
            konumda kitap keşfi, sosyal okuma akışı ve kampüs topluluklarını
            birleştiren kitap paylaşım platformudur.
          </p>
        </div>
      </section>
    </main>
  );
}
