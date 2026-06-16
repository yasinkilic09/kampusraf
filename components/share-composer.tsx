"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { createSocialPostAction } from "@/app/actions/social-posts";

export type ShareComposerBook = {
  id: string;
  custom_title: string | null;
  custom_author: string | null;
  books:
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }[]
    | null;
};

type ShareComposerProps = {
  userBooks: ShareComposerBook[];
};

type BookOption = {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
};

const captionLimit = 600;

const captionIdeas = [
  "Bugün raftan seçtim. Okuyan varsa yorumunu merak ediyorum.",
  "Bu kitabı takasa açabilirim. İlgilenenler mesaj atabilir.",
  "Kampüste okuma molası. Bu sayfaya denk gelmek iyi geldi.",
  "Bu kitabı öneririm. Özellikle benzer türleri sevenler sevebilir.",
];

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {pending ? "Paylaşım hazırlanıyor..." : "Paylaşımı Yayınla"}
    </button>
  );
}

export function ShareComposer({ userBooks }: ShareComposerProps) {
  const [caption, setCaption] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageSize, setImageSize] = useState("");

  const bookOptions = useMemo<BookOption[]>(
    () =>
      userBooks
        .map((item) => {
          const book = first(item.books);

          if (!book?.id) return null;

          return {
            id: book.id,
            title: item.custom_title || book.title || "Kitap",
            author: item.custom_author || book.author || "Yazar belirtilmemiş",
            coverUrl: book.cover_url,
          };
        })
        .filter((book): book is BookOption => Boolean(book)),
    [userBooks]
  );

  const selectedBook = bookOptions.find((book) => book.id === selectedBookId);
  const captionRemaining = captionLimit - caption.length;

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setImagePreviewUrl(null);
      setImageName("");
      setImageSize("");
      return;
    }

    setImagePreviewUrl(URL.createObjectURL(file));
    setImageName(file.name);
    setImageSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
  }

  function appendIdea(idea: string) {
    setCaption((current) => {
      const next = current ? `${current}\n${idea}` : idea;
      return next.slice(0, captionLimit);
    });
  }

  return (
    <form
      action={createSocialPostAction}
      className="grid gap-6 rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-7 lg:grid-cols-[0.95fr_1.05fr]"
    >
      <section className="rounded-[1.6rem] bg-[#FAF7F0] p-5 md:rounded-[1.8rem]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
              Görsel
            </p>
            <h2 className="mt-2 text-2xl font-black">Fotoğraf Seç</h2>
          </div>

          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
            Max 10 MB
          </span>
        </div>

        <label className="mt-5 flex min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border-2 border-dashed border-[#2E7D5B]/25 bg-white p-4 text-center transition hover:border-[#2E7D5B]/50 hover:bg-[#2E7D5B]/5">
          {imagePreviewUrl ? (
            <div className="relative h-full min-h-72 w-full overflow-hidden rounded-[1.25rem] bg-[#FAF7F0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Seçilen paylaşım görseli"
                className="h-full min-h-72 w-full object-contain"
              />
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/95 p-3 text-left shadow-lg backdrop-blur">
                <p className="line-clamp-1 text-xs font-black text-[#1F2933]">
                  {imageName}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  {imageSize} seçildi. Değiştirmek için yeniden tıkla.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
                +
              </div>

              <p className="mt-4 text-sm font-black text-[#1F2933]">
                Paylaşım görselini yükle
              </p>

              <p className="mt-2 max-w-xs text-xs font-semibold leading-5 text-slate-500">
                JPG, PNG veya WEBP yükleyebilirsin. Dikey fotoğraflar akışta
                daha iyi görünür.
              </p>
            </>
          )}

          <input
            type="file"
            name="image"
            required
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="mt-5 w-full max-w-sm rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-[#2E7D5B] file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
          />
        </label>

        <div className="mt-5 rounded-[1.4rem] bg-white p-4">
          <p className="text-sm font-black text-[#1F2933]">Paylaşım fikri</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
            Hazır fikirleri açıklamaya ekleyebilir, sonra kendi diline göre
            düzenleyebilirsin.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {captionIdeas.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => appendIdea(idea)}
                className="rounded-full bg-[#FAF7F0] px-3 py-2 text-left text-[11px] font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/10"
              >
                {idea.split(".")[0]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-black text-[#1F2933]">
              Açıklama
            </label>
            <span
              className={`text-xs font-black ${
                captionRemaining < 60 ? "text-[#B45309]" : "text-slate-400"
              }`}
            >
              {captionRemaining} karakter
            </span>
          </div>

          <textarea
            name="caption"
            rows={7}
            maxLength={captionLimit}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Paylaşımına kısa ve doğal bir açıklama yaz..."
            className="mt-3 w-full resize-none rounded-[1.4rem] border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
          />
        </div>

        <div>
          <label className="text-sm font-black text-[#1F2933]">
            Kitap Etiketi
          </label>

          <select
            name="relatedBookId"
            value={selectedBookId}
            onChange={(event) => setSelectedBookId(event.target.value)}
            className="mt-3 w-full rounded-[1.4rem] border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
          >
            <option value="">Kitap etiketi ekleme</option>

            {bookOptions.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} - {book.author}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
            Şu an rafından {bookOptions.length} kitap seçilebilir.
          </p>
        </div>

        {selectedBook && (
          <div className="flex items-center gap-3 rounded-[1.4rem] bg-[#FAF7F0] p-3">
            <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-sm font-black text-[#2E7D5B]">
              {selectedBook.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedBook.coverUrl}
                  alt={selectedBook.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                "KR"
              )}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-black text-[#1F2933]">
                {selectedBook.title}
              </p>
              <p className="line-clamp-1 text-xs font-semibold text-slate-500">
                {selectedBook.author}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-black text-[#1F2933]">
            Görünürlük
          </label>

          <select
            name="visibility"
            defaultValue="friends"
            className="mt-3 w-full rounded-[1.4rem] border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
          >
            <option value="friends">Sadece arkadaşlarım</option>
            <option value="public">Herkese açık</option>
          </select>
        </div>

        <div className="rounded-[1.5rem] bg-[#FAF7F0] p-4">
          <p className="text-sm font-black text-[#1F2933]">
            Paylaşım nerede görünecek?
          </p>
          <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500">
            <p>Akış sayfasında</p>
            <p>Sosyal profilinde</p>
            <p>Kitap etiketi seçtiysen kitap keşfinde</p>
          </div>
        </div>

        <SubmitButton />
      </section>
    </form>
  );
}
