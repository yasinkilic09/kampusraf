"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addQuoteFavoriteAction,
  removeQuoteFavoriteAction,
  rollRandomQuoteAction,
} from "@/app/actions/random-quote";

type Quote = {
  roll_id: string;
  quote_id: string;
  quote_text: string;
  quote_text_tr: string | null;
  original_language: string;
  book_title: string;
  book_author: string | null;
  mood: string | null;
  topic: string | null;
  estimated_read_seconds: number;
  source_name: string | null;
  source_url: string | null;
  rolls_used: number;
  rolls_limit: number;
};

type RandomQuoteClientProps = {
  initialRollsUsed: number;
  initialRollsLimit: number;
  planType: string;
};

export function RandomQuoteClient({
  initialRollsUsed,
  initialRollsLimit,
  planType,
}: RandomQuoteClientProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [rollsUsed, setRollsUsed] = useState(initialRollsUsed);
  const [rollsLimit, setRollsLimit] = useState(initialRollsLimit);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [favoriteQuoteIds, setFavoriteQuoteIds] = useState<Set<string>>(
    () => new Set()
  );
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isRollPending, startRollTransition] = useTransition();
  const [isFavoritePending, startFavoriteTransition] = useTransition();

  const remainingRolls = Math.max(rollsLimit - rollsUsed, 0);
  const canRoll = remainingRolls > 0 && !isRollPending;

  const isCurrentQuoteFavorited = quote
    ? favoriteQuoteIds.has(quote.quote_id)
    : false;

  const progressPercent = useMemo(() => {
    if (rollsLimit <= 0) return 0;
    return Math.min((rollsUsed / rollsLimit) * 100, 100);
  }, [rollsLimit, rollsUsed]);

  function handleRoll() {
    if (!canRoll) return;

    setMessage("");
    setMessageType("");

    startRollTransition(async () => {
      const result = await rollRandomQuoteAction();

      if (!result.ok || !result.quote) {
        setMessage(result.message);
        setMessageType("error");
        return;
      }

      setQuote(result.quote);
      setRollsUsed(result.quote.rolls_used);
      setRollsLimit(result.quote.rolls_limit);
      setMessage(result.message);
      setMessageType("success");
    });
  }

  function handleSpeak() {
    if (!quote) return;

    if (!("speechSynthesis" in window)) {
      setMessage("Tarayıcın sesli okuma özelliğini desteklemiyor.");
      setMessageType("error");
      return;
    }

    window.speechSynthesis.cancel();

    const textToRead = quote.quote_text_tr || quote.quote_text;

    const text = `${textToRead} ${quote.book_title}${
      quote.book_author ? `, ${quote.book_author}` : ""
    }`;

    const utterance = new SpeechSynthesisUtterance(text);
    const shouldReadTurkish =
      Boolean(quote.quote_text_tr) || quote.original_language === "tr";

    utterance.lang = shouldReadTurkish ? "tr-TR" : "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  function handleStopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }

  function getQuoteShareText(currentQuote: Quote) {
    const quoteText = currentQuote.quote_text_tr || currentQuote.quote_text;
    const authorText = currentQuote.book_author
      ? `${currentQuote.book_title} — ${currentQuote.book_author}`
      : currentQuote.book_title;

    return `“${quoteText}”

${authorText}

KampüsRaf · Rastgele Raf`;
  }

  async function handleCopyQuote() {
    if (!quote) return;

    try {
      await navigator.clipboard.writeText(getQuoteShareText(quote));
      setMessage("Alıntı panoya kopyalandı.");
      setMessageType("success");
    } catch {
      setMessage("Kopyalama işlemi başarısız oldu.");
      setMessageType("error");
    }
  }

  async function handleShareQuote() {
    if (!quote) return;

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
          title: "KampüsRaf Rastgele Raf",
          text: getQuoteShareText(quote),
        });

        setMessage("Paylaşım penceresi açıldı.");
        setMessageType("success");
        return;
      }

      await handleCopyQuote();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage("Paylaşım işlemi başarısız oldu.");
      setMessageType("error");
    }
  }

  function handleFavoriteToggle() {
    if (!quote || isFavoriteLoading || isFavoritePending) return;

    const quoteId = quote.quote_id;
    const shouldRemove = favoriteQuoteIds.has(quoteId);

    setIsFavoriteLoading(true);
    setMessage("");
    setMessageType("");

    startFavoriteTransition(async () => {
      try {
        const result = shouldRemove
          ? await removeQuoteFavoriteAction(quoteId)
          : await addQuoteFavoriteAction(quoteId);

        if (!result.ok) {
          setMessage(result.message);
          setMessageType("error");
          return;
        }

        setFavoriteQuoteIds((previous) => {
          const next = new Set(previous);

          if (shouldRemove) {
            next.delete(quoteId);
          } else {
            next.add(quoteId);
          }

          return next;
        });

        setMessage(result.message);
        setMessageType("success");
      } catch {
        setMessage("Favori işlemi sırasında bir sorun oluştu.");
        setMessageType("error");
      } finally {
        setIsFavoriteLoading(false);
      }
    });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Rastgele Raf
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Zar at, kısa bir kitap keşfi gelsin.
            </h2>

            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500 md:text-base">
              Günlük hakkın kadar rastgele alıntı keşfedebilirsin. Alıntıyı
              okuyabilir, sesli dinleyebilir veya favorilerine kaydedebilirsin.
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-[#FAF7F0] p-4 text-center md:min-w-[160px]">
            <p className="text-3xl font-black text-[#2E7D5B]">
              {remainingRolls}
            </p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.15em] text-slate-400">
              Kalan Zar
            </p>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-full bg-[#FAF7F0]">
          <div
            className="h-3 rounded-full bg-[#2E7D5B] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
          <span>
            Bugün kullanılan: {rollsUsed}/{rollsLimit}
          </span>
          <span className="rounded-full bg-[#2E7D5B]/10 px-3 py-1 text-[#2E7D5B]">
            Paket: {planType.toUpperCase()}
          </span>
        </div>

        <div className="mt-8">
          {quote ? (
            <article className="relative overflow-hidden rounded-[2rem] bg-[#2E7D5B] p-6 text-white shadow-xl shadow-[#2E7D5B]/15 md:p-8">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-10 left-10 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-2xl" />

              <div className="relative">
                <div className="flex flex-wrap gap-2">
                  {quote.mood && (
                    <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                      {quote.mood}
                    </span>
                  )}

                  {quote.topic && (
                    <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black">
                      {quote.topic}
                    </span>
                  )}

                  <span className="rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-black text-white">
                    ~{quote.estimated_read_seconds} sn
                  </span>

                  {isCurrentQuoteFavorited && (
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#B45309]">
                      ⭐ Favoride
                    </span>
                  )}
                </div>

                <p className="mt-8 text-2xl font-black leading-relaxed tracking-tight md:text-4xl">
                  “{quote.quote_text}”
                </p>

                {quote.original_language !== "tr" && quote.quote_text_tr && (
                  <div className="mt-5 rounded-[1.5rem] bg-white/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F5EBDD]">
                      Türkçe Çeviri
                    </p>
                    <p className="mt-2 text-lg font-bold leading-8 text-white/85 md:text-xl">
                      “{quote.quote_text_tr}”
                    </p>
                  </div>
                )}

                <div className="mt-7 rounded-[1.5rem] bg-white/10 p-4">
                  <p className="text-sm font-black">{quote.book_title}</p>
                  <p className="mt-1 text-sm font-semibold text-white/65">
                    {quote.book_author || "Yazar bilgisi yok"}
                  </p>
                  {quote.source_name && (
                    <p className="mt-2 text-xs font-semibold text-white/45">
                      Kaynak: {quote.source_name}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleSpeak}
                    disabled={isSpeaking}
                    className="rounded-full bg-white px-6 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSpeaking ? "Okunuyor..." : "🔊 Dinle"}
                  </button>

                  <button
                    type="button"
                    onClick={handleFavoriteToggle}
                    disabled={isFavoriteLoading || isFavoritePending}
                    className="rounded-full bg-[#F59E0B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isFavoriteLoading || isFavoritePending
                      ? "Kaydediliyor..."
                      : isCurrentQuoteFavorited
                        ? "⭐ Favoriden Çıkar"
                        : "⭐ Favorilere Ekle"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyQuote}
                    className="rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    📋 Kopyala
                  </button>

                  <button
                    type="button"
                    onClick={handleShareQuote}
                    className="rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    📤 Paylaş
                  </button>

                  {isSpeaking && (
                    <button
                      type="button"
                      onClick={handleStopSpeaking}
                      className="rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                    >
                      Durdur
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRoll}
                    disabled={!canRoll}
                    className="rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    🎲 Yeni Zar At
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[#2E7D5B]/25 bg-[#FAF7F0] p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-white text-4xl shadow-sm">
                🎲
              </div>

              <h3 className="mt-5 text-2xl font-black text-[#1F2933]">
                Bugünün ilk zarını at
              </h3>

              <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-slate-500">
                Rastgele Raf sana kısa bir alıntı getirsin. İstersen sonra
                sesli dinleyebilir, kopyalayabilir veya favorilerine
                kaydedebilirsin.
              </p>

              <button
                type="button"
                onClick={handleRoll}
                disabled={!canRoll}
                className="mt-6 rounded-full bg-[#2E7D5B] px-8 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRollPending ? "Zar atılıyor..." : "🎲 Zar At"}
              </button>
            </div>
          )}
        </div>

        {message && (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
              messageType === "error"
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-[#2E7D5B]/10 bg-[#2E7D5B]/10 text-[#2E7D5B]"
            }`}
          >
            {message}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
            Günlük Limit
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-[#FAF7F0] p-4">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Free
              </p>
              <p className="mt-1 text-xl font-black">2 zar / gün</p>
            </div>

            <div className="rounded-2xl bg-[#FAF7F0] p-4">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Plus
              </p>
              <p className="mt-1 text-xl font-black">3 zar / gün</p>
            </div>

            <div className="rounded-2xl bg-[#FAF7F0] p-4">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Premium
              </p>
              <p className="mt-1 text-xl font-black">10 zar / gün</p>
            </div>

            <div className="rounded-2xl bg-[#FAF7F0] p-4">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                Pro
              </p>
              <p className="mt-1 text-xl font-black">25 zar / gün</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-[#2E7D5B] p-5 text-white shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
            Sesli Keşif
          </p>

          <h3 className="mt-3 text-2xl font-black">10-15 saniyelik okuma</h3>

          <p className="mt-3 text-sm font-semibold leading-7 text-white/70">
            Alıntıları tarayıcının sesli okuma özelliğiyle dinleyebilirsin.
            Sonraki aşamada daha kaliteli sesli klip üretimi eklenebilir.
          </p>
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
            Favoriler
          </p>

          <h3 className="mt-3 text-2xl font-black">Alıntılarını sakla</h3>

          <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
            Beğendiğin alıntıları favorilerine ekleyebilir, daha sonra Favori
            Alıntılarım sayfasında tekrar görebilirsin.
          </p>

          <a
  href="/favori-alintilarim"
  className="mt-5 inline-flex rounded-full bg-[#F59E0B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
>
  ⭐ Favori Alıntılarım
</a>
        </section>
      </aside>
    </section>
  );
}