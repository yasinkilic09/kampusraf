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

type SearchParams = {
  q?: string;
  city?: string;
  university?: string;
  exchange_type?: string;
};

type SmartBookResult = {
  id: string;
  user_id: string;
  book_id: string;
  book_title: string;
  book_author: string | null;
  book_category: string | null;
  book_cover_url: string | null;
  custom_title: string | null;
  custom_author: string | null;
  image_url: string | null;
  note: string | null;
  city: string | null;
  university: string | null;
  book_condition: string;
  exchange_type: string;
  status: string;
  owner_full_name: string | null;
  owner_username: string | null;
  owner_university: string | null;
  owner_city: string | null;
  trust_score: number | null;
  created_at: string;
  search_score: number;
};

type SearchSuggestion = {
  label: string;
  value: string;
  suggestion_type: string;
  result_count: number;
  similarity_score: number;
};

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildSearchHref({
  q,
  city,
  university,
  exchangeType,
}: {
  q?: string;
  city?: string;
  university?: string;
  exchangeType?: string;
}) {
  const params = new URLSearchParams();

  if (q) params.set("q", q);
  if (city) params.set("city", city);
  if (university) params.set("university", university);
  if (exchangeType) params.set("exchange_type", exchangeType);

  const query = params.toString();

  return query ? `/kitap-ara?${query}` : "/kitap-ara";
}

export default async function SearchBooksPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const params = (await searchParams) || {};

  const q = params.q?.trim() || "";
  const city = params.city?.trim() || "";
  const university = params.university?.trim() || "";
  const exchangeType = params.exchange_type?.trim() || "";

  const { data, error } = await supabase.rpc("search_user_books", {
    p_search_query: q || null,
    p_filter_city: city || null,
    p_filter_university: university || null,
    p_filter_exchange_type: exchangeType || null,
  });

  const results = (data || []) as SmartBookResult[];

  const { data: suggestionData, error: suggestionError } = await supabase.rpc(
  "get_search_suggestions",
  {
    p_search_query: q || null,
  }
);

const suggestions = (suggestionData || []) as SearchSuggestion[];

const topSuggestion = suggestions[0];

const showDidYouMean =
  Boolean(q) &&
  Boolean(topSuggestion) &&
  normalizeText(topSuggestion?.value || "") !== normalizeText(q);

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-6 py-5 backdrop-blur">
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
                Akıllı kitap arama
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
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
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Akıllı Kitap Keşfi
          </p>
         <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
            Aradığın kitabı tam yazmadan da bul.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
            Türkçe karakter farklarını, eksik kelimeleri ve benzer yazımları
            dikkate alan daha esnek arama sistemi.
          </p>
        </div>

        <form
  action="/kitap-ara"
  className="mt-6 rounded-[1.7rem] bg-white p-4 shadow-sm md:mt-8 md:rounded-[2rem] md:p-6"
>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr]">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Akıllı Arama
              </label>
              <input
                name="q"
                defaultValue={q}
                placeholder="suc ceza, kurk mantolu, dostoyevski..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Örnek: “suç ve ceza” yerine “suc ceza” yazsan da sonuç bulur.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Şehir</label>
              <input
                name="city"
                defaultValue={city}
                placeholder="Aydın"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Üniversite
              </label>
              <input
                name="university"
                defaultValue={university}
                placeholder="ADÜ, Adnan Menderes..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Paylaşım
              </label>
              <select
                name="exchange_type"
                defaultValue={exchangeType}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              >
                <option value="">Tümü</option>
                <option value="takas">Takas</option>
                <option value="odunc">Ödünç</option>
                <option value="satis">Satış</option>
                <option value="bagis">Bağış</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:flex sm:flex-row">
            <button
              type="submit"
              className="rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
            >
              Akıllı Ara
            </button>

            <Link
              href="/kitap-ara"
              className="rounded-full border border-[#2E7D5B]/20 px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#FAF7F0]"
            >
              Filtreleri Temizle
            </Link>
          </div>
        </form>

        {suggestionError && (
  <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
    Arama önerileri yüklenemedi: {suggestionError.message}
  </div>
)}

