import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FavoriteQuoteCard } from "@/components/favorite-quote-card";

export const dynamic = "force-dynamic";

type FavoriteRow = {
  id: string;
  quote_id: string;
  created_at: string;
};

type QuoteBookRow = {
  title: string | null;
  author: string | null;
  source_name: string | null;
  source_url: string | null;
};

type QuoteItemRow = {
  id: string;
  quote_text: string;
  quote_text_tr: string | null;
  original_language: string | null;
  mood: string | null;
  topic: string | null;
  estimated_read_seconds: number | null;
  quote_books: QuoteBookRow | QuoteBookRow[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export default async function FavoriteQuotesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, email, plan_type")
    .eq("id", user.id)
    .maybeSingle();

  const { data: favoritesData } = await supabase
    .from("quote_favorites")
    .select("id, quote_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const favorites = (favoritesData || []) as FavoriteRow[];
  const quoteIds = favorites.map((favorite) => favorite.quote_id);

  const { data: quotesData } =
    quoteIds.length > 0
      ? await supabase
          .from("quote_items")
          .select(
            `
            id,
            quote_text,
            quote_text_tr,
            original_language,
            mood,
            topic,
            estimated_read_seconds,
            quote_books (
              title,
              author,
              source_name,
              source_url
            )
          `
          )
          .in("id", quoteIds)
          .eq("status", "approved")
          .eq("is_active", true)
      : { data: [] };

  const quotes = (quotesData || []) as QuoteItemRow[];

  const quoteMap = new Map(quotes.map((quote) => [quote.id, quote]));

  const favoriteCards = favorites
    .map((favorite) => {
      const quote = quoteMap.get(favorite.quote_id);
      const book = first(quote?.quote_books);

      if (!quote) return null;

      return {
        favorite,
        quote,
        book,
      };
    })
    .filter(Boolean) as {
    favorite: FavoriteRow;
    quote: QuoteItemRow;
    book: QuoteBookRow | null;
  }[];

  const displayName =
    profile?.full_name ||
    profile?.username ||
    profile?.email ||
    "KampüsRaf kullanıcısı";

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-12">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              ⭐
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Favori alıntılarım
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/rastgele-raf" className="hover:text-[#2E7D5B]">
              Rastgele Raf
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </nav>

          <Link
            href="/rastgele-raf"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Zar At
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Favori Alıntılarım
                </p>

                <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
                  Beğendiğin alıntıları kendi rafında sakla.
                </h1>

                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75 md:text-base">
                  Rastgele Raf’ta favorilerine eklediğin alıntıları burada
                  tekrar okuyabilir, kopyalayabilir, paylaşabilir veya
                  favorilerinden kaldırabilirsin.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                    Kullanıcı: {displayName}
                  </span>
                  <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                    Paket: {(profile?.plan_type || "free").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-white/10 p-5 text-center backdrop-blur sm:min-w-[220px]">
                <p className="text-4xl font-black">{favoriteCards.length}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-white/65">
                  Favori Alıntı
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Link
            href="/rastgele-raf"
            className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5"
          >
            <p className="text-2xl">🎲</p>
            <p className="mt-3 text-sm font-black text-[#1F2933]">
              Rastgele Raf’a Dön
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Yeni alıntılar keşfet ve favorilerine ekle.
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5"
          >
            <p className="text-2xl">🏠</p>
            <p className="mt-3 text-sm font-black text-[#1F2933]">
              Panele Dön
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Ana ekrana dön ve kitap akışına devam et.
            </p>
          </Link>

          <Link
            href="/kitap-ara"
            className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5"
          >
            <p className="text-2xl">🔍</p>
            <p className="mt-3 text-sm font-black text-[#1F2933]">
              Kitap Ara
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Alıntıdan ilham al, yeni kitaplar keşfet.
            </p>
          </Link>
        </section>

        <section className="mt-6">
          {favoriteCards.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[#2E7D5B]/25 bg-white p-8 text-center shadow-sm md:p-12">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-[#FAF7F0] text-4xl">
                ⭐
              </div>

              <h2 className="mt-5 text-2xl font-black">
                Henüz favori alıntın yok
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-500">
                Rastgele Raf’ta zar atarak alıntı keşfet. Beğendiğin
                alıntıları favorilerine eklediğinde burada görünecek.
              </p>

              <Link
                href="/rastgele-raf"
                className="mt-6 inline-flex rounded-full bg-[#2E7D5B] px-7 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                🎲 İlk Alıntını Keşfet
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {favoriteCards.map(({ favorite, quote, book }) => (
                <FavoriteQuoteCard
                  key={favorite.id}
                  quoteId={quote.id}
                  quoteText={quote.quote_text}
                  quoteTextTr={quote.quote_text_tr}
                  originalLanguage={quote.original_language || "tr"}
                  bookTitle={book?.title || "Kitap bilgisi yok"}
                  bookAuthor={book?.author || null}
                  mood={quote.mood}
                  topic={quote.topic}
                  sourceName={book?.source_name || null}
                  sourceUrl={book?.source_url || null}
                  createdAt={favorite.created_at}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}