"use client";

import { useState, useTransition } from "react";
import { removeQuoteFavoriteAction } from "@/app/actions/random-quote";
import { createQuoteSocialPostAction } from "@/app/actions/social-posts";

type FavoriteQuoteCardProps = {
  quoteId: string;
  quoteText: string;
  quoteTextTr: string | null;
  originalLanguage: string;
  bookTitle: string;
  bookAuthor: string | null;
  mood: string | null;
  topic: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function FavoriteQuoteCard({
  quoteId,
  quoteText,
  quoteTextTr,
  originalLanguage,
  bookTitle,
  bookAuthor,
  mood,
  topic,
  sourceName,
  sourceUrl,
  createdAt,
}: FavoriteQuoteCardProps) {
  const [isRemoved, setIsRemoved] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [isPending, startTransition] = useTransition();

  if (isRemoved) {
    return null;
  }

  const displayQuote = quoteTextTr || quoteText;

  function getShareText() {
    const authorText = bookAuthor ? `${bookTitle} — ${bookAuthor}` : bookTitle;

    return `“${displayQuote}”

${authorText}

KampüsRaf · Favori Alıntılarım`;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getShareText());
      setMessage("Alıntı panoya kopyalandı.");
      setMessageType("success");
    } catch {
      setMessage("Kopyalama işlemi başarısız oldu.");
      setMessageType("error");
    }
  }

  async function handleShare() {
    const shareNavigator = navigator as Navigator & {
      share?: (data: {
        title?: string;
        text?: string;
        url?: string;
      }) => Promise<void>;
    };

    try {
      if (shareNavigator.share) {
        await shareNavigator.share({
          title: "KampüsRaf Favori Alıntı",
          text: getShareText(),
        });

        setMessage("Paylaşım penceresi açıldı.");
        setMessageType("success");
        return;
      }

      await handleCopy();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage("Paylaşım işlemi başarısız oldu.");
      setMessageType("error");
    }
  }

  function handleRemove() {
    if (isPending) return;

    setMessage("");
    setMessageType("");

    startTransition(async () => {
      const result = await removeQuoteFavoriteAction(quoteId);

      if (!result.ok) {
        setMessage(result.message);
        setMessageType("error");
        return;
      }

      setMessage(result.message);
      setMessageType("success");
      setIsRemoved(true);
    });
  }

  return (
    <article className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5">
      <div className="bg-[#2E7D5B] p-5 text-white md:p-6">
        <div className="flex flex-wrap gap-2">
          {mood && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black">
              {mood}
            </span>
          )}

          {topic && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black">
              {topic}
            </span>
          )}

          <span className="rounded-full bg-[#F59E0B] px-3 py-1 text-[11px] font-black text-white">
            ⭐ Favori
          </span>

          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black">
            {formatDate(createdAt)}
          </span>
        </div>

        <p className="mt-5 text-xl font-black leading-relaxed md:text-2xl">
          “{quoteText}”
        </p>

        {originalLanguage !== "tr" && quoteTextTr && (
          <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F5EBDD]">
              Türkçe Çeviri
            </p>
            <p className="mt-2 text-base font-bold leading-7 text-white/85">
              “{quoteTextTr}”
            </p>
          </div>
        )}
      </div>

      <div className="p-5 md:p-6">
        <div className="rounded-[1.5rem] bg-[#FAF7F0] p-4">
          <p className="text-sm font-black text-[#1F2933]">{bookTitle}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {bookAuthor || "Yazar bilgisi yok"}
          </p>

          {sourceName && (
            <p className="mt-2 text-xs font-bold text-slate-400">
              Kaynak: {sourceName}
            </p>
          )}

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
            >
              Kaynağı Aç
            </a>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full bg-[#2E7D5B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            📋 Kopyala
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
          >
            📤 Paylaş
          </button>

          <form action={createQuoteSocialPostAction}>
  <input type="hidden" name="quoteId" value={quoteId} />
  <input type="hidden" name="visibility" value="public" />
  <input type="hidden" name="redirectTo" value="/favori-alintilarim" />

  <button
    type="submit"
    className="rounded-full bg-[#F59E0B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
  >
    🌐 Akışta Paylaş
  </button>
</form>

          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="rounded-full border border-red-100 px-5 py-3 text-sm font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Kaldırılıyor..." : "Favoriden Kaldır"}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
              messageType === "error"
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-[#2E7D5B]/10 bg-[#2E7D5B]/10 text-[#2E7D5B]"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </article>
  );
}