"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const conditions = [
  { value: "yeni", label: "Yeni" },
  { value: "temiz", label: "Temiz" },
  { value: "az_kullanilmis", label: "Az Kullanılmış" },
  { value: "orta", label: "Orta" },
  { value: "yipranmis", label: "Yıpranmış" },
];

const exchangeTypes = [
  { value: "takas", label: "Takas" },
  { value: "odunc", label: "Ödünç" },
  { value: "satis", label: "Satış" },
  { value: "bagis", label: "Bağış" },
];

type CatalogBook = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  cover_url: string | null;
  published_year: number | null;
  owner_count: number;
};

type ExternalBook = {
  source: "google_books" | "open_library";
  source_id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_year: number | null;
  description: string | null;
};

export default function AddBookPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [isbn, setIsbn] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [bookCondition, setBookCondition] = useState("temiz");
  const [exchangeType, setExchangeType] = useState("takas");
  const [note, setNote] = useState("");
  const [city, setCity] = useState("");
  const [university, setUniversity] = useState("");

  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogBook[]>([]);
  const [selectedCatalogBook, setSelectedCatalogBook] =
    useState<CatalogBook | null>(null);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [hasSearchedCatalog, setHasSearchedCatalog] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isCatalogBookSelected = Boolean(selectedCatalogBook);

  const [publisher, setPublisher] = useState("");
const [publishedYear, setPublishedYear] = useState("");
const [description, setDescription] = useState("");

const [externalResults, setExternalResults] = useState<ExternalBook[]>([]);
const [isSearchingExternal, setIsSearchingExternal] = useState(false);
const [externalError, setExternalError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("monthly_book_limit, account_status, city, university")
        .eq("id", user.id)
        .single();

      if (profile?.account_status === "banned") {
        window.location.href = "/hesap-kisitlandi";
        return;
      }

      if (profile?.account_status === "suspended") {
        setError("Hesabın geçici olarak askıya alındığı için kitap ekleyemezsin.");
        return;
      }

      setError("");

      if (profile?.city) setCity(profile.city);
      if (profile?.university) setUniversity(profile.university);
    }

    loadProfile();
  }, [router, supabase]);

  useEffect(() => {
    const query = catalogQuery.trim();

    if (query.length < 2) {
      setCatalogResults([]);
      setHasSearchedCatalog(false);
      setIsSearchingCatalog(false);
      return;
    }

    let isActive = true;

    const timer = window.setTimeout(async () => {
      setIsSearchingCatalog(true);
      setHasSearchedCatalog(true);

      const { data, error: searchError } = await supabase.rpc(
        "search_books_catalog",
        {
          search_query: query,
          result_limit: 10,
        }
      );

      if (!isActive) return;

      if (searchError) {
        console.error("Katalog arama hatası:", searchError);
        setCatalogResults([]);
        setIsSearchingCatalog(false);
        return;
      }

      setCatalogResults((data || []) as CatalogBook[]);
      setIsSearchingCatalog(false);
    }, 350);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [catalogQuery, supabase]);

  function getCurrentMonthStart() {
    const now = new Date();

    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
    ).toISOString();
  }

  async function checkBookLimit(userId: string) {
    const monthStart = getCurrentMonthStart();

    const { data: profile } = await supabase
      .from("profiles")
      .select("monthly_book_limit")
      .eq("id", userId)
      .single();

    const { count } = await supabase
      .from("user_books")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart);

    const limit = profile?.monthly_book_limit ?? 10;
    const currentUsage = count ?? 0;

    return {
      allowed: currentUsage < limit,
      currentUsage,
      limit,
      remaining: Math.max(limit - currentUsage, 0),
    };
  }

  function selectCatalogBook(book: CatalogBook) {
    setSelectedCatalogBook(book);
    setTitle(book.title || "");
    setAuthor(book.author || "");
    setCategory(book.category || "");
    setIsbn(book.isbn || "");
    setCoverUrl(book.cover_url || "");
    setPublisher("");
    setPublishedYear(book.published_year ? String(book.published_year) : "");
    setDescription("");
    setMessage("Kitap kütüphaneden seçildi. Şimdi kendi kopya bilgilerini gir.");
  }

  async function searchExternalBooks() {
  const query = catalogQuery.trim() || title.trim();

  if (query.length < 2) {
    setExternalError("İnternetten arama için kitap adı, yazar veya ISBN gir.");
    return;
  }

  setIsSearchingExternal(true);
  setExternalError("");
  setExternalResults([]);

  try {
    const response = await fetch(
      `/api/books/external-search?q=${encodeURIComponent(query)}`
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || "İnternetten kitap bilgisi alınamadı.");
    }

    setExternalResults((payload.books || []) as ExternalBook[]);

    if (!payload.books || payload.books.length === 0) {
      setExternalError("İnternette uygun kitap bilgisi bulunamadı.");
    }
  } catch (searchError) {
    const searchMessage =
      searchError instanceof Error
        ? searchError.message
        : "İnternetten kitap bilgisi alınamadı.";

    setExternalError(searchMessage);
  } finally {
    setIsSearchingExternal(false);
  }
}

