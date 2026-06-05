"use client";

import { useState } from "react";
import { createBookRequestAction } from "@/app/actions/book-requests";

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

type BookRequestSmartFormProps = {
  defaultCity?: string | null;
  defaultUniversity?: string | null;
};

export function BookRequestSmartForm({
  defaultCity,
  defaultUniversity,
}: BookRequestSmartFormProps) {
  const [externalQuery, setExternalQuery] = useState("");
  const [externalResults, setExternalResults] = useState<ExternalBook[]>([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const [externalError, setExternalError] = useState("");

  const [selectedExternalBook, setSelectedExternalBook] =
    useState<ExternalBook | null>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState(defaultCity || "");
  const [university, setUniversity] = useState(defaultUniversity || "");
  const [note, setNote] = useState("");

  async function searchExternalBooks() {
    const query = externalQuery.trim() || title.trim();

    if (query.length < 2) {
      setExternalError("Kitap adı, yazar veya ISBN girerek arama yap.");
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

      const books = (payload.books || []) as ExternalBook[];
      setExternalResults(books);

      if (books.length === 0) {
        setExternalError("İnternette uygun kitap bilgisi bulunamadı.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "İnternetten kitap bilgisi alınamadı.";

      setExternalError(message);
    } finally {
      setIsSearchingExternal(false);
    }
  }

  function selectExternalBook(book: ExternalBook) {
    setSelectedExternalBook(book);

    setTitle(book.title || "");
    setAuthor(book.author || "");
    setCategory(book.category || "");

    const detailLines = [
      book.isbn ? `ISBN: ${book.isbn}` : "",
      book.publisher ? `Yayınevi: ${book.publisher}` : "",
      book.published_year ? `Yayın yılı: ${book.published_year}` : "",
      book.description ? `Açıklama: ${book.description}` : "",
    ].filter(Boolean);

    setNote((currentNote) => {
      if (currentNote.trim()) return currentNote;
      return detailLines.join("\n");
    });
  }

  function clearSelectedExternalBook() {
    setSelectedExternalBook(null);
    setExternalResults([]);
    setExternalError("");
  }

  return (
    <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
          Yeni Arama
        </p>

        <h2 className="mt-2 text-2xl font-black md:text-3xl">
          Aradığın kitabı sisteme ekle
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Kitap uygulamada yoksa internetten bilgisini çekebilir, formu otomatik
          doldurup arama kaydı oluşturabilirsin.
        </p>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4 md:p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="text-sm font-bold text-slate-700">
              İnternetten kitap ara
            </label>

            <input
              value={externalQuery}
              onChange={(event) => setExternalQuery(event.target.value)}
              placeholder="Kitap adı, yazar veya ISBN yaz..."
              className="mt-2 w-full rounded-2xl border border-[#F59E0B]/20 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#F59E0B]"
            />

            <p className="mt-2 text-xs font-semibold text-slate-500">
              Google Books ve Open Library üzerinden kitap bilgisi çekilir.
            </p>
          </div>

          <button
            type="button"
            onClick={searchExternalBooks}
            disabled={isSearchingExternal}
            className="rounded-full bg-[#F59E0B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSearchingExternal ? "Aranıyor..." : "İnternetten Ara"}
          </button>
        </div>

        {externalError && (
          <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-red-600">
            {externalError}
          </div>
        )}

        {selectedExternalBook && (
          <div className="mt-4 rounded-2xl border border-[#2E7D5B]/20 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#2E7D5B]">
                  İnternetten seçildi
                </p>

                <p className="mt-1 text-sm font-bold text-[#1F2933]">
                  {selectedExternalBook.title} — {selectedExternalBook.author}
                </p>
              </div>

              <button
                type="button"
                onClick={clearSelectedExternalBook}
                className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600 transition hover:-translate-y-0.5"
              >
                Seçimi kaldır
              </button>
            </div>
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
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FAF7F0] text-xl shadow-sm">
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
                    <p className="line-clamp-2 text-sm font-black text-[#1F2933]">
                      {book.title}
                    </p>

                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                      {book.author}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                      <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-[#B45309]">
                        {book.source === "google_books"
                          ? "Google Books"
                          : "Open Library"}
                      </span>

                      {book.category && (
                        <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-slate-500">
                          {book.category}
                        </span>
                      )}

                      {book.published_year && (
                        <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-slate-500">
                          {book.published_year}
                        </span>
                      )}

                      {book.isbn && (
                        <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-slate-500">
                          ISBN
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

      <form
        action={createBookRequestAction}
        className="mt-5 space-y-4 md:mt-7 md:space-y-5"
      >
        <div>
          <label className="text-sm font-bold text-slate-700">Kitap Adı</label>

          <input
            required
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Kürk Mantolu Madonna"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700">Yazar</label>

            <input
              name="author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Sabahattin Ali"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">Kategori</label>

            <input
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Roman, ders kitabı..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700">Şehir</label>

            <input
              name="city"
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
              name="university"
              value={university}
              onChange={(event) => setUniversity(event.target.value)}
              placeholder="Aydın Adnan Menderes Üniversitesi"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">Not</label>

          <textarea
            name="note"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Bu kitabı sınav dönemi için arıyorum, ödünç de olabilir..."
            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
        >
          Aradığım Kitaplara Ekle
        </button>
      </form>
    </section>
  );
}