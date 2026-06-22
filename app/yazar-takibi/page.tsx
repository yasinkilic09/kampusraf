import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AuthorFollowPanel,
  type AuthorFollowCard,
} from "@/components/author-follow-panel";
import { AppHeader } from "@/components/app-header";
import { redirectIfBanned } from "@/lib/account-status";
import { createPrivatePageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "Yazar Takibi",
  description:
    "KampüsRaf Yazar Takibi; sevdiğin yazarları izlemek, kitaplarını aramak ve okuma rotası oluşturmak için tasarlanmış keşif alanıdır.",
  path: "/yazar-takibi",
});

const authors: AuthorFollowCard[] = [
  {
    name: "Sabahattin Ali",
    period: "Türk Edebiyatı",
    focus: "Duygu, toplum ve iç ses",
    description:
      "Kısa ama etkili anlatımıyla okuma ritmini güçlendiren, kampüs sohbetlerinde sık karşılık bulan yazarlardan.",
    searchQuery: "Sabahattin Ali",
    tags: ["Roman", "Öykü", "Klasik"],
    starterBooks: ["Kürk Mantolu Madonna", "İçimizdeki Şeytan", "Değirmen"],
  },
  {
    name: "Yaşar Kemal",
    period: "Anadolu Anlatısı",
    focus: "Doğa, adalet ve epik dil",
    description:
      "Uzun soluklu okuma isteyenler için güçlü karakterler, geniş coğrafya ve etkileyici anlatı sunar.",
    searchQuery: "Yaşar Kemal",
    tags: ["Roman", "Anadolu", "Epik"],
    starterBooks: ["İnce Memed", "Yer Demir Gök Bakır", "Ağrı Dağı Efsanesi"],
  },
  {
    name: "Ahmet Hamdi Tanpınar",
    period: "Modern Klasik",
    focus: "Zaman, şehir ve modernleşme",
    description:
      "Daha derin edebiyat okumalarına geçmek isteyenler için düşünce ve atmosfer yoğunluğu yüksek bir rota açar.",
    searchQuery: "Ahmet Hamdi Tanpınar",
    tags: ["Klasik", "Deneme", "Şehir"],
    starterBooks: [
      "Saatleri Ayarlama Enstitüsü",
      "Huzur",
      "Beş Şehir",
    ],
  },
  {
    name: "Dostoyevski",
    period: "Dünya Klasiği",
    focus: "Psikoloji, ahlak ve çatışma",
    description:
      "Karakter derinliği ve etik gerilimlerle okuma seviyesini büyütmek isteyenler için temel bir takip rotası.",
    searchQuery: "Dostoyevski",
    tags: ["Klasik", "Psikoloji", "Felsefe"],
    starterBooks: ["Suç ve Ceza", "Yeraltından Notlar", "Karamazov Kardeşler"],
  },
  {
    name: "Virginia Woolf",
    period: "Modernist Okuma",
    focus: "Bilinç akışı ve iç dünya",
    description:
      "Dilin ritmini, düşüncenin akışını ve karakterlerin iç sesini takip etmek isteyenler için güçlü bir keşif.",
    searchQuery: "Virginia Woolf",
    tags: ["Modernizm", "Deneme", "Roman"],
    starterBooks: ["Kendine Ait Bir Oda", "Mrs Dalloway", "Deniz Feneri"],
  },
  {
    name: "Ursula K. Le Guin",
    period: "Spekülatif Edebiyat",
    focus: "Toplum, ütopya ve hayal gücü",
    description:
      "Fantastik ve bilimkurgu üzerinden toplum, özgürlük ve dil üzerine düşünen okurlar için dengeli bir rota.",
    searchQuery: "Ursula K. Le Guin",
    tags: ["Bilimkurgu", "Fantastik", "Felsefe"],
    starterBooks: ["Mülksüzler", "Yerdeniz Büyücüsü", "Karanlığın Sol Eli"],
  },
];

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[1.35rem] bg-white/10 p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">
        {label}
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-white/60">
        {helper}
      </p>
    </div>
  );
}

export default async function AuthorTrackingPage() {
  await redirectIfBanned();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [profileResult, shelfCountResult, favoriteCountResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, username, plan_type, university")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_books")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("quote_favorites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  const profile = profileResult.data;
  const displayName =
    profile?.full_name || profile?.username || "KampüsRaf okuru";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <AppHeader
        subtitle="Yazar Takibi"
        active="yazar-takibi"
        actions={
          <Link
            href="/okuma-listeleri"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Okuma Listeleri
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#1F2933] text-white shadow-xl shadow-slate-900/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#2E7D5B]/25 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-44 w-44 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F59E0B]">
                  Kişisel Yazar Radarı
                </p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
                  Sevdiğin yazarları takip et, sıradaki kitabı daha hızlı bul.
                </h1>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/70 md:text-base">
                  {displayName}, yazar kartlarından takip listeni oluştur.
                  Her yazar kartı kitap aramaya, okuma rotasına ve sosyal
                  paylaşıma bağlanır.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <StatCard
                  label="Önerilen Yazar"
                  value={authors.length}
                  helper="İlk yazar radarın hazır."
                />
                <StatCard
                  label="Rafındaki Kitap"
                  value={shelfCountResult.count || 0}
                  helper="Rafın güçlendikçe rota netleşir."
                />
                <StatCard
                  label="Favori Alıntı"
                  value={favoriteCountResult.count || 0}
                  helper="Alıntılar yazar ilgini gösterir."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:mt-8 md:grid-cols-3">
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Takip
            </p>
            <h2 className="mt-2 text-xl font-black">Yazar ilgini işaretle.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Seçtiğin yazarlar bu cihazda saklanır ve radar panelinde görünür.
            </p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Keşif
            </p>
            <h2 className="mt-2 text-xl font-black">Kitaplarını anında ara.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Her yazar kartı KampüsRaf kitap aramasına doğrudan bağlanır.
            </p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Rota
            </p>
            <h2 className="mt-2 text-xl font-black">Başlangıç kitaplarından ilerle.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Her yazar için kolay başlanacak kitaplar ayrı ayrı listelenir.
            </p>
          </div>
        </section>

        <section className="mt-6 md:mt-8">
          <AuthorFollowPanel authors={authors} />
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Sıradaki geliştirme planı
              </p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">
                Yazar takibi daha sonra hesap bazlı bildirimlere dönüşebilir.
              </h2>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Bu ilk sürüm yazar seçme, kitap arama ve rota başlatma deneyimini
                açıyor. Sonraki adımda Supabase üzerinde kalıcı takip, yeni kitap
                bildirimi ve yazar bazlı alıntı akışı eklenebilir.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/kitap-ara"
                className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                Kitap Aramaya Git
              </Link>
              <Link
                href="/paylas"
                className="rounded-full bg-[#F59E0B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                Okuma Rotanı Paylaş
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
