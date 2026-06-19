import Link from "next/link";
import { legalEffectiveDate, legalVersions, termsSections } from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Kullanim Kosullari",
  description:
    "KampusRaf hesap, kitap paylasimi, takas, sosyal akis, topluluk, paket ve reklamsiz kullanim kosullari.",
  path: "/kullanim-kosullari",
  noIndex: true,
});

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] px-6 py-10 text-[#1F2933]">
      <section className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm font-black text-[#2E7D5B] transition hover:text-[#25684c]"
        >
          {"<-"} KampusRaf ana sayfa
        </Link>

        <div className="mt-8 rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-[#2E7D5B]/10 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            Kullanim kosullari
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            KampusRaf kullanim kosullari
          </h1>
          <p className="mt-5 text-base font-semibold leading-8 text-slate-600">
            Bu kosullar, KampusRaf web sitesi ve mobil uygulamasindaki hesap,
            kitap paylasimi, takas, sosyal akis, topluluk, paket ve reklam
            ozelliklerinin kullanimina iliskindir. Yayin tarihi:{" "}
            {legalEffectiveDate}. Surum: {legalVersions.terms}.
          </p>

          <div className="mt-8 space-y-5">
            {termsSections.map((section) => (
              <section
                key={section.title}
                className="rounded-3xl border border-[#2E7D5B]/10 bg-[#FAF7F0] p-5"
              >
                <h2 className="text-2xl font-black text-[#2E7D5B]">
                  {section.title}
                </h2>
                <ul className="mt-4 space-y-3 text-sm font-semibold leading-7 text-slate-600">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-[#F59E0B]/20 bg-[#FFFBEB] p-5 text-sm font-semibold leading-7 text-slate-700">
            Hesap olusturarak bu kosullari kabul etmis olursun. Kosullari kabul
            etmiyorsan platformu kullanmamalisin. Onemli degisiklikler
            kullaniciya uygun kanallardan duyurulur.
          </div>
        </div>
      </section>
    </main>
  );
}
