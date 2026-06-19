import Link from "next/link";
import {
  kvkkSections,
  legalContactEmail,
  legalEffectiveDate,
  legalVersions,
} from "@/lib/legal";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "KVKK Aydinlatma Metni",
  description:
    "KampusRaf hesap, kitap, konum, sosyal akis, bildirim ve guvenlik verilerinin nasil islendigini aciklayan KVKK aydinlatma metni.",
  path: "/kvkk-aydinlatma-metni",
  noIndex: true,
});

export default function KvkkNoticePage() {
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
            KVKK aydinlatma metni
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Kisisel verilerin islenmesine iliskin bilgilendirme
          </h1>
          <p className="mt-5 text-base font-semibold leading-8 text-slate-600">
            Bu metin, KampusRaf hesabini olustururken ve platformu kullanirken
            hangi verilerin, hangi amaclarla ve hangi hukuki sebeplerle
            islenebilecegini aciklar. Yayin tarihi: {legalEffectiveDate}.
            Surum: {legalVersions.kvkk}.
          </p>

          <div className="mt-6 rounded-3xl border border-[#F59E0B]/20 bg-[#FFFBEB] p-5 text-sm font-semibold leading-7 text-slate-700">
            Not: Bu metin uygulama icin pratik bir uyum taslagidir. Nihai
            yayin oncesinde sirket/unvan, adres, VERBIS durumu ve ticari
            surecler icin hukuk danismani tarafindan kontrol edilmelidir.
          </div>

          <div className="mt-8 space-y-5">
            {kvkkSections.map((section) => (
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

          <div className="mt-8 rounded-3xl bg-[#1F2933] p-5 text-white">
            <h2 className="text-xl font-black">Basvuru ve iletisim</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-white/72">
              Kisisel verilerinle ilgili taleplerini, riza geri alma
              bildirimlerini veya gizlilik sorularini{" "}
              <a
                href={`mailto:${legalContactEmail}`}
                className="font-black text-[#F59E0B]"
              >
                {legalContactEmail}
              </a>{" "}
              adresine iletebilirsin.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
