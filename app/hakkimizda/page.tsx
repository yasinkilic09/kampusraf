import Image from "next/image";
import Link from "next/link";
import {
  absoluteUrl,
  createJsonLd,
  createPageMetadata,
  siteName,
} from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Hakkımızda - KampüsRaf",
  description:
    "KampüsRaf; öğrencilerin kitaplarını paylaşmasını, takas etmesini, yakınındaki kitapları bulmasını ve sosyal okuma toplulukları kurmasını sağlayan web ve mobil platformdur.",
  path: "/hakkimizda",
  keywords: [
    "KampüsRaf hakkında",
    "öğrenci kitap platformu",
    "kampüs kitap paylaşımı",
    "kitap takas uygulaması",
  ],
  image: "/logo.png",
});

const values = [
  {
    title: "Kitapları dolaşıma çıkarır",
    text: "Raflarda bekleyen kitapların takas, ödünç, satış veya bağış yoluyla başka öğrencilere ulaşmasını kolaylaştırır.",
  },
  {
    title: "Güvenli kampüs ağı kurar",
    text: "Öğrenci doğrulama, profil güven puanı, uygulama içi mesajlaşma ve şikayet sistemiyle daha kontrollü bir paylaşım alanı sunar.",
  },
  {
    title: "Okumayı sosyalleştirir",
    text: "Akış, topluluklar, alıntılar, kelime sözlüğü ve sanal kitaplık ile okuma alışkanlığını günlük bir deneyime dönüştürür.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "KampüsRaf Hakkımızda",
  url: absoluteUrl("/hakkimizda"),
  isPartOf: {
    "@type": "WebSite",
    name: siteName,
    url: absoluteUrl("/"),
  },
  about: {
    "@type": "Organization",
    name: siteName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.png"),
    slogan: "Kitaplar paylaşılır, fikirler büyür.",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: createJsonLd(jsonLd) }}
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

          <div className="flex items-center gap-3 text-sm font-black">
            <Link
              href="/bize-ulasin"
              className="rounded-full border border-[#2E7D5B]/15 bg-white px-4 py-2 text-[#2E7D5B]"
            >
              Bize Ulaşın
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-full bg-[#2E7D5B] px-4 py-2 text-white"
            >
              Katıl
            </Link>
          </div>
        </nav>

        <section className="mt-12 grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F59E0B]">
              Hakkımızda
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              KampüsRaf, öğrencilerin kitap üzerinden buluştuğu sosyal raf ağıdır.
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-600 md:text-lg">
              Amacımız, öğrencilerin kitap maliyetini azaltırken aynı zamanda
              kampüs içinde paylaşım kültürünü büyütmek. Bir kitap takas
              platformundan fazlası olarak harita, eşleştirme, sosyal akış,
              topluluklar ve sanal kitaplık deneyimini tek yerde topluyoruz.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/kitap-takas"
                className="rounded-full bg-[#2E7D5B] px-7 py-3 text-center text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20"
              >
                Kitap Takası Nasıl Çalışır?
              </Link>
              <Link
                href="/bize-ulasin"
                className="rounded-full border border-[#2E7D5B]/15 bg-white px-7 py-3 text-center text-sm font-black text-[#2E7D5B]"
              >
                Ekiple İletişime Geç
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-5 shadow-2xl shadow-slate-900/8 ring-1 ring-[#2E7D5B]/8">
            <div className="rounded-[1.6rem] bg-[#2E7D5B] p-7 text-white">
              <Image
                src="/logo-symbol.png"
                alt="KampüsRaf sembolü"
                width={112}
                height={112}
                className="h-24 w-24 rounded-3xl bg-white object-contain p-3"
              />
              <h2 className="mt-7 text-3xl font-black">
                Kitaplar paylaşılır, fikirler büyür.
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/75">
                Bir öğrencinin bitirdiği kitap, başka bir öğrencinin aradığı
                kaynak olabilir. KampüsRaf bu karşılaşmayı görünür, güvenli ve
                sürdürülebilir hale getirmek için tasarlandı.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {values.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.8rem] bg-white p-6 shadow-sm ring-1 ring-[#2E7D5B]/6"
            >
              <h2 className="text-xl font-black text-[#2E7D5B]">
                {item.title}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                {item.text}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-14 rounded-[2rem] bg-[#1F2933] p-7 text-white md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                Yol haritası
              </p>
              <h2 className="mt-3 text-3xl font-black">
                Web ve mobilde aynı güçlü kitap deneyimi.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Yakındaki kitapları haritada keşfetme",
                "Mesafeye göre akıllı eşleşme",
                "Öğrenci doğrulama ve güven rozeti",
                "Sanal kitaplık ve kişisel okuma arşivi",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-white/8 p-4 text-sm font-bold text-white/80"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
