import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  q?: string;
  shelf?: string;
  sort?: string;
  view?: string;
}>;

const conditionLabels: Record<string, string> = {
  yeni: "Yeni",
  temiz: "Temiz",
  az_kullanilmis: "Az Kullanılmış",
  orta: "Orta",
  yipranmis: "Yıpranmış",
};

const exchangeTypeLabels: Record<string, string> = {
  takas: "Takas",
  odunc: "Ödünç",
  satis: "Satış",
  bagis: "Bağış",
};

const statusLabels: Record<string, string> = {
  mevcut: "Mevcut",
  rezerve: "Rezerve",
  verildi: "Verildi",
  takaslandi: "Takaslandı",
  pasif: "Pasif",
};

const shelfFilters = [
  { label: "Tüm Raf", value: "all" },
  { label: "Aktif Raf", value: "active" },
  { label: "Takasa Açık", value: "takas" },
  { label: "Ödünç", value: "odunc" },
  { label: "Satış", value: "satis" },
  { label: "Bağış", value: "bagis" },
  { label: "Arşiv", value: "archive" },
];

const sortOptions = [
  { label: "Yeni eklenen", value: "newest" },
  { label: "Kitap adına göre", value: "title" },
  { label: "Yazara göre", value: "author" },
  { label: "Kategoriye göre", value: "category" },
];

const viewOptions = [
  { label: "Raf Görünümü", value: "shelf" },
  { label: "Liste Görünümü", value: "list" },
];

type UserBook = {
  id: string;
  condition: string;
  exchange_type: string;
  status: string;
  custom_title: string | null;
  custom_author: string | null;
  image_url: string | null;
  note: string | null;
  city: string | null;
  university: string | null;
  created_at: string;
  books:
    | {
        title: string;
        author: string | null;
        category: string | null;
        cover_url: string | null;
      }
    | {
        title: string;
        author: string | null;
        category: string | null;
        cover_url: string | null;
      }[]
    | null;
};

function getBookInfo(userBook: UserBook) {
  const relatedBook = Array.isArray(userBook.books)
    ? userBook.books[0]
    : userBook.books;

  return {
    title: userBook.custom_title || relatedBook?.title || "İsimsiz Kitap",
    author: userBook.custom_author || relatedBook?.author || "Yazar bilgisi yok",
    category: relatedBook?.category || "Kategori yok",
    image: userBook.image_url || relatedBook?.cover_url || null,
  };
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function getStatusBadgeClass(status: string) {
  if (status === "mevcut") {
    return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  }

  if (status === "rezerve") {
    return "bg-[#F59E0B]/10 text-[#B45309]";
  }

  if (status === "verildi" || status === "takaslandi") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "pasif") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-slate-100 text-slate-600";
}

