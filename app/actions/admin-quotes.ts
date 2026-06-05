"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type GutendexAuthor = {
  name?: string;
};

type GutendexBook = {
  id: number;
  title: string;
  authors?: GutendexAuthor[];
  languages?: string[];
  copyright?: boolean | null;
  formats?: Record<string, string>;
};

type GutendexResponse = {
  results?: GutendexBook[];
};

type TranslationResponse = {
  responseData?: {
    translatedText?: string;
  };
};

type MediaWikiSearchItem = {
  pageid: number;
  title: string;
};

type MediaWikiSearchResponse = {
  query?: {
    search?: MediaWikiSearchItem[];
  };
};

type MediaWikiParseResponse = {
  parse?: {
    title?: string;
    pageid?: number;
    text?: {
      "*": string;
    };
  };
};

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return { supabase, user };
}

function getPlainTextUrl(formats?: Record<string, string>) {
  if (!formats) return null;

  const entries = Object.entries(formats);

  const preferred =
    entries.find(([mimeType, url]) => {
      return (
        mimeType.toLowerCase().includes("text/plain") &&
        mimeType.toLowerCase().includes("utf-8") &&
        Boolean(url)
      );
    }) ||
    entries.find(([mimeType, url]) => {
      return mimeType.toLowerCase().includes("text/plain") && Boolean(url);
    });

  if (!preferred?.[1]) return null;

  return preferred[1].replace(/^http:\/\//, "https://");
}

function decodeBasicHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);

      if (Number.isNaN(parsed)) return "";

      return String.fromCharCode(parsed);
    });
}

