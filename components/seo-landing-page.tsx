import Link from "next/link";
import { absoluteUrl, createJsonLd, siteName } from "@/lib/seo";

type SeoLandingSection = {
  title: string;
  text: string;
};

type SeoLandingFaq = {
  question: string;
  answer: string;
};

type SeoLandingRelatedLink = {
  href: string;
  title: string;
  description: string;
};

type SeoLandingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  path: string;
  primaryKeyword: string;
  highlights: string[];
  sections: SeoLandingSection[];
  faq: SeoLandingFaq[];
  relatedLinks?: SeoLandingRelatedLink[];
};

export function SeoLandingPage({
  eyebrow,
  title,
  description,
  path,
  primaryKeyword,
  highlights,
  sections,
  faq,
  relatedLinks,
}: SeoLandingPageProps) {
  const pageUrl = absoluteUrl(path);
  const links =
    relatedLinks ||
    [
      {
        href: "/kitap-rehberi",
        title: "Kitap Rehberi",
        description:
          "İkinci el kitap, takas, ödünç alma, bağış ve sanal kütüphane rehberleri.",
      },
      {
        href: "/kampusraf-nedir",
        title: "KampüsRaf Nedir?",
        description:
          "KampüsRaf'ın sanal raf, harita, eşleşme ve sosyal okuma mantığını tanı.",
      },
      {
        href: "/yerel-kitap-takas",
        title: "Yerel Kitap Takas",
        description:
          "İstanbul, Ankara, İzmir ve öğrenci şehirlerinde yakın kitap keşfini incele.",
      },
      {
        href: "/",
        title: "KampüsRaf Ana Sayfa",
        description:
          "Öğrenciler için kitap paylaşımı, takas ve sosyal okuma platformuna dön.",
      },
    ];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: pageUrl,
      inLanguage: "tr-TR",
      isPartOf: {
        "@type": "WebSite",
        name: siteName,
        url: absoluteUrl("/"),
      },
      about: primaryKeyword,
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
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
          name: title,
          item: pageUrl,
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createJsonLd(jsonLd) }}
      />

      <section className="relative overflow-hidden px-6 py-6">
        <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#2E7D5B]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-12 h-80 w-80 rounded-full bg-[#F59E0B]/15 blur-3xl" />

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
              {eyebrow}
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {title}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              {description}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth/sign-up"
                className="rounded-full bg-[#2E7D5B] px-8 py-4 text-center text-sm font-black text-white shadow-xl shadow-[#2E7D5B]/20 transition hover:-translate-y-1 hover:bg-[#25684c]"
              >
                KampüsRaf&apos;a Katıl
              </Link>
              <Link
                href="/"
                className="rounded-full border border-[#2E7D5B]/20 bg-white px-8 py-4 text-center text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-1 hover:border-[#2E7D5B]/40"
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <div className="rounded-[1.6rem] bg-[#2E7D5B] p-6 text-white">
              <p className="text-sm font-black text-white/65">
                {primaryKeyword}
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Kitaplar rafta kalmasın.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/70">
                {siteName}, öğrencilerin kitap arama, paylaşma ve güvenli
                iletişim kurma sürecini tek sosyal deneyimde birleştirir.
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl bg-[#FAF7F0] p-4 text-sm font-black text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-5 md:grid-cols-3">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[2rem] border border-[#2E7D5B]/10 bg-white p-7 shadow-sm"
            >
              <h2 className="text-2xl font-black text-[#2E7D5B]">
                {section.title}
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-600">
                {section.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] bg-white p-7 shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            Sık sorulanlar
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {faq.map((item) => (
              <article key={item.question} className="rounded-3xl bg-[#FAF7F0] p-5">
                <h2 className="text-lg font-black text-[#1F2933]">
                  {item.question}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] bg-[#1F2933] p-7 text-white shadow-xl shadow-slate-900/10 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            İlgili KampüsRaf rehberleri
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">
            Bu konuyla birlikte aranan sayfalar.
          </h2>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[1.5rem] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:bg-white/10"
              >
                <h3 className="text-lg font-black">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/65">
                  {item.description}
                </p>
                <p className="mt-4 text-sm font-black text-[#F59E0B] transition group-hover:translate-x-1">
                  İncele →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
