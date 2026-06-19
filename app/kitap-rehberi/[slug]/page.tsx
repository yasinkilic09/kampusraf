import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookSeoPages,
  getBookSeoPage,
  getRelatedBookSeoPages,
} from "@/lib/book-seo-content";
import {
  absoluteUrl,
  createJsonLd,
  createPageMetadata,
  siteName,
} from "@/lib/seo";

type BookGuidePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return bookSeoPages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: BookGuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getBookSeoPage(slug);

  if (!page) {
    return createPageMetadata({
      title: "Kitap Rehberi",
      description: "KampüsRaf kitap rehberi.",
      path: "/kitap-rehberi",
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: `${page.shortTitle} - KampüsRaf Kitap Rehberi`,
    description: page.description,
    path: `/kitap-rehberi/${page.slug}`,
    keywords: page.keywords,
  });
}

export default async function BookGuideDetailPage({
  params,
}: BookGuidePageProps) {
  const { slug } = await params;
  const page = getBookSeoPage(slug);

  if (!page) {
    notFound();
  }

  const relatedPages = getRelatedBookSeoPages(page);
  const pageUrl = absoluteUrl(`/kitap-rehberi/${page.slug}`);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.title,
      description: page.description,
      image: absoluteUrl("/logo.png"),
      keywords: page.keywords.join(", "),
      articleSection: page.intent,
      inLanguage: "tr-TR",
      datePublished: "2026-06-18",
      dateModified: "2026-06-18",
      author: {
        "@type": "Organization",
        name: siteName,
        url: absoluteUrl("/"),
      },
      publisher: {
        "@type": "Organization",
        name: siteName,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/logo.png"),
        },
      },
      mainEntityOfPage: pageUrl,
      about: page.keywords,
      isPartOf: {
        "@type": "CollectionPage",
        name: "KampüsRaf Kitap Rehberi",
        url: absoluteUrl("/kitap-rehberi"),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
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
        {
          "@type": "ListItem",
          position: 3,
          name: page.shortTitle,
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
              {page.intent}
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              {page.title}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              {page.summary}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/auth/sign-up"
                className="rounded-full bg-[#2E7D5B] px-8 py-4 text-center text-sm font-black text-white shadow-xl shadow-[#2E7D5B]/20 transition hover:-translate-y-1 hover:bg-[#25684c]"
              >
                KampüsRaf&apos;a Katıl
              </Link>
              <Link
                href="/kitap-rehberi"
                className="rounded-full border border-[#2E7D5B]/20 bg-white px-8 py-4 text-center text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-1 hover:border-[#2E7D5B]/40"
              >
                Tüm Rehberler
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur">
            <div className="rounded-[1.6rem] bg-[#2E7D5B] p-6 text-white">
              <p className="text-sm font-black text-white/65">
                Arama niyeti
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {page.shortTitle}
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/70">
                {page.description}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {page.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-700"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <article className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {page.sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[2rem] border border-[#2E7D5B]/10 bg-white p-7 shadow-sm"
            >
              <h2 className="text-2xl font-black text-[#2E7D5B]">
                {section.title}
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-600">
                {section.text}
              </p>
            </section>
          ))}
        </div>
      </article>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-[2rem] bg-white p-7 shadow-sm md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            Sık sorulanlar
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {page.faq.map((item) => (
              <article
                key={item.question}
                className="rounded-3xl bg-[#FAF7F0] p-5"
              >
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

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-[2rem] bg-[#1F2933] p-8 text-white md:p-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                İlgili rehberler
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Bu konuyla birlikte aranan diğer kitap başlıkları.
              </h2>
            </div>
            <Link
              href="/kitap-rehberi"
              className="text-sm font-black text-white/80 transition hover:text-white"
            >
              Rehber merkezine dön
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {relatedPages.map((relatedPage) => (
              <Link
                key={relatedPage.slug}
                href={`/kitap-rehberi/${relatedPage.slug}`}
                className="group rounded-[1.5rem] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:bg-white/10"
              >
                <h3 className="text-lg font-black">{relatedPage.shortTitle}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/65">
                  {relatedPage.description}
                </p>
                <p className="mt-4 text-sm font-black text-[#F59E0B] transition group-hover:translate-x-1">
                  Oku →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] bg-[#2E7D5B] p-8 text-center text-white shadow-2xl shadow-[#2E7D5B]/20 md:p-14">
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Kitap arıyorsan rafı büyüt, kitap paylaşıyorsan görünür ol.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/75">
            KampüsRaf&apos;ta sanal kütüphaneni oluştur, kitaplarını paylaşım
            türüne göre düzenle ve yakınındaki öğrencilerle güvenli şekilde
            iletişim kur.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-white px-8 py-4 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-1"
            >
              Ücretsiz Kayıt Ol
            </Link>
            <Link
              href="/kampusraf-nedir"
              className="rounded-full border border-white/25 px-8 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/10"
            >
              KampüsRaf&apos;ı Tanı
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