function normalizeSearchText(value: string | null | undefined) {
  return (value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function userBookSafeText(value: string | null | undefined) {
  return value || "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getSafeShelfFilter(value?: string) {
  return shelfFilters.some((item) => item.value === value) ? value || "all" : "all";
}

function getSafeSort(value?: string) {
  return sortOptions.some((item) => item.value === value) ? value || "newest" : "newest";
}

function getSafeView(value?: string) {
  return viewOptions.some((item) => item.value === value) ? value || "shelf" : "shelf";
}

function buildMyBooksUrl(params: {
  q?: string;
  shelf?: string;
  sort?: string;
  view?: string;
}) {
  const query = new URLSearchParams();

  if (params.q) query.set("q", params.q);
  if (params.shelf && params.shelf !== "all") query.set("shelf", params.shelf);
  if (params.sort && params.sort !== "newest") query.set("sort", params.sort);
  if (params.view && params.view !== "shelf") query.set("view", params.view);

  const queryString = query.toString();

  return queryString ? `/kitaplarim?${queryString}` : "/kitaplarim";
}

function getShelfMood(userBook: UserBook) {
  if (userBook.status === "pasif") return "Gizli arşiv";
  if (userBook.status === "rezerve") return "Ayrılmış kitap";
  if (userBook.status === "verildi" || userBook.status === "takaslandi") {
    return "Geçmiş raf";
  }
  if (userBook.exchange_type === "odunc") return "Ödünç verilebilir";
  if (userBook.exchange_type === "satis") return "Satışta";
  if (userBook.exchange_type === "bagis") return "Bağışlanabilir";
  return "Paylaşmaya hazır";
}

function getShelfAccentClass(userBook: UserBook) {
  if (userBook.status === "pasif") return "from-slate-400 to-slate-600";
  if (userBook.exchange_type === "odunc") return "from-[#2E7D5B] to-[#8BC6A5]";
  if (userBook.exchange_type === "satis") return "from-[#F59E0B] to-[#FCD34D]";
  if (userBook.exchange_type === "bagis") return "from-[#1D4ED8] to-[#93C5FD]";
  return "from-[#8B5E3C] to-[#D9B38C]";
}

function getLibraryQuality(userBook: UserBook) {
  const book = getBookInfo(userBook);
  let score = 40;

  if (book.image) score += 18;
  if (userBook.note && userBook.note.length > 20) score += 16;
  if (userBook.city) score += 8;
  if (userBook.university) score += 8;
  if (userBook.status === "mevcut") score += 10;

  return Math.min(score, 100);
}

function matchesShelf(userBook: UserBook, shelf: string) {
  if (shelf === "all") return true;
  if (shelf === "active") return userBook.status === "mevcut";
  if (shelf === "archive") return userBook.status !== "mevcut";

  return userBook.exchange_type === shelf;
}

function getCategoryStats(books: UserBook[]) {
  const counts = books.reduce(
    (accumulator, item) => {
      const category = getBookInfo(item).category || "Kategori yok";
      accumulator[category] = (accumulator[category] || 0) + 1;

      return accumulator;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export default async function MyBooksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedShelf = getSafeShelfFilter(params.shelf);
  const selectedSort = getSafeSort(params.sort);
  const selectedView = getSafeView(params.view);
  const searchQuery = (params.q || "").trim();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: books, error } = await supabase
    .from("user_books")
    .select(
      `
      id,
      condition,
      exchange_type,
      status,
      custom_title,
      custom_author,
      image_url,
      note,
      city,
      university,
      created_at,
      books (
        title,
        author,
        category,
        cover_url
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Kitaplarım listeleme hatası:", error);
  }

  const activeBooks = (books || []) as UserBook[];
  const totalBooks = activeBooks.length;
  const takasCount = activeBooks.filter(
    (book) => book.exchange_type === "takas"
  ).length;
  const oduncCount = activeBooks.filter(
    (book) => book.exchange_type === "odunc"
  ).length;
  const activeShelfCount = activeBooks.filter(
    (book) => book.status === "mevcut"
  ).length;
  const coverCount = activeBooks.filter((book) => getBookInfo(book).image).length;
  const noteCount = activeBooks.filter((book) => book.note && book.note.length > 8).length;
  const archiveCount = activeBooks.filter((book) => book.status !== "mevcut").length;
  const categoryStats = getCategoryStats(activeBooks);
  const topCategory = categoryStats[0]?.label || "Henüz oluşmadı";
  const averageQuality =
    totalBooks > 0
      ? Math.round(
          activeBooks.reduce((total, item) => total + getLibraryQuality(item), 0) /
            totalBooks
        )
      : 0;
  const normalizedQuery = normalizeSearchText(searchQuery);
  const filteredBooks = activeBooks
    .filter((book) => {
      if (!matchesShelf(book, selectedShelf)) return false;
      if (!normalizedQuery) return true;

      const info = getBookInfo(book);
      const haystack = normalizeSearchText(
        [
          info.title,
          info.author,
          info.category,
          userBookSafeText(book.note),
          book.city,
          book.university,
          conditionLabels[book.condition],
          exchangeTypeLabels[book.exchange_type],
          statusLabels[book.status],
        ].join(" ")
      );

      return haystack.includes(normalizedQuery);
    })
    .sort((a, b) => {
      const bookA = getBookInfo(a);
      const bookB = getBookInfo(b);

      if (selectedSort === "title") {
        return bookA.title.localeCompare(bookB.title, "tr-TR");
      }
      if (selectedSort === "author") {
        return bookA.author.localeCompare(bookB.author, "tr-TR");
      }
      if (selectedSort === "category") {
        return bookA.category.localeCompare(bookB.category, "tr-TR");
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const shelfRows = chunkArray(filteredBooks, 3);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <AppHeader
        subtitle="Benim kitap rafım"
        active="kitaplarim"
        actions={
          <Link
            href="/kitap-ekle"
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Kitap Ekle
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Benim Rafım
                </p>

                <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-5xl">
                  Kendi sanal kütüphaneni kur.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Buradaki her kitap sadece takas kaydı değil; kapak, not,
                  kategori ve konumuyla senin kişisel kitaplığının bir parçası.
                  Rafını düzenledikçe hem kendin için arşiv oluşur hem de doğru
                  öğrenciler seni daha kolay bulur.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[320px]">
                <HeroStat label="Toplam Kitap" value={totalBooks} />
                <HeroStat label="Aktif Raf" value={activeShelfCount} />
                <HeroStat label="Notlu Kitap" value={noteCount} />
                <HeroStat label="Raf Kalitesi" value={`%${averageQuality}`} />
              </div>
            </div>

            <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/kitap-ekle"
                className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
              >
                Rafa Yeni Kitap Ekle
              </Link>

              <Link
                href="/kitap-ara"
                className="rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Platformda Kitap Ara
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 md:mt-8 md:p-5">
            Kitaplar listelenirken hata oluştu: {error.message}
          </div>
        )}

        {activeBooks.length > 0 ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LibrarySignalCard
              label="Raf Kimliği"
              value={topCategory}
              description="En yoğun kategori; profilinin okuma karakterini gösterir."
            />
            <LibrarySignalCard
              label="Kapaklı Kitap"
              value={`${coverCount}/${totalBooks}`}
              description="Kapak görselleri rafı gerçek kütüphane gibi hissettirir."
            />
            <LibrarySignalCard
              label="Paylaşıma Hazır"
              value={takasCount + oduncCount}
              description="Takas veya ödünç için hızlıca bulunabilecek kitaplar."
            />
            <LibrarySignalCard
              label="Arşiv"
              value={archiveCount}
              description="Pasif, verilmiş veya geçmişte kalmış raf kayıtları."
            />
          </section>
        ) : null}

        {activeBooks.length === 0 ? (
          <section className="mt-6 overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem]">
            <div className="bg-[#8B5E3C] px-4 py-3 text-center text-xs font-black uppercase tracking-[0.24em] text-white/85">
              Rafın şu an boş
            </div>

            <div className="relative p-8 text-center md:p-12">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#FAF7F0] text-4xl shadow-inner">
                📚
              </div>

              <h2 className="mt-5 text-2xl font-black md:text-3xl">
                İlk kitabını rafa dizmeye hazır mısın?
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                Kitap ekledikçe bu alan gerçek bir öğrenci kitaplığı gibi
                dolacak. Aradığın heyecan tam da burada başlayacak.
              </p>

              <div className="mt-8 rounded-[1.6rem] bg-[#F7E7D3] p-5 shadow-inner">
                <div className="h-5 rounded-t-[0.8rem] bg-[#7B4F2C]" />
                <div className="flex min-h-[130px] items-end justify-center gap-3 bg-[#D9B38C] px-4 py-6">
                  <div className="h-24 w-10 rounded-t-lg bg-[#2E7D5B]" />
                  <div className="h-28 w-11 rounded-t-lg bg-[#F59E0B]" />
                  <div className="h-20 w-10 rounded-t-lg bg-[#1F2933]" />
                  <div className="h-26 w-10 rounded-t-lg bg-[#C97A40]" />
                </div>
                <div className="h-5 rounded-b-[0.8rem] bg-[#7B4F2C]" />
              </div>

              <Link
                href="/kitap-ekle"
                className="mt-8 inline-flex w-full justify-center rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 sm:w-auto"
              >
                İlk Kitabımı Ekle
              </Link>
            </div>
          </section>
        ) : (
          <div className="mt-6 space-y-8 md:mt-8">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  Akıllı Raf Görünümü
                </p>

                <h2 className="mt-2 text-2xl font-black md:text-3xl">
                  Rafındaki kitaplar
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {filteredBooks.length} kitap gösteriliyor. Arama ve filtreler
                  büyüyen kitaplığını yönetilebilir tutar.
                </p>
              </div>

              <Link
                href="/kitap-ekle"
                className="rounded-full bg-[#2E7D5B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Rafı Büyüt
              </Link>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-[1.5rem] bg-white p-3 shadow-sm ring-1 ring-[#2E7D5B]/5 sm:flex-row sm:items-center">
              <div className="flex rounded-full bg-[#FAF7F0] p-1">
                {viewOptions.map((option) => {
                  const active = selectedView === option.value;

                  return (
                    <Link
                      key={option.value}
                      href={buildMyBooksUrl({
                        q: searchQuery,
                        shelf: selectedShelf,
                        sort: selectedSort,
                        view: option.value,
                      })}
                      className={`rounded-full px-4 py-2 text-xs font-black transition ${
                        active
                          ? "bg-[#2E7D5B] text-white shadow-sm"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>

              <p className="text-xs font-bold leading-5 text-slate-500">
                Liste görünümü daha az yer kaplar; kalabalık raflarda hızlı göz
                gezdirmek için idealdir.
              </p>
            </div>

            <form className="grid gap-3 rounded-[1.6rem] bg-white p-4 shadow-sm ring-1 ring-[#2E7D5B]/5 lg:grid-cols-[1fr_190px_190px_auto]">
              <input type="hidden" name="view" value={selectedView} />
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Kitap, yazar, kategori, not veya üniversite ara"
                className="min-h-[50px] rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />

              <FilterSelect
                label="Raf"
                name="shelf"
                defaultValue={selectedShelf}
                options={shelfFilters}
              />

              <FilterSelect
                label="Sıralama"
                name="sort"
                defaultValue={selectedSort}
                options={sortOptions}
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="min-h-[50px] rounded-full bg-[#2E7D5B] px-5 text-sm font-black text-white transition hover:bg-[#25684c]"
                >
                  Uygula
                </button>
                {searchQuery || selectedShelf !== "all" || selectedSort !== "newest" ? (
                  <Link
                    href="/kitaplarim"
                    className="flex min-h-[50px] items-center rounded-full bg-[#FAF7F0] px-5 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                  >
                    Sıfırla
                  </Link>
                ) : null}
              </div>
            </form>

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-[1.6rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                  Kategori Haritası
                </p>
                <div className="mt-4 space-y-3">
                  {categoryStats.map((category) => (
                    <LibraryProgress
                      key={category.label}
                      label={category.label}
                      value={category.count}
                      total={totalBooks}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[1.6rem] bg-[#10251C] p-5 text-white shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                  Raf Tavsiyesi
                </p>
                <h3 className="mt-3 text-2xl font-black">
                  Rafın ne kadar düzenliyse eşleşmeler o kadar güçlü olur.
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
                  Kapak görseli ve kısa not eklenmiş kitaplar, arama ve profil
                  ekranlarında daha güvenilir görünür. Özellikle ödünç ve takas
                  kitaplarında teslim notu eklemek kullanıcı kararını hızlandırır.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <MiniLibraryStat label="Kapak" value={`%${Math.round((coverCount / totalBooks) * 100)}`} />
                  <MiniLibraryStat label="Not" value={`%${Math.round((noteCount / totalBooks) * 100)}`} />
                  <MiniLibraryStat label="Aktif" value={`%${Math.round((activeShelfCount / totalBooks) * 100)}`} />
                </div>
              </div>
            </section>

            {filteredBooks.length === 0 ? (
              <section className="rounded-[1.8rem] border border-dashed border-[#2E7D5B]/20 bg-white p-8 text-center">
                <h3 className="text-xl font-black">Bu filtrelerde kitap yok</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  Arama kelimesini değiştirebilir, raf filtresini genişletebilir
                  veya yeni bir kitap ekleyerek koleksiyonu büyütebilirsin.
                </p>
                <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/kitaplarim"
                    className="rounded-full bg-[#FAF7F0] px-6 py-3 text-sm font-black text-[#2E7D5B]"
                  >
                    Filtreleri Temizle
                  </Link>
                  <Link
                    href="/kitap-ekle"
                    className="rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white"
                  >
                    Kitap Ekle
                  </Link>
                </div>
              </section>
            ) : null}

            {selectedView === "list" && filteredBooks.length > 0 ? (
              <section className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 md:px-5">
                  <div>
                    <p className="text-sm font-black text-[#1F2933]">
                      Kompakt Kitap Listesi
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {filteredBooks.length} kayıt tek bakışta taranabilir.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#FAF7F0] px-3 py-2 text-xs font-black text-[#2E7D5B]">
                    Az yer kaplar
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredBooks.map((userBook) => {
                    const book = getBookInfo(userBook);
                    const libraryQuality = getLibraryQuality(userBook);

                    return (
                      <article
                        key={userBook.id}
                        className="grid gap-3 px-4 py-4 transition hover:bg-[#FAF7F0] md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_140px] md:items-center md:px-5"
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="relative flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FAF7F0] text-xl shadow-sm">
                            {book.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={book.image}
                                alt={book.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "📖"
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="line-clamp-1 text-base font-black text-[#1F2933]">
                              {book.title}
                            </p>
                            <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
                              {book.author}
                            </p>
                            <p className="mt-2 line-clamp-1 text-xs font-black uppercase tracking-[0.14em] text-[#2E7D5B]">
                              {book.category}
                            </p>
                            {userBook.note ? (
                              <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-400">
                                {userBook.note}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-wrap gap-2">
                          <span className="rounded-full bg-[#FAF7F0] px-3 py-1.5 text-[11px] font-black text-[#8B5E3C]">
                            {getShelfMood(userBook)}
                          </span>
                          <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1.5 text-[11px] font-black text-[#2E7D5B]">
                            {conditionLabels[userBook.condition] || userBook.condition}
                          </span>
                          <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1.5 text-[11px] font-black text-[#B45309]">
                            {exchangeTypeLabels[userBook.exchange_type] ||
                              userBook.exchange_type}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1.5 text-[11px] font-black ${getStatusBadgeClass(
                              userBook.status
                            )}`}
                          >
                            {statusLabels[userBook.status] || userBook.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 md:justify-end">
                          <div className="min-w-[96px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-black text-slate-400">
                                Kalite
                              </span>
                              <span className="text-[11px] font-black text-[#2E7D5B]">
                                %{libraryQuality}
                              </span>
                            </div>
                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-[#2E7D5B]"
                                style={{ width: `${libraryQuality}%` }}
                              />
                            </div>
                            <p className="mt-1.5 text-[10px] font-bold text-slate-400">
                              {formatDate(userBook.created_at)}
                            </p>
                          </div>

                          <Link
                            href={`/kitaplar/${userBook.id}`}
                            className="rounded-full bg-[#2E7D5B] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#25684c]"
                          >
                            Detay
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {selectedView === "shelf" && shelfRows.map((row, rowIndex) => (
              <section
                key={`shelf-${rowIndex}`}
                className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]"
              >
                <div className="bg-[#8B5E3C] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white/85">
                  Raf {rowIndex + 1}
                </div>

                <div className="bg-[#E8D0B2] px-4 pb-6 pt-6 md:px-6">
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {row.map((userBook) => {
                      const book = getBookInfo(userBook);
                      const libraryQuality = getLibraryQuality(userBook);

                      return (
                        <article
                          key={userBook.id}
                          className="group overflow-hidden rounded-[1.6rem] bg-white shadow-md shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div
                            className={`h-2 bg-gradient-to-r ${getShelfAccentClass(
                              userBook
                            )}`}
                          />
                          <div className="p-4 md:p-5">
                            <div className="flex gap-4">
                              <div className="relative flex h-32 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] bg-[#FAF7F0] text-3xl shadow-sm md:h-36 md:w-24">
                                {book.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={book.image}
                                    alt={book.title}
                                    className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                                  />
                                ) : (
                                  "📖"
                                )}

                                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-lg font-black leading-tight text-[#1F2933]">
                                  {book.title}
                                </p>

                                <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
                                  {book.author}
                                </p>

                                <p className="mt-2 line-clamp-1 text-xs font-black uppercase tracking-[0.14em] text-[#2E7D5B]">
                                  {book.category}
                                </p>

                                <div className="mt-3 flex items-center gap-2 rounded-full bg-[#FAF7F0] px-3 py-2 text-[11px] font-black text-[#8B5E3C]">
                                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                                  {getShelfMood(userBook)}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-[11px] font-black text-[#2E7D5B]">
                                    {conditionLabels[userBook.condition] ||
                                      userBook.condition}
                                  </span>

                                  <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-[11px] font-black text-[#B45309]">
                                    {exchangeTypeLabels[userBook.exchange_type] ||
                                      userBook.exchange_type}
                                  </span>

                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-black ${getStatusBadgeClass(
                                      userBook.status
                                    )}`}
                                  >
                                    {statusLabels[userBook.status] ||
                                      userBook.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {userBook.note && (
                              <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-3">
                                <p className="line-clamp-3 text-sm leading-6 text-slate-500">
                                  {userBook.note}
                                </p>
                              </div>
                            )}

                            <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-black text-slate-500">
                                  Kütüphane kaydı
                                </p>
                                <p className="text-xs font-black text-[#2E7D5B]">
                                  %{libraryQuality}
                                </p>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-[#2E7D5B]"
                                  style={{ width: `${libraryQuality}%` }}
                                />
                              </div>
                              <p className="mt-2 text-[11px] font-bold text-slate-400">
                                Rafa eklenme: {formatDate(userBook.created_at)}
                              </p>
                            </div>

                            <div className="mt-4 rounded-2xl border border-[#2E7D5B]/10 bg-[#FCFAF7] p-3">
                              <p className="line-clamp-1 text-xs font-black text-slate-500">
                                {userBook.university || "Üniversite bilgisi yok"}
                              </p>

                              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
                                {userBook.city || "Şehir bilgisi yok"}
                              </p>
                            </div>

                            <Link
                              href={`/kitaplar/${userBook.id}`}
                              className="mt-4 block rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                            >
                              Detay Gör
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="h-5 bg-[#7B4F2C]" />
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <p className="text-xl font-black md:text-2xl">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-white/65">{label}</p>
    </div>
  );
}

function LibrarySignalCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
        {label}
      </p>
      <p className="mt-3 line-clamp-1 text-2xl font-black text-[#1F2933]">
        {value}
      </p>
      <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { label: string; value: string }[];
}) {
  return (
    <div>
      <label className="sr-only" htmlFor={`kitaplarim-${name}`}>
        {label}
      </label>
      <select
        id={`kitaplarim-${name}`}
        name={name}
        defaultValue={defaultValue}
        className="min-h-[50px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function LibraryProgress({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="line-clamp-1 text-sm font-black text-[#1F2933]">{label}</p>
        <p className="text-xs font-black text-slate-500">{value} kitap</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EFE9]">
        <div
          className="h-full rounded-full bg-[#2E7D5B]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MiniLibraryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <p className="text-lg font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
        {label}
      </p>
    </div>
  );
}
