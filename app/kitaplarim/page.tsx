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

  const activeBooks = books || [];

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📚
            </div>
            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">Kitaplarım</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="flex flex-col justify-between gap-5 rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:flex-row md:items-end md:rounded-[2rem] md:p-12">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
              Benim Rafım
            </p>
            <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
  Kitaplarım
</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
              Sisteme eklediğin kitapları buradan takip edebilirsin. Bu kitaplar
              diğer öğrencilerin arama sonuçlarında görünür.
            </p>
          </div>

          <Link
  href="/kitap-ekle"
  className="w-full rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-1 sm:w-auto"
>
  Yeni Kitap Ekle
</Link>
        </div>

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Toplam Kitap</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B] md:mt-3 md:text-4xl">
              {activeBooks.length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Takasa Açık</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B] md:mt-3 md:text-4xl">
              {activeBooks.filter((book) => book.exchange_type === "takas").length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Ödünç Verilebilir</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B] md:mt-3 md:text-4xl">
              {activeBooks.filter((book) => book.exchange_type === "odunc").length}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 md:mt-8 md:p-5">
            Kitaplar listelenirken hata oluştu: {error.message}
          </div>
        )}

        {activeBooks.length === 0 ? (
          <div className="mt-6 rounded-[1.7rem] border border-dashed border-[#2E7D5B]/30 bg-white p-6 text-center shadow-sm md:mt-8 md:rounded-[2rem] md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              📚
            </div>
            <h2 className="mt-5 text-xl font-black md:text-2xl">Henüz kitap eklemedin</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              İlk kitabını eklediğinde burada görünecek. Kitabın başka bir
              öğrencinin aradığı kaynak olabilir.
            </p>
            <Link
              href="/kitap-ekle"
              className="mt-6 inline-flex w-full justify-center rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-1 sm:w-auto"
            >
              İlk Kitabımı Ekle
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
            {activeBooks.map((userBook) => {
              const book = getBookInfo(userBook);

              return (
                <article
  key={userBook.id}
  className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]"
>
                  <div className="flex gap-3 p-4 md:gap-4 md:p-6">
                    <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-2xl md:h-28 md:w-20 md:text-3xl">
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

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-lg font-black leading-tight text-[#1F2933] md:text-xl">
  {book.title}
</p>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
  {book.author}
</p>
                      <p className="mt-2 line-clamp-1 text-xs font-bold text-[#2E7D5B]">
  {book.category}
</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 px-4 py-4 md:px-6 md:py-5">
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      <span className="rounded-full bg-[#2E7D5B]/10 px-2.5 py-1 text-[11px] md:px-3 md:text-xs font-black text-[#2E7D5B]">
                        {conditionLabels[userBook.condition] || userBook.condition}
                      </span>
                      <span className="rounded-full bg-[#F59E0B]/10 px-2.5 py-1 text-[11px] md:px-3 md:text-xs font-black text-[#F59E0B]">
                        {exchangeTypeLabels[userBook.exchange_type] ||
                          userBook.exchange_type}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] md:px-3 md:text-xs font-black text-slate-600">
                        {statusLabels[userBook.status] || userBook.status}
                      </span>
                    </div>

                    {userBook.note && (
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500 md:mt-4">
  {userBook.note}
</p>
                    )}

                    <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-3 text-xs font-semibold text-slate-500 md:mt-5 md:p-4">
  <p className="line-clamp-1">
    {userBook.university || "Üniversite bilgisi yok"}
  </p>
  <p className="mt-1 line-clamp-1">
    {userBook.city || "Şehir bilgisi yok"}
  </p>
</div>

<Link
  href={`/kitaplar/${userBook.id}`}
  className="mt-4 block rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5"
>
  Detay Gör
</Link>

                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}