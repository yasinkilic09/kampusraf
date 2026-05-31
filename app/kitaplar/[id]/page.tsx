import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConversationAction } from "@/app/actions/conversations";

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

type BookDetail = {
  id: string;
  user_id: string;
  book_id: string;
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
        isbn: string | null;
        cover_url: string | null;
        description: string | null;
      }
    | {
        title: string;
        author: string | null;
        category: string | null;
        isbn: string | null;
        cover_url: string | null;
        description: string | null;
      }[]
    | null;
  profiles:
    | {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
        university: string | null;
        department: string | null;
        city: string | null;
        bio: string | null;
        trust_score: number | null;
        is_verified: boolean | null;
      }
    | {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
        university: string | null;
        department: string | null;
        city: string | null;
        bio: string | null;
        trust_score: number | null;
        is_verified: boolean | null;
      }[]
    | null;
};

function getBookInfo(userBook: BookDetail) {
  const relatedBook = Array.isArray(userBook.books)
    ? userBook.books[0]
    : userBook.books;

  return {
    title: userBook.custom_title || relatedBook?.title || "İsimsiz Kitap",
    author: userBook.custom_author || relatedBook?.author || "Yazar bilgisi yok",
    category: relatedBook?.category || "Kategori yok",
    isbn: relatedBook?.isbn || null,
    description: relatedBook?.description || null,
    image: userBook.image_url || relatedBook?.cover_url || null,
  };
}