function cleanGutenbergText(text: string) {
  let cleaned = text.replace(/\r/g, "");

  const startIndex = cleaned.search(
    /\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i
  );

  if (startIndex >= 0) {
    const startMatch = cleaned
      .slice(startIndex)
      .match(/\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i);

    if (startMatch) {
      cleaned = cleaned.slice(startIndex + startMatch[0].length);
    }
  }

  const endIndex = cleaned.search(
    /\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i
  );

  if (endIndex >= 0) {
    cleaned = cleaned.slice(0, endIndex);
  }

  return cleaned
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeQuoteText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^["“”'‘’\s]+/, "")
    .replace(/["“”'‘’\s]+$/, "")
    .trim();
}

function looksLikeBadQuote(value: string) {
  const text = value.trim();

  if (!text) return true;
  if (text.length < 60 || text.length > 340) return true;
  if (text.split(" ").length < 8) return true;

  if (/project gutenberg/i.test(text)) return true;
  if (/chapter|contents|illustration|footnote|transcriber/i.test(text)) {
    return true;
  }
  if (/produced by|distributed proofreaders|ebook|license/i.test(text)) {
    return true;
  }
  if (/https?:\/\//i.test(text)) return true;
  if (/www\./i.test(text)) return true;
  if ((text.match(/\d/g) || []).length > 12) return true;

  const letterCount = (
    text.match(/[a-zA-ZğüşöçıİĞÜŞÖÇâîûÂÎÛ]/g) || []
  ).length;

  if (letterCount < 40) return true;

  return false;
}

function extractSentences(text: string) {
  const sentenceMatches = text.match(/[^.!?…]+[.!?…]+/g);

  if (!sentenceMatches) return [];

  return sentenceMatches.map(normalizeQuoteText).filter(Boolean);
}

function extractQuoteCandidates(rawText: string, maxQuotes: number) {
  const cleaned = cleanGutenbergText(rawText);

  const paragraphCandidates = cleaned
    .split(/\n\s*\n/g)
    .map((paragraph) => normalizeQuoteText(paragraph.replace(/\n/g, " ")))
    .filter((paragraph) => !looksLikeBadQuote(paragraph));

  const sentenceCandidates = extractSentences(cleaned)
    .map(normalizeQuoteText)
    .filter((sentence) => !looksLikeBadQuote(sentence));

  const combinedSentenceCandidates: string[] = [];

  for (let index = 0; index < sentenceCandidates.length - 1; index += 1) {
    const first = sentenceCandidates[index];
    const second = sentenceCandidates[index + 1];
    const combined = normalizeQuoteText(`${first} ${second}`);

    if (!looksLikeBadQuote(combined)) {
      combinedSentenceCandidates.push(combined);
    }
  }

  const allCandidates = [
    ...paragraphCandidates,
    ...combinedSentenceCandidates,
    ...sentenceCandidates,
  ];

  const unique = new Set<string>();
  const candidates: string[] = [];

  for (const candidate of allCandidates) {
    const normalized = normalizeQuoteText(candidate);
    const key = normalized.toLowerCase();

    if (unique.has(key)) continue;
    if (looksLikeBadQuote(normalized)) continue;

    unique.add(key);
    candidates.push(normalized);

    if (candidates.length >= maxQuotes) break;
  }

  return candidates;
}

function getReadSeconds(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return Math.min(Math.max(Math.round(wordCount / 2.4), 8), 20);
}

async function translateTextToTurkish(text: string) {
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", "en|tr");

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as TranslationResponse;
    const translatedText = payload.responseData?.translatedText?.trim();

    if (!translatedText) return null;
    if (translatedText.toLowerCase() === text.toLowerCase()) return null;

    return decodeBasicHtmlEntities(translatedText);
  } catch {
    return null;
  }
}

function getWikisourcePageUrl(title: string) {
  return `https://tr.wikisource.org/wiki/${encodeURIComponent(
    title.replace(/ /g, "_")
  )}`;
}

function stripMediaWikiHtml(html: string) {
  return decodeBasicHtmlEntities(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<sup[\s\S]*?<\/sup>/gi, " ")
    .replace(/<table[\s\S]*?<\/table>/gi, " ")
    .replace(/<h[1-6][^>]*>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\s*düzenle\s*\]/gi, " ")
    .replace(/\[\d+\]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksLikeTurkishSourceNoise(text: string) {
  const lowered = text.toLowerCase();

  return (
    lowered.includes("vikikaynak") ||
    lowered.includes("wikisource") ||
    lowered.includes("creative commons") ||
    lowered.includes("telif") ||
    lowered.includes("lisans") ||
    lowered.includes("kategori:") ||
    lowered.includes("dosya:") ||
    lowered.includes("yardım:") ||
    lowered.includes("içindekiler") ||
    lowered.includes("kaynakça") ||
    lowered.includes("dış bağlantılar") ||
    lowered.includes("bu sayfa son olarak")
  );
}

function getTurkishQuoteScore(text: string) {
  let score = 0;

  const wordCount = text.split(" ").filter(Boolean).length;
  const hasTurkishChar = /[ğüşöçıİĞÜŞÖÇ]/.test(text);
  const hasStrongEnding = /[.!?…]$/.test(text);
  const hasMeaningfulWords =
    /(insan|gönül|kitap|ilim|aşk|dost|hayat|vatan|millet|hürriyet|hakikat|zaman|dünya|kalp|ruh|akıl|emek|umut|sevgi|yol|söz|fikir|medeniyet|irfan|adalet|özgürlük|tarih|gençlik|çocuk|mektep|maarif)/i.test(
      text
    );

  if (wordCount >= 10 && wordCount <= 42) score += 3;
  if (text.length >= 80 && text.length <= 260) score += 3;
  if (hasTurkishChar) score += 2;
  if (hasStrongEnding) score += 2;
  if (hasMeaningfulWords) score += 3;

  if (text.includes(";")) score += 1;
  if (text.includes(":")) score -= 1;
  if (/^[A-ZĞÜŞİÖÇ\s]+$/.test(text)) score -= 3;
  if ((text.match(/,/g) || []).length > 5) score -= 2;
  if ((text.match(/-/g) || []).length > 4) score -= 2;
  if (/\b(sayfa|madde|bölüm|fasıl|cilt|dipnot)\b/i.test(text)) score -= 4;

  return score;
}

function getTurkishTopic(text: string) {
  const lowered = text.toLowerCase();

  if (/aşk|gönül|kalp|sevgi|dost/.test(lowered)) return "duygu";
  if (/vatan|millet|hürriyet|özgürlük|istiklal/.test(lowered)) return "vatan";
  if (/ilim|irfan|akıl|fikir|hakikat|maarif|mektep/.test(lowered)) {
    return "düşünce";
  }
  if (/çocuk|gençlik|aile|anne|baba/.test(lowered)) return "hayat";
  if (/zaman|dünya|ömür|ölüm|ruh/.test(lowered)) return "felsefe";

  return "türkçe";
}

function extractTurkishQuoteCandidates(rawText: string, maxQuotes: number) {
  const cleaned = rawText
    .replace(/\r/g, "")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphCandidates = cleaned
    .split(/\n\s*\n/g)
    .map((paragraph) => normalizeQuoteText(paragraph.replace(/\n/g, " ")))
    .filter((paragraph) => {
      if (looksLikeBadQuote(paragraph)) return false;
      if (looksLikeTurkishSourceNoise(paragraph)) return false;

      return true;
    });

  const sentenceCandidates = extractSentences(cleaned)
    .map(normalizeQuoteText)
    .filter((sentence) => {
      if (looksLikeBadQuote(sentence)) return false;
      if (looksLikeTurkishSourceNoise(sentence)) return false;

      return true;
    });

  const combinedSentenceCandidates: string[] = [];

  for (let index = 0; index < sentenceCandidates.length - 1; index += 1) {
    const first = sentenceCandidates[index];
    const second = sentenceCandidates[index + 1];
    const combined = normalizeQuoteText(`${first} ${second}`);

    if (looksLikeBadQuote(combined)) continue;
    if (looksLikeTurkishSourceNoise(combined)) continue;

    combinedSentenceCandidates.push(combined);
  }

  const allCandidates = [
    ...paragraphCandidates,
    ...combinedSentenceCandidates,
    ...sentenceCandidates,
  ];

  const unique = new Set<string>();

  const scoredCandidates = allCandidates
    .map((candidate) => normalizeQuoteText(candidate))
    .filter((candidate) => {
      const key = candidate.toLowerCase();

      if (unique.has(key)) return false;
      if (looksLikeBadQuote(candidate)) return false;
      if (looksLikeTurkishSourceNoise(candidate)) return false;

      unique.add(key);

      return true;
    })
    .map((candidate) => ({
      text: candidate,
      score: getTurkishQuoteScore(candidate),
    }))
    .filter((candidate) => candidate.score >= 4)
    .sort((a, b) => b.score - a.score);

  return scoredCandidates.slice(0, maxQuotes).map((candidate) => candidate.text);
}

function buildTurkishSearchQueries(search: string) {
  const cleanSearch = search.trim();

  const baseQueries = [
    cleanSearch,
    `"${cleanSearch}"`,
    `${cleanSearch} şiir`,
    `${cleanSearch} hikaye`,
    `${cleanSearch} eserleri`,
    `${cleanSearch} divan`,
    `${cleanSearch} nutuk`,
    `${cleanSearch} mektup`,
  ];

  const curatedFallbackQueries = [
    "Yunus Emre",
    "Dede Korkut",
    "Namık Kemal",
    "Ziya Paşa",
    "Şinasi",
    "Tevfik Fikret",
    "Mehmet Akif",
    "Ömer Seyfettin",
    "Ahmet Mithat",
    "Evliya Çelebi",
    "Karacaoğlan",
    "Pir Sultan Abdal",
    "Fuzuli",
    "Baki",
    "Nedim",
  ];

  const queries = cleanSearch
    ? [...baseQueries, ...curatedFallbackQueries]
    : curatedFallbackQueries;

  return Array.from(
    new Set(
      queries
        .map((query) => query.trim())
        .filter(Boolean)
    )
  );
}

async function fetchTurkishWikisourceSearch(search: string, limit: number) {
  const queries = buildTurkishSearchQueries(search);
  const pageMap = new Map<number, MediaWikiSearchItem>();

  for (const query of queries) {
    const url = new URL("https://tr.wikisource.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    url.searchParams.set("srsearch", query);
    url.searchParams.set("srnamespace", "0");
    url.searchParams.set("srlimit", String(Math.max(limit, 5)));
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    try {
      const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: {
          "User-Agent": "KampusRaf/1.0",
        },
      });

      if (!response.ok) continue;

      const payload = (await response.json()) as MediaWikiSearchResponse;
      const results = payload.query?.search || [];

      for (const item of results) {
        if (!pageMap.has(item.pageid)) {
          pageMap.set(item.pageid, item);
        }

        if (pageMap.size >= limit * 4) break;
      }

      if (pageMap.size >= limit * 4) break;
    } catch {
      continue;
    }
  }

  return Array.from(pageMap.values()).slice(0, limit * 4);
}

async function fetchTurkishWikisourcePageText(title: string) {
  const url = new URL("https://tr.wikisource.org/w/api.php");
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "text");
  url.searchParams.set("format", "json");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("origin", "*");

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      "User-Agent": "KampusRaf/1.0",
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as MediaWikiParseResponse;
  const html = payload.parse?.text?.["*"];

  if (!html) return null;

  return stripMediaWikiHtml(html);
}

export async function importGutenbergQuotesAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const search = String(formData.get("search") || "").trim();
  const language = String(formData.get("language") || "en").trim() || "en";
  const maxBooks = Math.min(Number(formData.get("maxBooks") || 1), 3);
  const maxQuotesPerBook = Math.min(
    Number(formData.get("maxQuotesPerBook") || 10),
    25
  );

  if (!search) {
    redirect("/admin/alintilar?error=empty-search");
  }

  const url = new URL("https://gutendex.com/books/");
  url.searchParams.set("search", search);
  url.searchParams.set("languages", language);
  url.searchParams.set("copyright", "false");
  url.searchParams.set("mime_type", "text/plain");

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    redirect("/admin/alintilar?error=gutendex-fetch-failed");
  }

  const payload = (await response.json()) as GutendexResponse;
  const books = (payload.results || [])
    .filter((book) => getPlainTextUrl(book.formats))
    .slice(0, maxBooks);

  if (books.length === 0) {
    redirect("/admin/alintilar?error=no-books");
  }

  let insertedBooks = 0;
  let insertedQuotes = 0;

  for (const book of books) {
    const textUrl = getPlainTextUrl(book.formats);

    if (!textUrl) continue;

    const textResponse = await fetch(textUrl, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!textResponse.ok) continue;

    const rawText = await textResponse.text();
    const quotes = extractQuoteCandidates(rawText, maxQuotesPerBook);

    if (quotes.length === 0) continue;

    const author =
      book.authors && book.authors.length > 0
        ? book.authors.map((item) => item.name).filter(Boolean).join(", ")
        : null;

    const externalId = `gutenberg:${book.id}`;

    const bookPayload = {
      title: book.title,
      author,
      language,
      source_name: "Project Gutenberg / Gutendex",
      source_url: `https://www.gutenberg.org/ebooks/${book.id}`,
      license_type: "public_domain_review_required",
      copyright_status: "public_domain_usa_review_required",
      external_id: externalId,
      description:
        "Gutendex üzerinden Project Gutenberg metadata kullanılarak içe aktarıldı. Yayın öncesi admin kontrolü önerilir.",
      is_active: true,
    };

    const { data: existingBook, error: existingBookError } = await supabase
      .from("quote_books")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();

    if (existingBookError) {
      console.error("QUOTE_BOOK_SELECT_ERROR", existingBookError);
      redirect("/admin/alintilar?error=book-select-failed");
    }

    let quoteBookId = existingBook?.id || null;

    if (quoteBookId) {
      const { error: updateBookError } = await supabase
        .from("quote_books")
        .update(bookPayload)
        .eq("id", quoteBookId);

      if (updateBookError) {
        console.error("QUOTE_BOOK_UPDATE_ERROR", updateBookError);
        redirect("/admin/alintilar?error=book-update-failed");
      }
    } else {
      const { data: insertedBook, error: insertBookError } = await supabase
        .from("quote_books")
        .insert(bookPayload)
        .select("id")
        .single();

      if (insertBookError || !insertedBook) {
        console.error("QUOTE_BOOK_INSERT_ERROR", insertBookError);
        redirect("/admin/alintilar?error=book-insert-failed");
      }

      quoteBookId = insertedBook.id;
    }

    if (!quoteBookId) continue;

    insertedBooks += 1;

    const quoteRows = [];

    for (const [index, quoteText] of quotes.entries()) {
      const isTurkish = language === "tr";
      const translatedText = isTurkish
        ? null
        : await translateTextToTurkish(quoteText);

      quoteRows.push({
        book_id: quoteBookId,
        quote_text: quoteText,
        quote_text_tr: translatedText,
        original_language: language,
        mood: isTurkish ? "keşif" : "discovery",
        topic: isTurkish ? "klasik" : "classic",
        estimated_read_seconds: getReadSeconds(translatedText || quoteText),
        status: "pending",
        is_active: false,
        source_location: `gutenberg-${book.id}-auto-${index + 1}`,
        created_by: user.id,
        translation_status: isTurkish
          ? "not_needed"
          : translatedText
            ? "translated"
            : "missing",
        translation_source: isTurkish
          ? null
          : translatedText
            ? "mymemory"
            : null,
        translated_at: translatedText ? new Date().toISOString() : null,
      });
    }

    const { data: quoteInsertData, error: quoteInsertError } = await supabase
      .from("quote_items")
      .upsert(quoteRows, {
        onConflict: "book_id,quote_text",
        ignoreDuplicates: true,
      })
      .select("id");

    if (quoteInsertError) {
      console.error("QUOTE_INSERT_ERROR", quoteInsertError);
      continue;
    }

    insertedQuotes += quoteInsertData?.length || 0;
  }

  if (insertedBooks === 0 && insertedQuotes === 0) {
    redirect("/admin/alintilar?error=import-zero");
  }

  revalidatePath("/admin/alintilar");
  revalidatePath("/rastgele-raf");

  redirect(
    `/admin/alintilar?success=imported&books=${insertedBooks}&quotes=${insertedQuotes}`
  );
}

export async function importTurkishWikisourceQuotesAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const search = String(formData.get("search") || "").trim();
  const maxPages = Math.min(Number(formData.get("maxPages") || 1), 3);
  const maxQuotesPerPage = Math.min(
    Number(formData.get("maxQuotesPerPage") || 10),
    25
  );

  if (!search) {
    redirect("/admin/alintilar?error=empty-search");
  }

  const pages = await fetchTurkishWikisourceSearch(search, maxPages);

  if (pages.length === 0) {
    redirect("/admin/alintilar?error=no-wikisource-pages");
  }

  let insertedBooks = 0;
  let insertedQuotes = 0;

  for (const page of pages) {
    const rawText = await fetchTurkishWikisourcePageText(page.title);

    if (!rawText) continue;

    const quotes = extractTurkishQuoteCandidates(rawText, maxQuotesPerPage);

    if (quotes.length === 0) continue;

    const externalId = `trwikisource:${page.pageid}`;

    const bookPayload = {
      title: page.title,
      author: null,
      language: "tr",
      source_name: "Türkçe Vikikaynak",
      source_url: getWikisourcePageUrl(page.title),
      license_type: "wikisource_review_required",
      copyright_status: "review_required",
      external_id: externalId,
      description:
        "Türkçe Vikikaynak üzerinden MediaWiki API ile içe aktarıldı. Yayın öncesi admin lisans/kaynak kontrolü önerilir.",
      is_active: true,
    };

    const { data: existingBook, error: existingBookError } = await supabase
      .from("quote_books")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();

    if (existingBookError) {
      console.error("TR_WIKISOURCE_BOOK_SELECT_ERROR", existingBookError);
      redirect("/admin/alintilar?error=book-select-failed");
    }

    let quoteBookId = existingBook?.id || null;

    if (quoteBookId) {
      const { error: updateBookError } = await supabase
        .from("quote_books")
        .update(bookPayload)
        .eq("id", quoteBookId);

      if (updateBookError) {
        console.error("TR_WIKISOURCE_BOOK_UPDATE_ERROR", updateBookError);
        redirect("/admin/alintilar?error=book-update-failed");
      }
    } else {
      const { data: insertedBook, error: insertBookError } = await supabase
        .from("quote_books")
        .insert(bookPayload)
        .select("id")
        .single();

      if (insertBookError || !insertedBook) {
        console.error("TR_WIKISOURCE_BOOK_INSERT_ERROR", insertBookError);
        redirect("/admin/alintilar?error=book-insert-failed");
      }

      quoteBookId = insertedBook.id;
    }

    if (!quoteBookId) continue;

    insertedBooks += 1;

    const quoteRows = quotes.map((quoteText, index) => ({
        book_id: quoteBookId,
        quote_text: quoteText,
        quote_text_tr: null,
        original_language: "tr",
        mood: "keşif",
        topic: getTurkishTopic(quoteText),
        estimated_read_seconds: getReadSeconds(quoteText),
        status: "pending",
        is_active: false,
        source_location: `trwikisource-${page.pageid}-auto-${index + 1}`,
        created_by: user.id,
        translation_status: "not_needed",
        translation_source: null,
        translated_at: null,
    }));

    const { data: quoteInsertData, error: quoteInsertError } = await supabase
      .from("quote_items")
      .upsert(quoteRows, {
        onConflict: "book_id,quote_text",
        ignoreDuplicates: true,
      })
      .select("id");

    if (quoteInsertError) {
      console.error("TR_WIKISOURCE_QUOTE_INSERT_ERROR", quoteInsertError);
      continue;
    }

    insertedQuotes += quoteInsertData?.length || 0;
  }

  if (insertedBooks === 0 && insertedQuotes === 0) {
    redirect("/admin/alintilar?error=import-zero");
  }

  revalidatePath("/admin/alintilar");
  revalidatePath("/rastgele-raf");

  redirect(
    `/admin/alintilar?success=imported&books=${insertedBooks}&quotes=${insertedQuotes}`
  );
}

export async function importManualTurkishTextQuotesAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  const author = String(formData.get("author") || "").trim();
  const sourceUrl = String(formData.get("sourceUrl") || "").trim();
  const sourceNote = String(formData.get("sourceNote") || "").trim();
  const rawText = String(formData.get("rawText") || "").trim();
  const maxQuotes = Math.min(Number(formData.get("maxQuotes") || 15), 40);

  if (!title || !rawText) {
    redirect("/admin/alintilar?error=manual-required");
  }

  if (rawText.length < 300) {
    redirect("/admin/alintilar?error=manual-text-too-short");
  }

  const quotes = extractTurkishQuoteCandidates(rawText, maxQuotes);

  if (quotes.length === 0) {
    redirect("/admin/alintilar?error=manual-no-quotes");
  }

  const externalId = `manual-tr:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const bookPayload = {
    title,
    author: author || null,
    language: "tr",
    source_name: "Manuel Türkçe Metin",
    source_url: sourceUrl || null,
    license_type: "manual_review_required",
    copyright_status: "review_required",
    external_id: externalId,
    description:
      sourceNote ||
      "Admin tarafından manuel metin olarak içe aktarıldı. Yayın öncesi lisans/kaynak kontrolü önerilir.",
    is_active: true,
  };

  const { data: insertedBook, error: insertBookError } = await supabase
    .from("quote_books")
    .insert(bookPayload)
    .select("id")
    .single();

  if (insertBookError || !insertedBook) {
    console.error("MANUAL_TR_BOOK_INSERT_ERROR", insertBookError);
    redirect("/admin/alintilar?error=book-insert-failed");
  }

  const quoteRows = quotes.map((quoteText, index) => ({
    book_id: insertedBook.id,
    quote_text: quoteText,
    quote_text_tr: null,
    original_language: "tr",
    mood: "keşif",
    topic: getTurkishTopic(quoteText),
    estimated_read_seconds: getReadSeconds(quoteText),
    status: "pending",
    is_active: false,
    source_location: `manual-tr-auto-${index + 1}`,
    created_by: user.id,
    translation_status: "not_needed",
    translation_source: null,
    translated_at: null,
  }));

  const { data: quoteInsertData, error: quoteInsertError } = await supabase
    .from("quote_items")
    .insert(quoteRows)
    .select("id");

  if (quoteInsertError) {
    console.error("MANUAL_TR_QUOTE_INSERT_ERROR", quoteInsertError);
    redirect("/admin/alintilar?error=quote-insert-failed");
  }

  revalidatePath("/admin/alintilar");
  revalidatePath("/rastgele-raf");

  redirect(
    `/admin/alintilar?success=imported&books=1&quotes=${
      quoteInsertData?.length || 0
    }`
  );
}

export async function updateQuoteStatusAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const quoteId = String(formData.get("quoteId") || "");
  const status = String(formData.get("status") || "");

  if (!quoteId || !["approved", "rejected", "pending"].includes(status)) {
    redirect("/admin/alintilar?error=invalid-status");
  }

  const updatePayload =
    status === "approved"
      ? {
          status,
          is_active: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        }
      : {
          status,
          is_active: false,
        };

  await supabase.from("quote_items").update(updatePayload).eq("id", quoteId);

  revalidatePath("/admin/alintilar");
  revalidatePath("/rastgele-raf");

  redirect("/admin/alintilar?success=status-updated");
}