{showDidYouMean && topSuggestion && (
  <div className="mt-5 rounded-[2rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm">
    <p className="text-sm font-black text-[#F59E0B]">
      Bunu mu demek istedin?
    </p>

    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xl font-black text-[#1F2933]">
          {topSuggestion.value}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {topSuggestion.suggestion_type} · {topSuggestion.result_count} eşleşen kayıt
        </p>
      </div>

      <Link
        href={buildSearchHref({
          q: topSuggestion.value,
          city,
          university,
          exchangeType,
        })}
        className="rounded-full bg-[#F59E0B] px-6 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5"
      >
        Bu Sonucu Ara
      </Link>
    </div>
  </div>
)}

{suggestions.length > 0 && (
  <div className="mt-5 rounded-[2rem] bg-white p-5 shadow-sm">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-black text-[#2E7D5B]">
          {q ? "Arama önerileri" : "Popüler aramalar"}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {q
            ? "Benzer kitap, yazar, kategori ve kampüs kayıtları."
            : "Sistemde en çok bulunan kitap, yazar, kategori ve kampüs başlıkları."}
        </p>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <Link
          key={`${suggestion.suggestion_type}-${suggestion.value}`}
          href={buildSearchHref({
            q: suggestion.value,
            city,
            university,
            exchangeType,
          })}
          className="rounded-full border border-[#2E7D5B]/15 bg-[#FAF7F0] px-4 py-2 text-xs font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:border-[#2E7D5B]/30 hover:bg-[#F5EBDD]"
        >
          {suggestion.value}
          <span className="ml-2 text-slate-400">
            {suggestion.suggestion_type}
          </span>
        </Link>
      ))}
    </div>
  </div>
)}

       <div className="mt-6 flex flex-col justify-between gap-3 md:mt-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black">Arama Sonuçları</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {results.length} aktif kitap listeleniyor.
            </p>
          </div>

          <Link
  href="/kitap-ekle"
  className="rounded-full bg-white px-5 py-3 text-center text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-0.5"
>
  Kitap Ekle
</Link>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
            Akıllı arama sırasında hata oluştu: {error.message}
          </div>
        )}

        {!error && results.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-[#2E7D5B]/30 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
              🔎
            </div>
            <h3 className="mt-5 text-2xl font-black">Sonuç bulunamadı</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Aradığın kitap henüz eklenmemiş olabilir. Daha kısa bir kelimeyle
              veya yazar adıyla tekrar dene.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {results.map((book) => {
              const title = book.custom_title || book.book_title || "İsimsiz Kitap";
              const author =
                book.custom_author || book.book_author || "Yazar bilgisi yok";
              const image = book.image_url || book.book_cover_url;
              const ownerName =
                book.owner_full_name ||
                book.owner_username ||
                "KampüsRaf kullanıcısı";
              const ownerUniversity =
                book.owner_university ||
                book.university ||
                "Üniversite bilgisi yok";
              const ownerCity = book.owner_city || book.city || "Şehir bilgisi yok";
              const isMine = book.user_id === user.id;

              return (
                <article
  key={book.id}
  className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]"
>
                  <div className="flex gap-3 p-4 md:gap-4 md:p-6">
                    <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FAF7F0] text-3xl md:h-32 md:w-24">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "📖"
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#F59E0B]">
                          {exchangeTypeLabels[book.exchange_type] ||
                            book.exchange_type}
                        </span>

                        {isMine && (
                          <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                            Senin kitabın
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 line-clamp-2 text-lg font-black leading-tight text-[#1F2933] md:text-xl">
                        {title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
                        {author}
                      </p>
                      <p className="mt-2 text-xs font-bold text-[#2E7D5B]">
                        {book.book_category || "Kategori yok"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 px-4 py-4 md:px-6 md:py-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-xs font-black text-[#2E7D5B]">
                        {conditionLabels[book.book_condition] ||
                          book.book_condition}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {book.status}
                      </span>
                    </div>

                    {book.note && (
                      <p className="mt-4 text-sm leading-6 text-slate-500">
                        {book.note}
                      </p>
                    )}

                    <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-3 text-sm md:mt-5 md:p-4">
                      <p className="font-black text-[#1F2933]">{ownerName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {ownerUniversity}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {ownerCity}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 md:mt-5 md:gap-3">
                      <Link
                        href={`/kitaplar/${book.id}`}
                        className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                      >
                        Detay Gör
                      </Link>

                      <span className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-xs font-black text-[#2E7D5B]">
                        Mesaj Yakında
                      </span>
                    </div>
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