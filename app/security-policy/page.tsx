import Link from "next/link";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "KampüsRaf Güvenlik Bildirim Politikası",
  description:
    "KampüsRaf güvenlik açıklarını sorumlu şekilde bildirmek için izlenecek kapsam ve güvenli test kuralları.",
  path: "/security-policy",
  noIndex: true,
});

const inScope = [
  "KampüsRaf web uygulaması",
  "KampüsRaf'a ait public API endpointleri",
  "Kimlik doğrulama, yetkilendirme, gizlilik ve kullanıcı verisi sorunları",
  "XSS, CSRF, yetkisiz erişim, veri sızıntısı ve oran limiti atlatma bulguları",
];

const outOfScope = [
  "Sosyal mühendislik denemeleri",
  "Fiziksel saldırılar",
  "Yüksek trafikli otomatik testler veya kullanılabilirliği bozacak denemeler",
  "KampüsRaf kontrolünde olmayan üçüncü taraf servisler",
];

export default function SecurityPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] px-6 py-10 text-[#1F2933]">
      <section className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm font-black text-[#2E7D5B] transition hover:text-[#25684c]"
        >
          ← KampüsRaf ana sayfa
        </Link>

        <div className="mt-8 rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-[#2E7D5B]/10 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
            Güvenlik bildirimi
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Sorumlu güvenlik bildirimi politikası
          </h1>
          <p className="mt-5 text-base font-semibold leading-8 text-slate-600">
            KampüsRaf&apos;ta bir güvenlik açığı fark edersen, lütfen açığı
            herkese açık şekilde paylaşmadan önce proje sahibiyle özel kanaldan
            iletişime geç. Amaç; kullanıcı verisini, platform güvenliğini ve
            hizmet sürekliliğini birlikte korumaktır.
          </p>

          <div className="mt-8 rounded-3xl bg-[#FAF7F0] p-5">
            <h2 className="text-xl font-black text-[#2E7D5B]">
              Bildirimde neler olmalı?
            </h2>
            <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600">
              <li>Açığın kısa açıklaması ve etkisi.</li>
              <li>Tekrar üretme adımları.</li>
              <li>Etkilenen URL, hesap akışı veya özellik.</li>
              <li>Varsa ekran görüntüsü, log veya hata mesajı.</li>
              <li>Veri erişimi olduysa hangi veri türünün etkilendiği.</li>
            </ul>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <section className="rounded-3xl border border-[#2E7D5B]/10 p-5">
              <h2 className="text-xl font-black text-[#2E7D5B]">Kapsam içi</h2>
              <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600">
                {inScope.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-[#F59E0B]/20 p-5">
              <h2 className="text-xl font-black text-[#F59E0B]">
                Kapsam dışı
              </h2>
              <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600">
                {outOfScope.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-6 rounded-3xl bg-[#1F2933] p-5 text-white">
            <h2 className="text-xl font-black">Güvenli test kuralları</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-white/70">
              Sana ait olmayan veriye erişme, veriyi değiştirme, silme veya dışa
              aktarma. Trafik yoğunluğu oluşturacak otomatik taramalar yapma.
              Bir açığı doğrulamak için minimum veri ve minimum istek kullan.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