function getOwnerInfo(userBook: BookDetail) {
  const owner = Array.isArray(userBook.profiles)
    ? userBook.profiles[0]
    : userBook.profiles;

  return {
    fullName: owner?.full_name || "KampüsRaf kullanıcısı",
    username: owner?.username || "",
    avatarUrl: owner?.avatar_url || null,
    university: owner?.university || userBook.university || "Üniversite bilgisi yok",
    department: owner?.department || "Bölüm bilgisi yok",
    city: owner?.city || userBook.city || "Şehir bilgisi yok",
    bio: owner?.bio || null,
    trustScore: owner?.trust_score || 0,
    isVerified: owner?.is_verified || false,
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .from("user_books")
    .select(
      `
      id,
      user_id,
      book_id,
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
        isbn,
        cover_url,
        description
      ),
      profiles (
        full_name,
        username,
        avatar_url,
        university,
        department,
        city,
        bio,
        trust_score,
        is_verified
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const userBook = data as BookDetail;
  const book = getBookInfo(userBook);
  const owner = getOwnerInfo(userBook);
  const isMine = userBook.user_id === user.id;

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
              <p className="text-xs font-semibold text-slate-500">
                Kitap detayı
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/kitaplarim" className="hover:text-[#2E7D5B]">
              Kitaplarım
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
<Link
  href="/kitap-ara"
  className="inline-flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-0.5 sm:w-auto"
>
  ← Arama sonuçlarına dön
</Link>

        <div className="mt-6 grid gap-5 md:mt-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <section className="rounded-[1.7rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-8">
            <div className="overflow-hidden rounded-[1.5rem] bg-[#FAF7F0]">
              <div className="flex min-h-[280px] items-center justify-center md:min-h-[420px]">
                {book.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.image}
                    alt={book.title}
                    className="h-full max-h-[360px] w-full object-cover md:max-h-[520px]"
                  />
                ) : (
                  <div className="flex h-[280px] w-full flex-col items-center justify-center text-center md:h-[420px]">
                    <div className="text-8xl">📖</div>
                    <p className="mt-5 text-sm font-bold text-slate-500">
                      Kitap kapağı eklenmemiş
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 md:mt-6 md:gap-4">
              <div className="rounded-2xl bg-[#FAF7F0] p-4 md:rounded-3xl md:p-5">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                  Durum
                </p>
                <p className="mt-2 text-base font-black text-[#2E7D5B] md:text-lg">
                  {conditionLabels[userBook.condition] || userBook.condition}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4 md:rounded-3xl md:p-5">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                  Paylaşım
                </p>
                <p className="mt-2 text-base font-black text-[#F59E0B] md:text-lg">
                  {exchangeTypeLabels[userBook.exchange_type] ||
                    userBook.exchange_type}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7F0] p-4 md:rounded-3xl md:p-5">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                  Uygunluk
                </p>
                <p className="mt-2 text-base font-black text-[#2E7D5B] md:text-lg">
                  {statusLabels[userBook.status] || userBook.status}
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-10">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-2 text-[11px] font-black text-white md:px-4 md:text-xs">
                  {book.category}
                </span>

                {isMine && (
                  <span className="rounded-full bg-[#F59E0B] px-3 py-2 text-[11px] font-black text-white md:px-4 md:text-xs">
                    Senin kitabın
                  </span>
                )}
              </div>

              <h1 className="mt-5 break-words text-3xl font-black leading-tight tracking-tight md:text-6xl">
  {book.title}
</h1>

              <p className="mt-4 line-clamp-2 text-lg font-bold text-white/75 md:text-xl">
  {book.author}
</p>

              {book.isbn && (
                <p className="mt-3 text-sm font-semibold text-white/55">
                  ISBN: {book.isbn}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-8">
               {isMine ? (
  <Link
    href="/kitaplarim"
    className="w-full rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-1 sm:w-auto"
  >
    Kitaplarım’a Git
  </Link>
) : (
  <form action={startConversationAction} className="w-full sm:w-auto">
    <input type="hidden" name="userBookId" value={userBook.id} />
    <button
      type="submit"
      className="w-full rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-1"
    >
      Mesaj Gönder
    </button>
  </form>
)}

                <Link
  href="/kitap-ara"
  className="w-full rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/10 sm:w-auto"
>
  Benzer Kitapları Ara
</Link>
              </div>
            </div>

            <div className="mt-5 rounded-[1.7rem] bg-white p-5 shadow-sm md:mt-6 md:rounded-[2rem] md:p-7">
              <h2 className="text-xl font-black md:text-2xl">Kitap Açıklaması</h2>

              {userBook.note || book.description ? (
                <p className="mt-3 text-sm leading-7 text-slate-600 md:mt-4 md:text-base md:leading-8">
                  {userBook.note || book.description}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-7 text-slate-500 md:mt-4 md:text-base md:leading-8">
                  Bu kitap için henüz açıklama eklenmemiş.
                </p>
              )}
            </div>

            <div className="mt-5 rounded-[1.7rem] bg-white p-5 shadow-sm md:mt-6 md:rounded-[2rem] md:p-7">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-xl md:h-16 md:w-16 md:rounded-3xl md:text-2xl">
                  {owner.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={owner.avatarUrl}
                      alt={owner.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "👤"
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="line-clamp-2 text-xl font-black leading-tight md:text-2xl">
  {owner.fullName}
</h2>

                    {owner.isVerified && (
                      <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                        Doğrulanmış
                      </span>
                    )}
                  </div>

                  {owner.username && (
                    <p className="mt-1 line-clamp-1 text-sm font-bold text-[#2E7D5B]">
  @{owner.username}
</p>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 md:mt-5">
                    <div className="rounded-2xl bg-[#FAF7F0] p-3 md:p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                        Üniversite
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-700">
                        {owner.university}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FAF7F0] p-3 md:p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                        Bölüm
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-700">
                        {owner.department}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FAF7F0] p-3 md:p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                        Şehir
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-700">
                        {owner.city}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FAF7F0] p-3 md:p-4">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                        Güven Puanı
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-700">
                        {owner.trustScore}
                      </p>
                    </div>
                  </div>

                  {owner.bio && (
                    <p className="mt-4 rounded-2xl bg-[#FAF7F0] p-3 text-sm leading-7 text-slate-600 md:mt-5 md:p-4">
  {owner.bio}
</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.7rem] border border-[#2E7D5B]/10 bg-white p-5 shadow-sm md:mt-6 md:rounded-[2rem] md:p-7">
              <h2 className="text-xl font-black md:text-2xl">Güvenli Paylaşım Notu</h2>
              <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600 md:mt-5">
                <p>✓ Tam adres paylaşmadan önce kullanıcıyla uygulama içinde konuş.</p>
                <p>✓ Mümkünse kampüs, kütüphane veya kalabalık bir noktada buluş.</p>
                <p>✓ Kitap teslimi tamamlanmadan kişisel bilgilerini paylaşma.</p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}