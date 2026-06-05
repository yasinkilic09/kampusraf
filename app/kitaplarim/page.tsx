import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export default async function MyBooksPage() {
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

  const shelfRows = chunkArray(activeBooks, 3);

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📚
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Benim kitap rafım
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/akis" className="hover:text-[#2E7D5B]">
              Akış
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/eslesmeler" className="hover:text-[#2E7D5B]">
              Eşleşmeler
            </Link>
          </nav>

          <Link
            href="/kitap-ekle"
            className="rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Kitap Ekle
          </Link>
        </div>
      </header>

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
                  Kitaplarını kendi rafında sergile.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Buradaki her kitap senin kişisel rafının bir parçası. Diğer
                  öğrenciler bu kitapları aradığında seni görebilir, sen de
                  rafını zamanla büyütebilirsin.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[320px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{totalBooks}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Toplam Kitap
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {activeShelfCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Aktif Raf
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{takasCount}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Takasa Açık
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{oduncCount}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Ödünç Verilebilir
                  </p>
                </div>
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
                  Kitap Rafın
                </p>

                <h2 className="mt-2 text-2xl font-black md:text-3xl">
                  Rafındaki kitaplar
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Her raf, senin eklediğin kitapların vitrinidir.
                </p>
              </div>

              <Link
                href="/kitap-ekle"
                className="rounded-full bg-[#2E7D5B] px-6 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Rafı Büyüt
              </Link>
            </div>

            {shelfRows.map((row, rowIndex) => (
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

                      return (
                        <article
                          key={userBook.id}
                          className="group overflow-hidden rounded-[1.6rem] bg-white shadow-md shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-xl"
                        >
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