import Image from "next/image";
import Link from "next/link";
import { submitContactMessageAction } from "@/app/actions/contact";
import {
  absoluteUrl,
  createJsonLd,
  createPageMetadata,
  siteName,
} from "@/lib/seo";
import { legalContactEmail } from "@/lib/legal";

type SearchParams = {
  success?: string;
  error?: string;
};

type ContactPageProps = {
  searchParams?: Promise<SearchParams>;
};

export const metadata = createPageMetadata({
  title: "Bize Ulaşın - KampüsRaf",
  description:
    "KampüsRaf destek ekibine ulaşın. Öğrenci doğrulama, kitap paylaşımı, takas, reklam, iş birliği ve güvenlik konularında mesaj gönderin.",
  path: "/bize-ulasin",
  keywords: [
    "KampüsRaf iletişim",
    "kitap takas destek",
    "öğrenci doğrulama destek",
    "kampüs kitap paylaşımı iletişim",
  ],
  image: "/logo.png",
});

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "KampüsRaf Bize Ulaşın",
  url: absoluteUrl("/bize-ulasin"),
  isPartOf: {
    "@type": "WebSite",
    name: siteName,
    url: absoluteUrl("/"),
  },
  mainEntity: {
    "@type": "Organization",
    name: siteName,
    email: legalContactEmail,
    url: absoluteUrl("/"),
  },
};

const topics = [
  "Öğrenci doğrulama ve hesap güvenliği",
  "Kitap ekleme, takas ve harita kullanımı",
  "Reklam, paketler ve iş birliği",
  "KVKK, kullanım koşulları ve güvenlik bildirimi",
];

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = (await searchParams) || {};

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createJsonLd(contactJsonLd) }}
      />

      <section className="mx-auto max-w-7xl px-6 py-8 md:py-12">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#2E7D5B]/10">
              <Image
                src="/logo-symbol.png"
                alt="KampüsRaf logo"
                width={42}
                height={42}
                className="h-10 w-10 object-contain"
              />
            </span>
            <span className="text-xl font-black">
              Kampüs<span className="text-[#F59E0B]">Raf</span>
            </span>
          </Link>

          <Link
            href="/hakkimizda"
            className="rounded-full border border-[#2E7D5B]/15 bg-white px-4 py-2 text-sm font-black text-[#2E7D5B]"
          >
            Hakkımızda
          </Link>
        </nav>

        <section className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F59E0B]">
              Bize Ulaşın
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Sorun, öneri veya iş birliği için buradayız.
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-600">
              KampüsRaf ile ilgili destek taleplerini, öğrenci doğrulama
              sorularını, güvenlik bildirimlerini ve reklam/iş birliği
              önerilerini bu formdan iletebilirsin.
            </p>

            <div className="mt-8 grid gap-3">
              {topics.map((topic) => (
                <div
                  key={topic}
                  className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-[#2E7D5B]/6"
                >
                  {topic}
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.6rem] bg-[#2E7D5B] p-5 text-white">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                E-posta
              </p>
              <a
                href={`mailto:${legalContactEmail}`}
                className="mt-2 block text-2xl font-black"
              >
                {legalContactEmail}
              </a>
              <p className="mt-3 text-sm font-semibold leading-7 text-white/70">
                Hukuki başvurular ve KVKK talepleri için de bu adresi
                kullanabilirsin.
              </p>
            </div>
          </div>

          <section className="rounded-[2rem] bg-white p-5 shadow-2xl shadow-slate-900/10 ring-1 ring-[#2E7D5B]/8 md:p-8">
            <h2 className="text-2xl font-black">Mesaj Gönder</h2>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
              Mesajını kısa ve net yazarsan daha hızlı dönüş yapabiliriz.
            </p>

            {params.success === "sent" && (
              <div className="mt-5 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B]">
                Mesajın alındı. En kısa sürede dönüş yapacağız.
              </div>
            )}

            {params.error && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">
                {decodeURIComponent(params.error)}
              </div>
            )}

            <form action={submitContactMessageAction} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  Ad Soyad
                  <input
                    name="name"
                    required
                    maxLength={120}
                    autoComplete="name"
                    className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                    placeholder="Adın ve soyadın"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  E-posta
                  <input
                    name="email"
                    required
                    type="email"
                    maxLength={160}
                    autoComplete="email"
                    className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                    placeholder="ornek@mail.com"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Konu
                <input
                  name="subject"
                  required
                  maxLength={140}
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  placeholder="Öğrenci doğrulama, takas, iş birliği..."
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Mesaj
                <textarea
                  name="message"
                  required
                  rows={7}
                  maxLength={2000}
                  className="resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  placeholder="Nasıl yardımcı olabiliriz?"
                />
              </label>

              <button
                type="submit"
                className="rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Mesajı Gönder
              </button>
            </form>
          </section>
        </section>
      </section>
    </main>
  );
}
