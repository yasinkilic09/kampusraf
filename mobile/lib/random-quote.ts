export type RandomQuoteRow = {
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

export type FavoriteQuoteRow = {
  id: string;
  quote_id: string;
  created_at: string;
};

export type QuoteBookRow = {
  title: string | null;
  author: string | null;
  source_name: string | null;
  source_url: string | null;
};

export type QuoteItemRow = {
  id: string;
  quote_text: string;
  quote_text_tr: string | null;
  original_language: string | null;
  mood: string | null;
  topic: string | null;
  estimated_read_seconds: number | null;
  quote_books: QuoteBookRow | QuoteBookRow[] | null;
};

export function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export function getDailyRollLimit(planType?: string | null) {
  if (planType === "plus") return 3;
  if (planType === "premium") return 10;
  if (planType === "pro") return 25;
  return 2;
}

export function getQuoteDisplayText(quote: {
  quote_text: string;
  quote_text_tr: string | null;
}) {
  return quote.quote_text_tr || quote.quote_text;
}

export function getQuoteShareText(quote: {
  quote_text: string;
  quote_text_tr: string | null;
  book_title: string;
  book_author: string | null;
}) {
  const displayQuote = getQuoteDisplayText(quote);
  const authorText = quote.book_author ? `${quote.book_title} - ${quote.book_author}` : quote.book_title;

  return `"${displayQuote}"\n\n${authorText}\n\nKampusRaf · Rastgele Raf`;
}

export function getFriendlyRollError(message?: string) {
  if (!message) return "Rastgele alinti getirilemedi.";
  if (message.includes("DAILY_LIMIT_REACHED")) {
    return "Bugunku Rastgele Raf hakkini kullandin. Yarin tekrar zar atabilirsin.";
  }
  if (message.includes("NO_QUOTES_AVAILABLE")) {
    return "Su anda gosterilecek aktif alinti bulunamadi.";
  }
  if (message.includes("AUTH_REQUIRED")) {
    return "Bu ozelligi kullanmak icin giris yapmalisin.";
  }
  return message;
}
