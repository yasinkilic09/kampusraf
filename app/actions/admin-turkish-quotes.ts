"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  if (/chapter|contents|illustration|footnote|transcriber/i.test(text)) return true;
  if (/produced by|distributed proofreaders|ebook|license/i.test(text)) return true;
  if (/https?:\/\//i.test(text)) return true;
  if (/www\./i.test(text)) return true;
  if ((text.match(/\d/g) || []).length > 12) return true;

  const letterCount = (text.match(/[a-zA-ZğüşöçıİĞÜŞÖÇâîûÂÎÛ]/g) || []).length;
  if (letterCount < 40) return true;

  return false;
}

function extractSentences(text: string) {
  const sentenceMatches = text.match(/[^.!?…]+[.!?…]+/g);

  if (!sentenceMatches) return [];

  return sentenceMatches.map(normalizeQuoteText).filter(Boolean);
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
  const candidates: string[] = [];

  for (const candidate of allCandidates) {
    const normalized = normalizeQuoteText(candidate);
    const key = normalized.toLowerCase();

    if (unique.has(key)) continue;
    if (looksLikeBadQuote(normalized)) continue;
    if (looksLikeTurkishSourceNoise(normalized)) continue;

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

async function fetchTurkishWikisourceSearch(search: string, limit: number) {
  const url = new URL("https://tr.wikisource.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", search);
  url.searchParams.set("srnamespace", "0");
  url.searchParams.set("srlimit", String(limit));
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      "User-Agent": "KampusRaf/1.0",
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as MediaWikiSearchResponse;

  return payload.query?.search || [];
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
      topic: "türkçe",
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