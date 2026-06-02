import { NextResponse } from "next/server";

type NormalizedExternalBook = {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;

  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFirstString(value: unknown) {
  const items = getStringArray(value);
  return items[0] || null;
}

function getPublishedYear(value: unknown) {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value >= 1000) return value;
    return null;
  }

  if (typeof value !== "string") return null;

  const match = value.match(/\d{4}/);
  if (!match) return null;

  const year = Number(match[0]);

  if (!Number.isFinite(year)) return null;
  if (year < 1000 || year > new Date().getFullYear() + 1) return null;

  return year;
}

function getBestIsbnFromGoogle(identifiers: unknown) {
  if (!Array.isArray(identifiers)) return null;

  const records = identifiers.filter(isRecord);

  const isbn13 = records.find(
    (item) => item.type === "ISBN_13" && typeof item.identifier === "string"
  );

  const isbn10 = records.find(
    (item) => item.type === "ISBN_10" && typeof item.identifier === "string"
  );

  const selected = isbn13 || isbn10;

  if (!selected || typeof selected.identifier !== "string") return null;

  return selected.identifier.trim() || null;
}

function normalizeKey(book: NormalizedExternalBook) {
  return [
    book.isbn || "",
    book.title.toLocaleLowerCase("tr-TR"),
    book.author.toLocaleLowerCase("tr-TR"),
  ].join("|");
}

async function searchGoogleBooks(
  query: string
): Promise<NormalizedExternalBook[]> {
  const params = new URLSearchParams();
  const numericQuery = query.replace(/[^0-9Xx]/g, "");

  params.set("q", numericQuery.length >= 10 ? `isbn:${numericQuery}` : query);
  params.set("maxResults", "8");
  params.set("printType", "books");
  params.set("projection", "lite");

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) return [];

  const payload: unknown = await response.json();

  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    return [];
  }

  const items = payload.items.filter(isRecord);

  return items
    .map((item): NormalizedExternalBook | null => {
      const volumeInfoRaw = item.volumeInfo;

      if (!isRecord(volumeInfoRaw)) return null;

      const title = cleanText(volumeInfoRaw.title);
      const authors = getStringArray(volumeInfoRaw.authors);
      const author = cleanText(authors.join(", "));

      if (!title || !author) return null;

      const categories = getStringArray(volumeInfoRaw.categories);
      const imageLinks = isRecord(volumeInfoRaw.imageLinks)
        ? volumeInfoRaw.imageLinks
        : null;

      return {
        source: "google_books",
        source_id: cleanText(item.id) || title,
        title,
        author,
        isbn: getBestIsbnFromGoogle(volumeInfoRaw.industryIdentifiers),
        category: cleanText(categories.join(", ")),
        cover_url:
          cleanText(imageLinks?.thumbnail) ||
          cleanText(imageLinks?.smallThumbnail),
        publisher: cleanText(volumeInfoRaw.publisher),
        published_year: getPublishedYear(volumeInfoRaw.publishedDate),
        description: cleanText(volumeInfoRaw.description),
      };
    })
    .filter((book): book is NormalizedExternalBook => book !== null);
}

async function searchOpenLibrary(
  query: string
): Promise<NormalizedExternalBook[]> {
  const params = new URLSearchParams();

  params.set("q", query);
  params.set("limit", "8");
  params.set(
    "fields",
    "key,title,author_name,isbn,cover_i,first_publish_year,publisher,subject"
  );

  const response = await fetch(
    `https://openlibrary.org/search.json?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) return [];

  const payload: unknown = await response.json();

  if (!isRecord(payload) || !Array.isArray(payload.docs)) {
    return [];
  }

  const docs = payload.docs.filter(isRecord);

  return docs
    .map((doc): NormalizedExternalBook | null => {
      const title = cleanText(doc.title);
      const authorNames = getStringArray(doc.author_name);
      const author = cleanText(authorNames.slice(0, 3).join(", "));

      if (!title || !author) return null;

      const coverId =
        typeof doc.cover_i === "number" || typeof doc.cover_i === "string"
          ? String(doc.cover_i)
          : null;

      return {
        source: "open_library",
        source_id: cleanText(doc.key) || title,
        title,
        author,
        isbn: getFirstString(doc.isbn),
        category: getFirstString(doc.subject),
        cover_url: coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : null,
        publisher: getFirstString(doc.publisher),
        published_year: getPublishedYear(doc.first_publish_year),
        description: null,
      };
    })
    .filter((book): book is NormalizedExternalBook => book !== null);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = String(searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return NextResponse.json(
      {
        books: [],
        error: "Arama için en az 2 karakter gir.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const [googleBooks, openLibraryBooks] = await Promise.all([
      searchGoogleBooks(query),
      searchOpenLibrary(query),
    ]);

    const uniqueBooks = new Map<string, NormalizedExternalBook>();

    for (const book of [...googleBooks, ...openLibraryBooks]) {
      const key = normalizeKey(book);

      if (!uniqueBooks.has(key)) {
        uniqueBooks.set(key, book);
      }
    }

    return NextResponse.json({
      books: Array.from(uniqueBooks.values()).slice(0, 12),
      error: null,
    });
  } catch (error) {
    console.error("External book search error:", error);

    return NextResponse.json(
      {
        books: [],
        error: "İnternetten kitap bilgisi çekilemedi.",
      },
      {
        status: 500,
      }
    );
  }
}