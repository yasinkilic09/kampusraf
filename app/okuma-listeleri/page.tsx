import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { redirectIfBanned } from "@/lib/account-status";
import { createPrivatePageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = createPrivatePageMetadata({
  title: "Okuma Listeleri",
  description:
    "KampüsRaf Okuma Listeleri; kampüs temposuna, türlere ve okuma hedeflerine göre hazırlanmış kitap keşif rotaları sunar.",
  path: "/okuma-listeleri",
});

type ReadingList = {
  title: string;
  eyebrow: string;
  description: string;
  duration: string;
  level: string;
  query: string;
  accent: "green" | "amber" | "dark";
  tags: string[];
  books: {
    title: string;
    author: string;
    note: string;
  }[];
};

const readingLists: ReadingList[] = [
  {
    title: "Kampüste Başlangıç Rafı",
    eyebrow: "Yeni okuma ritmi",
    description:
      "Okuma alışkanlığını yeniden kurmak isteyenler için kısa, akıcı ve konuşması kolay kitaplardan oluşan başlangıç rotası.",
    duration: "7 gün",
    level: "Kolay",
    query: "kısa roman",
    accent: "green",
    tags: ["Kısa Roman", "Akıcı", "Sohbetlik"],
    books: [
      {
        title: "Kürk Mantolu Madonna",
        author: "Sabahattin Ali",
        note: "Kısa sürede güçlü duygu yoğunluğu.",
      },
      {
        title: "Satranç",
        author: "Stefan Zweig",
        note: "Tek oturuşta okunabilecek yoğun anlatı.",
      },
      {
        title: "Fareler ve İnsanlar",
        author: "John Steinbeck",
        note: "Arkadaşlık ve umut üzerine sade bir rota.",
      },
    ],
  },
  {
    title: "Sınav Arası Hafif Okuma",
    eyebrow: "Zihin dinlendirme",
    description:
      "Ağır ders dönemlerinde okuma keyfini kaybetmeden ilerlemek için kısa bölümlü, yorucu olmayan kitap önerileri.",
    duration: "10 gün",
    level: "Rahat",
    query: "öykü deneme",
    accent: "amber",
    tags: ["Öykü", "Deneme", "Kısa Bölüm"],
    books: [
      {
        title: "Şeker Portakalı",
        author: "José Mauro de Vasconcelos",
        note: "Duygusal ama hızlı akan bir okuma.",
      },
      {
        title: "İnsan Ne ile Yaşar?",
        author: "Lev Tolstoy",
        note: "Kısa metinlerle güçlü düşünceler.",
      },
      {
        title: "Dava",
        author: "Franz Kafka",
        note: "Parça parça okunabilecek yoğun atmosfer.",
      },
    ],
  },
  {
    title: "Takas Dostu Popülerler",
    eyebrow: "Raf hareketi",
    description:
      "Kampüste daha kolay bulunan, takas ve ödünç konuşması başlatmaya uygun popüler kitapları öne çıkarır.",
    duration: "14 gün",
    level: "Orta",
    query: "popüler roman",
    accent: "green",
    tags: ["Takas", "Popüler", "Kampüs"],
    books: [
      {
        title: "1984",
        author: "George Orwell",
        note: "Çok okunan, kolay eşleşen klasiklerden.",
      },
      {
        title: "Hayvan Çiftliği",
        author: "George Orwell",
        note: "Kısa ve tartışması güçlü bir seçenek.",
      },
      {
        title: "Simyacı",
        author: "Paulo Coelho",
        note: "Geniş okur kitlesiyle iyi takas adayı.",
      },
    ],
  },
  {
    title: "Türk Edebiyatı Derinleşme",
    eyebrow: "Yerel raf",
    description:
      "Kampüs sohbetlerinde daha derin bağ kurmak isteyenler için Türk edebiyatından güçlü bir keşif hattı.",
    duration: "21 gün",
    level: "Derin",
    query: "Türk edebiyatı",
    accent: "dark",
    tags: ["Türk Edebiyatı", "Klasik", "Derin Okuma"],
    books: [
      {
        title: "Saatleri Ayarlama Enstitüsü",
        author: "Ahmet Hamdi Tanpınar",
        note: "Modernleşme ve zaman üzerine güçlü bir klasik.",
      },
      {
        title: "İnce Memed",
        author: "Yaşar Kemal",
        note: "Uzun soluklu ama unutulmaz bir rota.",
      },
      {
        title: "Tutunamayanlar",
        author: "Oğuz Atay",
        note: "İleri seviye edebiyat sohbetleri için.",
      },
    ],
  },
];

function getAccentClass(accent: ReadingList["accent"]) {
  if (accent === "amber") {
    return "bg-[#F59E0B] text-white shadow-[#F59E0B]/20";
  }

  if (accent === "dark") {
    return "bg-[#1F2933] text-white shadow-slate-900/20";
  }

  return "bg-[#2E7D5B] text-white shadow-[#2E7D5B]/20";
}

function searchHref(query: string) {
  return `/kitap-ara?q=${encodeURIComponent(query)}`;
}

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

export default async function ReadingListsPage() {
  await redirectIfBanned();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    profileResult,
    shelfCountResult,
    favoriteCountResult,
    requestCountResult,
  ] = await Promise.all([
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
    supabase
      .from("book_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const profile = profileResult.data;
  const displayName =
    profile?.full_name || profile?.username || "KampüsRaf okuru";
  const shelfCount = shelfCountResult.count || 0;
  const favoriteCount = favoriteCountResult.count || 0;
  const requestCount = requestCountResult.count || 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <AppHeader
        subtitle="Okuma Listeleri"
        active="okuma-listeleri"
        actions={
          <Link
            href="/kitap-ara"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Kitap Ara
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-44 w-44 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Kürasyonlu Keşif
                </p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
                  Okuyacak kitap arama yükünü listeler üstlensin.
                </h1>
                <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/75 md:text-base">
                  {displayName}, kampüs temposuna göre hazırlanmış listelerden
                  birini seç; kitabı ara, rafına ekle veya takasa uygun
                  kullanıcıları keşfet.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <StatCard
                  label="Rafındaki Kitap"
                  value={shelfCount}
                  helper="Mevcut rafın listelere bağlanır."
                />
                <StatCard
                  label="Favori Alıntı"
                  value={favoriteCount}
                  helper="Beğendiğin cümlelerden rota çıkar."
                />
                <StatCard
                  label="Aradığın Kitap"
                  value={requestCount}
                  helper="Eksik kitaplar listeleri yönlendirir."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:mt-8 md:grid-cols-3">
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              1. Seç
            </p>
            <h2 className="mt-2 text-xl font-black">Ritmine uygun listeyi bul.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Kısa okuma, takas dostu kitaplar veya derinleşme rotasıyla başla.
            </p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              2. Ara
            </p>
            <h2 className="mt-2 text-xl font-black">Kitabı kampüs raflarında tara.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Her liste, ilgili kitap aramasına tek tıkla bağlanır.
            </p>
          </div>
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              3. Paylaş
            </p>
            <h2 className="mt-2 text-xl font-black">Okuduklarını sosyal akışa taşı.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Liste ilerledikçe alıntı, yorum ve takas konuşması başlat.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:mt-8 lg:grid-cols-2">
          {readingLists.map((list) => (
            <article
              key={list.title}
              className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5"
            >
              <div className={`${getAccentClass(list.accent)} p-6 shadow-xl`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                    {list.eyebrow}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                    {list.duration} · {list.level}
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight">
                  {list.title}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/75">
                  {list.description}
                </p>
              </div>

              <div className="p-5 md:p-6">
                <div className="flex flex-wrap gap-2">
                  {list.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#FAF7F0] px-3 py-1 text-xs font-black text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid gap-3">
                  {list.books.map((book, index) => (
                    <Link
                      key={book.title}
                      href={searchHref(`${book.title} ${book.author}`)}
                      className="group rounded-[1.25rem] bg-[#FAF7F0] p-4 transition hover:-translate-y-0.5 hover:bg-[#EAF5EF]"
                    >
                      <div className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#2E7D5B] ring-1 ring-[#2E7D5B]/10">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-black text-[#1F2933] group-hover:text-[#2E7D5B]">
                            {book.title}
                          </h3>
                          <p className="mt-1 text-sm font-bold text-slate-500">
                            {book.author}
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                            {book.note}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={searchHref(list.query)}
                    className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                  >
                    Listeyi Başlat
                  </Link>
                  <Link
                    href="/kitap-ekle"
                    className="rounded-full bg-[#FAF7F0] px-5 py-3 text-center text-sm font-black text-[#1F2933] transition hover:-translate-y-0.5"
                  >
                    Rafıma Kitap Ekle
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Sıradaki geliştirme planı
              </p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">
                Listeler zamanla kişisel okuma hedefine dönüşecek.
              </h2>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Bu ilk sürüm keşif ve arama rotasını açıyor. Sonraki adımda
                listeleri kaydetme, ilerleme yüzdesi ve arkadaşlarla liste
                paylaşımı eklenebilir.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/paylas"
                className="rounded-full bg-[#F59E0B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                Liste Yorumu Paylaş
              </Link>
              <Link
                href="/yazar-takibi"
                className="rounded-full bg-[#1F2933] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
              >
                Yazar Takibine Geç
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