function selectExternalBook(book: ExternalBook) {
  setSelectedCatalogBook(null);

  setTitle(book.title || "");
  setAuthor(book.author || "");
  setCategory(book.category || "");
  setIsbn(book.isbn || "");
  setCoverUrl(book.cover_url || "");
  setPublisher(book.publisher || "");
  setPublishedYear(book.published_year ? String(book.published_year) : "");
  setDescription(book.description || "");

  setMessage(
    "Kitap bilgileri internetten otomatik dolduruldu. Bilgileri kontrol edip rafına ekleyebilirsin."
  );
}

  function clearSelectedCatalogBook() {
    setSelectedCatalogBook(null);
    setPublisher("");
    setPublishedYear("");
    setDescription("");
    setMessage("Seçim kaldırıldı. Kitabı manuel katalog kaydı olarak ekleyebilirsin.");
  }

  async function findExistingBookId() {
    const cleanIsbn = isbn.trim();
    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();

    if (cleanIsbn) {
      const { data: existingByIsbn } = await supabase
        .from("books")
        .select("id")
        .eq("isbn", cleanIsbn)
        .limit(1)
        .maybeSingle();

      if (existingByIsbn?.id) return existingByIsbn.id as string;
    }

    if (cleanTitle && cleanAuthor) {
      const { data: existingByName } = await supabase
        .from("books")
        .select("id")
        .ilike("title", cleanTitle)
        .ilike("author", cleanAuthor)
        .limit(1)
        .maybeSingle();

      if (existingByName?.id) return existingByName.id as string;
    }

    return null;
  }

  async function createCatalogBook() {
    const { data: book, error: bookError } = await supabase
      .from("books")
      .insert({
  title: title.trim(),
  author: author.trim(),
  category: category.trim() || null,
  isbn: isbn.trim() || null,
  cover_url: coverUrl.trim() || null,
  publisher: publisher.trim() || null,
  published_year: publishedYear.trim() ? Number(publishedYear.trim()) : null,
  description: description.trim() || null,
})
      .select("id")
      .single();

    if (bookError || !book) {
      throw new Error(bookError?.message || "Kitap katalog kaydı oluşturulamadı.");
    }

    return book.id as string;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (error) {
      setMessage(error);
      return;
    }

    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Oturum bulunamadı. Lütfen tekrar giriş yap.");
      setIsLoading(false);
      router.push("/auth/login");
      return;
    }

    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();

    if (!cleanTitle || !cleanAuthor) {
      setMessage("Kitap adı ve yazar bilgisi zorunludur.");
      setIsLoading(false);
      return;
    }

    if (!city.trim() || !university.trim()) {
      setMessage("Şehir ve üniversite bilgisi zorunludur.");
      setIsLoading(false);
      return;
    }

    const limitCheck = await checkBookLimit(user.id);

    if (!limitCheck.allowed) {
      setMessage(
        `Aylık kitap ekleme limitine ulaştın. Mevcut limitin: ${limitCheck.limit}/ay.`
      );
      setIsLoading(false);
      return;
    }

    try {
      let bookId = selectedCatalogBook?.id || null;

      if (!bookId) {
        bookId = await findExistingBookId();
      }

      if (!bookId) {
        bookId = await createCatalogBook();
      }

      const { data: userBook, error: userBookError } = await supabase
        .from("user_books")
        .insert({
          user_id: user.id,
          book_id: bookId,
          condition: bookCondition,
          exchange_type: exchangeType,
          status: "mevcut",
          custom_title: cleanTitle,
          custom_author: cleanAuthor,
          image_url: coverUrl.trim() || null,
          note: note.trim() || null,
          city: city.trim(),
          university: university.trim(),
          is_active: true,
        })
        .select("id")
        .single();

      if (userBookError) {
        throw new Error(userBookError.message);
      }

      if (userBook?.id) {
        const { error: matchError } = await supabase.rpc(
          "create_matches_for_user_book",
          {
            p_user_book_id: userBook.id,
          }
        );

        if (matchError) {
          console.warn("Eşleşme oluşturma uyarısı:", {
            code: matchError.code,
            message: matchError.message,
            details: matchError.details,
            hint: matchError.hint,
          });
        }
      }

      setMessage(
        selectedCatalogBook
          ? "Kitap hazır kütüphaneden seçilerek rafına eklendi. Kitaplarım sayfasına yönlendiriliyorsun."
          : "Kitap katalog kaydıyla birlikte rafına eklendi. Kitaplarım sayfasına yönlendiriliyorsun."
      );

      setTimeout(() => {
        router.push("/kitaplarim");
        router.refresh();
      }, 900);
    } catch (submitError) {
      const submitMessage =
        submitError instanceof Error
          ? submitError.message
          : "Kitap eklenirken bilinmeyen bir hata oluştu.";

      console.error("Kitap ekleme hatası:", submitError);
      setMessage(`Kitap eklenemedi: ${submitMessage}`);
      setIsLoading(false);
    }
  }

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
                Kitap ekle
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitaplarim" className="hover:text-[#2E7D5B]">
              Kitaplarım
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 md:py-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
        <aside className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Hazır Kütüphane
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight md:text-4xl">
            Kitabını daha hızlı rafa ekle.
          </h1>

          <p className="mt-4 text-sm leading-7 text-white/75 md:text-base">
            Önce KampüsRaf kütüphanesinde kitap ara. Kitap zaten varsa tek tıkla
            seç, sadece kendi kopya bilgilerini gir. Yoksa yeni katalog kaydı
            oluştur.
          </p>

          <div className="mt-6 space-y-3 md:mt-8 md:space-y-4">
            {[
              "Kitap adı, yazar veya ISBN ile arama yap.",
              "Hazır kaydı seçersen form otomatik dolar.",
              "Kendi kitabının durumunu ve paylaşım türünü gir.",
              "KampüsRaf arşivi her yeni kayıtla güçlenir.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/10 p-3 text-sm font-semibold text-white/85 md:rounded-3xl md:p-4"
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                1. Adım
              </p>

              <h2 className="mt-3 text-2xl font-black md:text-3xl">
                KampüsRaf kütüphanesinde ara
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Kitap daha önce eklenmişse tekrar yazmana gerek yok. Seçtiğin
                kitap hazır katalogdan gelir.
              </p>
            </div>

            <div className="mt-5">
              <label className="text-sm font-bold text-slate-700">
                Kitap adı, yazar veya ISBN
              </label>

              <input
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                placeholder="Örn: Suç ve Ceza, Dostoyevski, 978..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            {isSearchingCatalog && (
              <div className="mt-4 rounded-2xl bg-[#FAF7F0] px-4 py-3 text-sm font-bold text-slate-500">
                Kütüphane aranıyor...
              </div>
            )}

            {!isSearchingCatalog &&
              hasSearchedCatalog &&
              catalogQuery.trim().length >= 2 &&
              catalogResults.length === 0 && (
                <div className="mt-4 rounded-2xl border border-dashed border-[#2E7D5B]/25 bg-[#FAF7F0] p-4">
                  <p className="text-sm font-black text-[#1F2933]">
                    Bu kitap hazır kütüphanede bulunamadı.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Aşağıdaki formu doldurarak bu kitabı KampüsRaf kataloguna
                    yeni kayıt olarak ekleyebilirsin.
                  </p>
                </div>
              )}

            {catalogResults.length > 0 && (
              <div className="mt-4 grid gap-3">
                {catalogResults.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => selectCatalogBook(book)}
                    className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                      selectedCatalogBook?.id === book.id
                        ? "border-[#2E7D5B] bg-[#2E7D5B]/5"
                        : "border-slate-100 bg-[#FAF7F0] hover:border-[#2E7D5B]/30"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-xl shadow-sm">
                        {book.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "📘"
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-black text-[#1F2933]">
                          {book.title}
                        </p>

                        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                          {book.author}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                          {book.category && (
                            <span className="rounded-full bg-white px-3 py-1 text-slate-500">
                              {book.category}
                            </span>
                          )}

                          {book.published_year && (
                            <span className="rounded-full bg-white px-3 py-1 text-slate-500">
                              {book.published_year}
                            </span>
                          )}

                          <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-[#2E7D5B]">
                            {Number(book.owner_count || 0)} rafta
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedCatalogBook && (
              <div className="mt-4 rounded-2xl border border-[#2E7D5B]/20 bg-[#2E7D5B]/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-[#2E7D5B]">
                      Hazır kütüphaneden seçildi
                    </p>

                    <p className="mt-1 text-sm font-bold text-[#1F2933]">
                      {selectedCatalogBook.title} — {selectedCatalogBook.author}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedCatalogBook}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:-translate-y-0.5"
                  >
                    Seçimi kaldır
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-black text-[#1F2933]">
        Kitap kütüphanede yok mu?
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        Kitap adını veya ISBN bilgisini yazıp internetten otomatik kitap bilgisi
        çekebilirsin.
      </p>
    </div>

    <button
      type="button"
      onClick={searchExternalBooks}
      disabled={isSearchingExternal}
      className="rounded-full bg-[#F59E0B] px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSearchingExternal ? "Bilgi çekiliyor..." : "İnternetten Bilgi Çek"}
    </button>
  </div>

  {externalError && (
    <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-red-600">
      {externalError}
    </div>
  )}

  {externalResults.length > 0 && (
    <div className="mt-4 grid gap-3">
      {externalResults.map((book) => (
        <button
          key={`${book.source}-${book.source_id}`}
          type="button"
          onClick={() => selectExternalBook(book)}
          className="w-full rounded-2xl border border-white bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#F59E0B]/40"
        >
          <div className="flex gap-3">
            <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FAF7F0] text-xl shadow-sm">
              {book.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                "📗"
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-black text-[#1F2933]">
                {book.title}
              </p>

              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                {book.author}
              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                {book.source && (
                  <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-[#B45309]">
                    {book.source === "google_books"
                      ? "Google Books"
                      : "Open Library"}
                  </span>
                )}

                {book.published_year && (
                  <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-slate-500">
                    {book.published_year}
                  </span>
                )}

                {book.isbn && (
                  <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-slate-500">
                    ISBN: {book.isbn}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )}
</div>
          </div>

          <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-9">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                2. Adım
              </p>

              <h2 className="mt-3 text-2xl font-black md:text-3xl">
                {isCatalogBookSelected
                  ? "Kendi kopya bilgilerini gir"
                  : "Kitap bilgilerini tamamla"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isCatalogBookSelected
                  ? "Kitap bilgileri hazır kütüphaneden geldi. Şimdi kitabının durumu, paylaşım türü ve konum bilgilerini gir."
                  : "Kitap hazır kütüphanede yoksa buradan yeni katalog kaydı oluşturabilirsin."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-5 space-y-4 md:mt-8 md:space-y-5"
            >
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Kitap Adı
                  </label>

                  <input
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={isCatalogBookSelected}
                    placeholder="Suç ve Ceza"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Yazar
                  </label>

                  <input
                    required
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    disabled={isCatalogBookSelected}
                    placeholder="Dostoyevski"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Kategori
                  </label>

                  <input
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    disabled={isCatalogBookSelected}
                    placeholder="Roman, Ders Kitabı, Akademik..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    ISBN
                  </label>

                  <input
                    value={isbn}
                    onChange={(event) => setIsbn(event.target.value)}
                    disabled={isCatalogBookSelected}
                    placeholder="İsteğe bağlı"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Kapak Görseli URL
                </label>

                <input
                  value={coverUrl}
                  onChange={(event) => setCoverUrl(event.target.value)}
                  disabled={isCatalogBookSelected}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Kitap Durumu
                  </label>

                  <select
                    value={bookCondition}
                    onChange={(event) => setBookCondition(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  >
                    {conditions.map((condition) => (
                      <option key={condition.value} value={condition.value}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Paylaşım Türü
                  </label>

                  <select
                    value={exchangeType}
                    onChange={(event) => setExchangeType(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  >
                    {exchangeTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Şehir
                  </label>

                  <input
                    required
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Aydın"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Üniversite
                  </label>

                  <input
                    required
                    value={university}
                    onChange={(event) => setUniversity(event.target.value)}
                    placeholder="Aydın Adnan Menderes Üniversitesi"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Açıklama / Not
                </label>

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Kitabın durumu, teslim şekli veya takas tercihin hakkında kısa bilgi yazabilirsin."
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              {(error || message) && (
                <div
                  className={`break-words rounded-2xl px-4 py-3 text-sm font-semibold ${
                    error
                      ? "bg-red-50 text-red-600"
                      : "bg-[#FAF7F0] text-[#2E7D5B]"
                  }`}
                >
                  {error || message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || Boolean(error)}
                className="w-full rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading
                  ? "Kitap ekleniyor..."
                  : isCatalogBookSelected
                  ? "Seçili Kitabı Rafa Ekle"
                  : "Yeni Kitabı Kataloğa ve Rafa Ekle"}
              </button>
            </form>
          </section>
        </section>
      </section>
    </main>
  );
}