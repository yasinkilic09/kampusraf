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

const turkishWikisourceFallbackQueries = [
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

const curatedTurkishResearchCollections = {
  turkish_classics: [
    "Yunus Emre",
    "Dede Korkut",
    "Fuzuli",
    "Baki",
    "Nedim",
    "Karacaoğlan",
    "Pir Sultan Abdal",
    "Evliya Çelebi",
  ],
  modern_turkish: [
    "Namık Kemal",
    "Ziya Paşa",
    "Şinasi",
    "Tevfik Fikret",
    "Mehmet Akif",
    "Ömer Seyfettin",
    "Ahmet Mithat",
  ],
  thought_and_education: [
    "ilim",
    "irfan",
    "maarif",
    "mektep",
    "hakikat",
    "akıl",
    "fikir",
    "medeniyet",
  ],
  life_and_emotion: [
    "gönül",
    "sevgi",
    "dost",
    "umut",
    "zaman",
    "hayat",
    "çocuk",
    "gençlik",
  ],
};

type AdminContext = Awaited<ReturnType<typeof requireAdmin>>;

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
  if (text.length < 55 || text.length > 360) return true;
  if (text.split(" ").length < 8) return true;
  if (/[,;:]$/.test(text)) return true;
  if (/^(ve|veya|ama|fakat|çünkü|zira|and|but|or|because|however|therefore|then)\b/i.test(text)) {
    return true;
  }

  if (/project gutenberg/i.test(text)) return true;
  if (/chapter|contents|illustration|footnote|transcriber|preface|appendix/i.test(text)) {
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

function getMeaningfulQuoteScore(value: string, language?: string | null) {
  const text = normalizeQuoteText(value);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  let score = 0;

  const universalConcepts =
    /(insan|hayat|zaman|dünya|gönül|kalp|ruh|akıl|fikir|hakikat|umut|sevgi|emek|adalet|özgürlük|hürriyet|vatan|millet|irfan|medeniyet|kitap|ilim|dost|yol|söz|life|time|world|heart|mind|truth|hope|love|justice|freedom|soul|book|knowledge|friend|thought|human|memory|dream)/i;

  if (wordCount >= 12 && wordCount <= 36) score += 8;
  else if (wordCount >= 9 && wordCount <= 48) score += 4;
  else score -= 5;

  if (text.length >= 85 && text.length <= 260) score += 6;
  else if (text.length <= 330) score += 2;
  else score -= 4;

  if (/[.!?…]$/.test(text)) score += 4;
  else score -= 6;

  if (/^[A-ZÇĞİÖŞÜÂÎÛ]/.test(text)) score += 2;
  if (universalConcepts.test(text)) score += 8;
  if (/[;—-]/.test(text)) score += 1;
  if (language === "tr" && /[ğüşöçıİĞÜŞÖÇ]/.test(text)) score += 3;

  if (/^[A-ZÇĞİÖŞÜÂÎÛ\s'"]+$/.test(text)) score -= 8;
  if ((text.match(/,/g) || []).length > 5) score -= 4;
  if ((text.match(/:/g) || []).length > 1) score -= 4;
  if ((text.match(/[.!?…]/g) || []).length > 4) score -= 3;
  if (/\b(chapter|volume|book|section|bölüm|cilt|fasıl|madde|sayfa|dipnot)\b/i.test(text)) {
    score -= 8;
  }
  if (/\b(said|replied|asked|cried|dedi|sordu|cevap verdi|diye)\b/i.test(text)) {
    score -= 2;
  }

  return score;
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

  return allCandidates
    .map((candidate) => normalizeQuoteText(candidate))
    .filter((candidate) => {
      const key = candidate.toLowerCase();

      if (unique.has(key)) return false;
      if (looksLikeBadQuote(candidate)) return false;

      unique.add(key);

      return true;
    })
    .map((candidate) => ({
      text: candidate,
      score: getMeaningfulQuoteScore(candidate),
    }))
    .filter((candidate) => candidate.score >= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxQuotes)
    .map((candidate) => candidate.text);
}

function getReadSeconds(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return Math.min(Math.max(Math.round(wordCount / 2.4), 8), 20);
}

async function translateTextToTurkish(text: string, sourceLanguage = "en") {
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", `${sourceLanguage}|tr`);

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

  return score + Math.round(getMeaningfulQuoteScore(text, "tr") * 0.8);
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
    .filter((candidate) => candidate.score >= 14)
    .sort((a, b) => b.score - a.score);

  return scoredCandidates.slice(0, maxQuotes).map((candidate) => candidate.text);
}

function buildTurkishSearchQueries(search: string) {
  const cleanSearch = search.trim();

  const baseQueries = [
    cleanSearch,
    `"${cleanSearch}"`,
    `intitle:${cleanSearch}`,
    `${cleanSearch} alıntı`,
    `${cleanSearch} sözleri`,
    `${cleanSearch} şiir`,
    `${cleanSearch} şiirleri`,
    `${cleanSearch} hikaye`,
    `${cleanSearch} hikayeleri`,
    `${cleanSearch} eserleri`,
    `${cleanSearch} divan`,
    `${cleanSearch} nutuk`,
    `${cleanSearch} mektup`,
    `${cleanSearch} tiyatro`,
    `${cleanSearch} roman`,
    `${cleanSearch} deneme`,
  ];

  const queries = cleanSearch ? baseQueries : turkishWikisourceFallbackQueries;

  return Array.from(
    new Set(
      queries
        .map((query) => query.trim())
        .filter(Boolean)
    )
  );
}

function buildAuthorResearchQueries(authorName: string) {
  const cleanAuthor = authorName.replace(/\s+/g, " ").trim();

  if (!cleanAuthor) return [];

  const nameParts = cleanAuthor
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const baseQueries = [
    cleanAuthor,
    `"${cleanAuthor}"`,
    `intitle:${cleanAuthor}`,
    `${cleanAuthor} eserleri`,
    `${cleanAuthor} kitapları`,
    `${cleanAuthor} şiirleri`,
    `${cleanAuthor} hikayeleri`,
    `${cleanAuthor} roman`,
    `${cleanAuthor} deneme`,
    `${cleanAuthor} mektup`,
    `${cleanAuthor} sözleri`,
  ];

  if (lastName && lastName.toLowerCase() !== cleanAuthor.toLowerCase()) {
    baseQueries.push(lastName, `intitle:${lastName}`, `${lastName} works`);
  }

  return Array.from(
    new Set(baseQueries.map((query) => query.trim()).filter(Boolean))
  ).slice(0, 14);
}

function getGutenbergLanguages(languageScope: string) {
  if (languageScope === "tr") return ["tr"];
  if (languageScope === "en") return ["en"];
  if (languageScope === "fr") return ["fr"];
  if (languageScope === "de") return ["de"];

  return ["en", "tr", "fr", "de"];
}

function getSafeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = String(value || "").trim();

  if (!returnTo.startsWith("/admin/alintilar")) {
    return "/admin/alintilar";
  }

  return returnTo;
}

function getBooleanFormValue(value: FormDataEntryValue | null, defaultValue = false) {
  if (value === null) return defaultValue;

  const normalized = String(value).toLowerCase();

  return ["1", "true", "on", "yes"].includes(normalized);
}

async function fetchTurkishWikisourceSearch(
  search: string,
  limit: number,
  includeFallbacks: boolean
) {
  const queries = includeFallbacks
    ? [...buildTurkishSearchQueries(search), ...turkishWikisourceFallbackQueries]
    : buildTurkishSearchQueries(search);
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

async function importTurkishWikisourceSources({
  supabase,
  user,
  searches,
  maxPages,
  maxQuotesPerPage,
  includeFallbacks,
  authorHint,
}: {
  supabase: AdminContext["supabase"];
  user: AdminContext["user"];
  searches: string[];
  maxPages: number;
  maxQuotesPerPage: number;
  includeFallbacks: boolean;
  authorHint?: string | null;
}) {
  let insertedBooks = 0;
  let insertedQuotes = 0;
  const seenExternalIds = new Set<string>();

  for (const search of searches) {
    const pages = await fetchTurkishWikisourceSearch(
      search,
      maxPages,
      includeFallbacks
    );

    for (const page of pages) {
      const externalId = `trwikisource:${page.pageid}`;

      if (seenExternalIds.has(externalId)) continue;
      seenExternalIds.add(externalId);

      const rawText = await fetchTurkishWikisourcePageText(page.title);

      if (!rawText) continue;

      const quotes = extractTurkishQuoteCandidates(rawText, maxQuotesPerPage);

      if (quotes.length === 0) continue;

      const bookPayload = {
        title: page.title,
        author: authorHint || null,
        language: "tr",
        source_name: "Türkçe Vikikaynak",
        source_url: getWikisourcePageUrl(page.title),
        license_type: "wikisource_review_required",
        copyright_status: "review_required",
        external_id: externalId,
        description: `Türkçe Vikikaynak üzerinden "${search}" araştırmasıyla içe aktarıldı.${authorHint ? ` Yazar araştırması: ${authorHint}.` : ""} Yayın öncesi admin lisans/kaynak kontrolü önerilir.`,
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
  }

  return { insertedBooks, insertedQuotes };
}

async function importGutenbergSources({
  supabase,
  user,
  searches,
  languages,
  maxBooks,
  maxQuotesPerBook,
}: {
  supabase: AdminContext["supabase"];
  user: AdminContext["user"];
  searches: string[];
  languages: string[];
  maxBooks: number;
  maxQuotesPerBook: number;
}) {
  const bookSources: Array<{
    book: GutendexBook;
    language: string;
    search: string;
  }> = [];
  const seenBookIds = new Set<number>();
  let fetchFailed = false;

  sourceLoop: for (const search of searches) {
    for (const language of languages) {
      if (bookSources.length >= maxBooks) break sourceLoop;

      const url = new URL("https://gutendex.com/books/");
      url.searchParams.set("search", search);
      url.searchParams.set("languages", language);
      url.searchParams.set("copyright", "false");
      url.searchParams.set("mime_type", "text/plain");

      try {
        const response = await fetch(url.toString(), {
          next: { revalidate: 60 * 60 },
        });

        if (!response.ok) {
          fetchFailed = true;
          continue;
        }

        const payload = (await response.json()) as GutendexResponse;
        const books = payload.results || [];

        for (const book of books) {
          if (bookSources.length >= maxBooks) break sourceLoop;
          if (seenBookIds.has(book.id)) continue;
          if (book.copyright === true) continue;
          if (!getPlainTextUrl(book.formats)) continue;

          seenBookIds.add(book.id);
          bookSources.push({ book, language, search });
        }
      } catch {
        fetchFailed = true;
      }
    }
  }

  let insertedBooks = 0;
  let insertedQuotes = 0;

  for (const { book, language, search } of bookSources) {
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
    const originalLanguage = book.languages?.[0] || language;
    const externalId = `gutenberg:${book.id}`;

    const bookPayload = {
      title: book.title,
      author,
      language: originalLanguage,
      source_name: "Project Gutenberg / Gutendex",
      source_url: `https://www.gutenberg.org/ebooks/${book.id}`,
      license_type: "public_domain_review_required",
      copyright_status: "public_domain_usa_review_required",
      external_id: externalId,
      description: `Gutendex üzerinden Project Gutenberg metadata kullanılarak "${search}" aramasıyla içe aktarıldı. Yayın öncesi admin kontrolü önerilir.`,
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
      const isTurkish = originalLanguage === "tr";
      const translatedText = isTurkish
        ? null
        : await translateTextToTurkish(quoteText, originalLanguage);

      quoteRows.push({
        book_id: quoteBookId,
        quote_text: quoteText,
        quote_text_tr: translatedText,
        original_language: originalLanguage,
        mood: isTurkish ? "keşif" : "discovery",
        topic: isTurkish ? getTurkishTopic(quoteText) : "classic",
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

  return {
    fetchFailed,
    foundBooks: bookSources.length,
    insertedBooks,
    insertedQuotes,
  };
}

export async function importGutenbergQuotesAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const search = String(
    formData.get("suggestedSearch") || formData.get("search") || ""
  ).trim();
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
        : await translateTextToTurkish(quoteText, language);

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

export async function importAuthorInternetQuotesAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const authorName = String(
    formData.get("suggestedAuthor") || formData.get("authorName") || ""
  ).trim();
  const sourceScope = String(formData.get("sourceScope") || "all");
  const languageScope = String(formData.get("languageScope") || "global");
  const maxSources = Math.min(
    Math.max(Number(formData.get("maxSources") || 5), 1),
    10
  );
  const maxQuotesPerSource = Math.min(
    Math.max(Number(formData.get("maxQuotesPerSource") || 12), 5),
    30
  );
  const searches = buildAuthorResearchQueries(authorName);

  if (!authorName || searches.length === 0) {
    redirect("/admin/alintilar?error=author-required");
  }

  let insertedBooks = 0;
  let insertedQuotes = 0;
  let foundBooks = 0;
  let fetchFailed = false;

  if (sourceScope === "all" || sourceScope === "wikisource") {
    const wikisourceResult = await importTurkishWikisourceSources({
      supabase,
      user,
      searches,
      maxPages: Math.min(maxSources, 8),
      maxQuotesPerPage: maxQuotesPerSource,
      includeFallbacks: false,
      authorHint: authorName,
    });

    insertedBooks += wikisourceResult.insertedBooks;
    insertedQuotes += wikisourceResult.insertedQuotes;
  }

  if (sourceScope === "all" || sourceScope === "gutenberg") {
    const gutenbergResult = await importGutenbergSources({
      supabase,
      user,
      searches,
      languages: getGutenbergLanguages(languageScope),
      maxBooks: maxSources,
      maxQuotesPerBook: maxQuotesPerSource,
    });

    fetchFailed = gutenbergResult.fetchFailed;
    foundBooks += gutenbergResult.foundBooks;
    insertedBooks += gutenbergResult.insertedBooks;
    insertedQuotes += gutenbergResult.insertedQuotes;
  }

  if (insertedBooks === 0 && insertedQuotes === 0) {
    if (sourceScope === "gutenberg" && fetchFailed && foundBooks === 0) {
      redirect("/admin/alintilar?error=gutendex-fetch-failed");
    }

    if (sourceScope === "gutenberg" && foundBooks === 0) {
      redirect("/admin/alintilar?error=no-books");
    }

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

  const search = String(
    formData.get("suggestedSearch") || formData.get("search") || ""
  ).trim();
  const maxPages = Math.min(Number(formData.get("maxPages") || 1), 8);
  const maxQuotesPerPage = Math.min(
    Number(formData.get("maxQuotesPerPage") || 10),
    40
  );
  const includeFallbacks = getBooleanFormValue(
    formData.get("includeFallbacks"),
    true
  );

  if (!search) {
    redirect("/admin/alintilar?error=empty-search");
  }

  const { insertedBooks, insertedQuotes } = await importTurkishWikisourceSources({
    supabase,
    user,
    searches: [search],
    maxPages,
    maxQuotesPerPage,
    includeFallbacks,
  });

  if (insertedBooks === 0 && insertedQuotes === 0) {
    redirect("/admin/alintilar?error=import-zero");
  }

  revalidatePath("/admin/alintilar");
  revalidatePath("/rastgele-raf");

  redirect(
    `/admin/alintilar?success=imported&books=${insertedBooks}&quotes=${insertedQuotes}`
  );
}

export async function importCuratedQuoteResearchAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const collectionKey = String(formData.get("collection") || "").trim();
  const depth = String(formData.get("depth") || "standard").trim();
  const customSearches = String(formData.get("customSearches") || "")
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  const curatedSearches =
    curatedTurkishResearchCollections[
      collectionKey as keyof typeof curatedTurkishResearchCollections
    ] || [];

  const searches = Array.from(
    new Set([...curatedSearches, ...customSearches])
  ).slice(0, 18);

  if (searches.length === 0) {
    redirect("/admin/alintilar?error=empty-search");
  }

  const depthConfig =
    depth === "deep"
      ? { maxPages: 5, maxQuotesPerPage: 25 }
      : depth === "focused"
        ? { maxPages: 2, maxQuotesPerPage: 12 }
        : { maxPages: 3, maxQuotesPerPage: 18 };

  const { insertedBooks, insertedQuotes } = await importTurkishWikisourceSources({
    supabase,
    user,
    searches,
    maxPages: depthConfig.maxPages,
    maxQuotesPerPage: depthConfig.maxQuotesPerPage,
    includeFallbacks: false,
  });

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
  const returnTo = getSafeReturnTo(formData.get("returnTo"));

  if (!quoteId || !["approved", "rejected", "pending"].includes(status)) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=invalid-status`);
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

  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}success=status-updated`);
}

export async function bulkUpdateQuoteStatusAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();

  const quoteIds = formData
    .getAll("quoteIds")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 80);
  const status = String(formData.get("status") || "");
  const returnTo = getSafeReturnTo(formData.get("returnTo"));
  const redirectPrefix = `${returnTo}${returnTo.includes("?") ? "&" : "?"}`;

  if (quoteIds.length === 0) {
    redirect(`${redirectPrefix}error=no-selection`);
  }

  if (!["approved", "rejected", "pending"].includes(status)) {
    redirect(`${redirectPrefix}error=invalid-status`);
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

  const { error } = await supabase
    .from("quote_items")
    .update(updatePayload)
    .in("id", quoteIds);

  if (error) {
    console.error("QUOTE_BULK_STATUS_UPDATE_ERROR", error);
    redirect(`${redirectPrefix}error=quote-bulk-update-failed`);
  }

  revalidatePath("/admin/alintilar");
  revalidatePath("/rastgele-raf");

  redirect(`${redirectPrefix}success=bulk-status-updated&quotes=${quoteIds.length}`);
}
