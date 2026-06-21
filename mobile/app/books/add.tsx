import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const DARK_GREEN = "#25684C";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";

const conditions = [
  { value: "yeni", label: "Yeni" },
  { value: "temiz", label: "Temiz" },
  { value: "az_kullanilmis", label: "Az kullanılmış" },
  { value: "orta", label: "Orta" },
  { value: "yipranmis", label: "Yıpranmış" },
];

const exchangeTypes = [
  { value: "takas", label: "Takas" },
  { value: "odunc", label: "Ödünç" },
  { value: "satis", label: "Satış" },
  { value: "bagis", label: "Bağış" },
];

type LibraryScope = "exchange" | "personal";

const libraryScopeOptions: {
  value: LibraryScope;
  title: string;
  description: string;
  badge: string;
}[] = [
  {
    value: "exchange",
    title: "Paylaşım Rafı",
    description: "Arama, harita ve eşleşme sistemlerinde görünebilir.",
    badge: "Limitli",
  },
  {
    value: "personal",
    title: "Sanal Kitaplık",
    description: "Sadece senin okuma arşivinde saklanır.",
    badge: "Sınırsız",
  },
];

function isMissingLibraryScopeError(error: { message?: string | null; code?: string | null } | null) {
  if (!error) return false;

  const message = (error.message || "").toLocaleLowerCase("en-US");

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("library_scope") ||
    message.includes("column")
  );
}

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

function normalizeExternalKey(book: ExternalBook) {
  return [
    book.isbn || "",
    book.title.toLocaleLowerCase("tr-TR"),
    book.author.toLocaleLowerCase("tr-TR"),
  ].join("|");
}

async function searchGoogleBooks(query: string): Promise<ExternalBook[]> {
  const params = new URLSearchParams();
  const numericQuery = query.replace(/[^0-9Xx]/g, "");

  params.set("q", numericQuery.length >= 10 ? `isbn:${numericQuery}` : query);
  params.set("maxResults", "8");
  params.set("printType", "books");
  params.set("projection", "lite");

  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);

  if (!response.ok) return [];

  const payload: unknown = await response.json();

  if (!isRecord(payload) || !Array.isArray(payload.items)) return [];

  return payload.items
    .filter(isRecord)
    .map((item): ExternalBook | null => {
      const volumeInfo = item.volumeInfo;

      if (!isRecord(volumeInfo)) return null;

      const title = cleanText(volumeInfo.title);
      const author = cleanText(getStringArray(volumeInfo.authors).join(", "));

      if (!title || !author) return null;

      const categories = getStringArray(volumeInfo.categories);
      const imageLinks = isRecord(volumeInfo.imageLinks) ? volumeInfo.imageLinks : null;

      return {
        source: "google_books",
        source_id: cleanText(item.id) || title,
        title,
        author,
        isbn: getBestIsbnFromGoogle(volumeInfo.industryIdentifiers),
        category: cleanText(categories.join(", ")),
        cover_url: cleanText(imageLinks?.thumbnail) || cleanText(imageLinks?.smallThumbnail),
        publisher: cleanText(volumeInfo.publisher),
        published_year: getPublishedYear(volumeInfo.publishedDate),
        description: cleanText(volumeInfo.description),
      };
    })
    .filter((book): book is ExternalBook => book !== null);
}

async function searchOpenLibrary(query: string): Promise<ExternalBook[]> {
  const params = new URLSearchParams();

  params.set("q", query);
  params.set("limit", "8");
  params.set("fields", "key,title,author_name,isbn,cover_i,first_publish_year,publisher,subject");

  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);

  if (!response.ok) return [];

  const payload: unknown = await response.json();

  if (!isRecord(payload) || !Array.isArray(payload.docs)) return [];

  return payload.docs
    .filter(isRecord)
    .map((doc): ExternalBook | null => {
      const title = cleanText(doc.title);
      const author = cleanText(getStringArray(doc.author_name).slice(0, 3).join(", "));

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
        cover_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null,
        publisher: getFirstString(doc.publisher),
        published_year: getPublishedYear(doc.first_publish_year),
        description: null,
      };
    })
    .filter((book): book is ExternalBook => book !== null);
}

async function searchExternalBooks(query: string) {
  const [googleBooks, openLibraryBooks] = await Promise.all([
    searchGoogleBooks(query),
    searchOpenLibrary(query),
  ]);

  const uniqueBooks = new Map<string, ExternalBook>();

  for (const book of [...googleBooks, ...openLibraryBooks]) {
    const key = normalizeExternalKey(book);

    if (!uniqueBooks.has(key)) {
      uniqueBooks.set(key, book);
    }
  }

  return Array.from(uniqueBooks.values()).slice(0, 12);
}

function cleanNullable(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 0 ? clean : null;
}

function getCurrentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}

function getValidatedPublishedYear(value: string) {
  const clean = value.trim();

  if (!clean) return null;

  const year = Number(clean);

  if (!Number.isInteger(year) || year < 1000 || year > new Date().getFullYear() + 1) {
    throw new Error("Yayın yılı geçerli bir yıl olmalı.");
  }

  return year;
}

export default function AddBookScreen() {
  const params = useLocalSearchParams<{ scope?: string }>();
  const initialScope = params.scope === "personal" ? "personal" : "exchange";
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [isbn, setIsbn] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publishedYear, setPublishedYear] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("temiz");
  const [exchangeType, setExchangeType] = useState("takas");
  const [libraryScope, setLibraryScope] = useState<LibraryScope>(initialScope);
  const [city, setCity] = useState("");
  const [university, setUniversity] = useState("");
  const [note, setNote] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<CatalogBook[]>([]);
  const [selectedCatalogBook, setSelectedCatalogBook] = useState<CatalogBook | null>(null);
  const [externalResults, setExternalResults] = useState<ExternalBook[]>([]);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPersonalLibrary = libraryScope === "personal";

  useEffect(() => {
    async function loadProfile() {
      setErrorMessage(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("account_status, city, university")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
      }

      if (data?.account_status === "banned" || data?.account_status === "suspended") {
        setErrorMessage("Hesabın kısıtlı olduğu için mobilde kitap ekleyemezsin.");
      }

      if (data?.city) setCity(data.city);
      if (data?.university) setUniversity(data.university);
    }

    loadProfile().finally(() => setLoadingProfile(false));
  }, []);

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
    setMessage("Katalogdan seçildi. Şimdi kendi kopya bilgilerini tamamla.");
  }

  function clearCatalogSelection() {
    setSelectedCatalogBook(null);
    setMessage("Katalog seçimi kaldırıldı. Kitabı manuel kayıt olarak ekleyebilirsin.");
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
    setMessage("İnternetten kitap bilgileri çekildi. Bilgileri kontrol edip rafına ekleyebilirsin.");
  }

  async function searchCatalog() {
    const query = catalogQuery.trim() || title.trim();

    if (query.length < 2) {
      Alert.alert("Arama kısa", "Katalog araması için en az 2 karakter yaz.");
      return;
    }

    setSearchingCatalog(true);
    setMessage(null);

    const { data, error } = await supabase.rpc("search_books_catalog", {
      search_query: query,
      result_limit: 10,
    });

    setSearchingCatalog(false);

    if (error) {
      setCatalogResults([]);
      setErrorMessage(error.message);
      return;
    }

    const results = (data || []) as CatalogBook[];
    setCatalogResults(results);
    setMessage(results.length > 0 ? "Katalog sonuçları hazır." : "Katalogda sonuç bulunamadı. Manuel ekleyebilirsin.");
  }

  async function searchExternal() {
    const query = catalogQuery.trim() || title.trim();

    if (query.length < 2) {
      Alert.alert("Arama kısa", "İnternetten bilgi çekmek için kitap adı, yazar veya ISBN yaz.");
      return;
    }

    setSearchingExternal(true);
    setExternalError(null);
    setMessage(null);

    try {
      const results = await searchExternalBooks(query);
      setExternalResults(results);
      setMessage(
        results.length > 0
          ? "İnternetten kitap bilgileri bulundu."
          : "İnternette uygun kitap bilgisi bulunamadı."
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : "İnternetten kitap bilgisi çekilemedi.";
      setExternalResults([]);
      setExternalError(text);
    } finally {
      setSearchingExternal(false);
    }
  }

  async function checkBookLimit() {
    if (!userId) return { allowed: false, limit: 0 };
    if (isPersonalLibrary) return { allowed: true, limit: Number.POSITIVE_INFINITY };

    const monthStart = getCurrentMonthStart();

    const [{ data: profile }, scopedCountResult] = await Promise.all([
      supabase.from("profiles").select("monthly_book_limit").eq("id", userId).maybeSingle(),
      supabase
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("library_scope", "exchange")
        .gte("created_at", monthStart),
    ]);

    const { count } = isMissingLibraryScopeError(scopedCountResult.error)
      ? await supabase
          .from("user_books")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", monthStart)
      : scopedCountResult;

    const limit = profile?.monthly_book_limit ?? 10;
    const currentUsage = count ?? 0;

    return { allowed: currentUsage < limit, limit };
  }

  async function findExistingBookId() {
    const cleanIsbn = isbn.trim();
    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();

    if (cleanIsbn) {
      const { data } = await supabase
        .from("books")
        .select("id")
        .eq("isbn", cleanIsbn)
        .limit(1)
        .maybeSingle();

      if (data?.id) return String(data.id);
    }

    if (cleanTitle && cleanAuthor) {
      const { data } = await supabase
        .from("books")
        .select("id")
        .ilike("title", cleanTitle)
        .ilike("author", cleanAuthor)
        .limit(1)
        .maybeSingle();

      if (data?.id) return String(data.id);
    }

    return null;
  }

  async function createCatalogBook() {
    const { data, error } = await supabase
      .from("books")
      .insert({
        title: title.trim(),
        author: author.trim(),
        category: cleanNullable(category),
        isbn: cleanNullable(isbn),
        cover_url: cleanNullable(coverUrl),
        publisher: cleanNullable(publisher),
        published_year: getValidatedPublishedYear(publishedYear),
        description: cleanNullable(description),
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Kitap katalog kaydı oluşturulamadı.");
    }

    return String(data.id);
  }

  async function saveBook() {
    if (saving || errorMessage || !userId) return;

    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();

    if (!cleanTitle || !cleanAuthor) {
      Alert.alert("Eksik bilgi", "Kitap adı ve yazar zorunlu.");
      return;
    }

    if (!isPersonalLibrary && (!city.trim() || !university.trim())) {
      Alert.alert("Eksik konum", "Şehir ve üniversite bilgisi zorunlu.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const limitCheck = await checkBookLimit();

      if (!limitCheck.allowed) {
        throw new Error(`Aylık kitap ekleme limitine ulaştın. Mevcut limitin: ${limitCheck.limit}/ay.`);
      }

      let bookId = selectedCatalogBook?.id || null;

      if (!bookId) {
        bookId = await findExistingBookId();
      }

      if (!bookId) {
        bookId = await createCatalogBook();
      }

      const userBookPayload = {
        user_id: userId,
        book_id: bookId,
        library_scope: libraryScope,
        condition,
        exchange_type: exchangeType,
        status: "mevcut",
        custom_title: cleanTitle,
        custom_author: cleanAuthor,
        image_url: cleanNullable(coverUrl),
        note: cleanNullable(note),
        city: cleanNullable(city),
        university: cleanNullable(university),
        is_active: !isPersonalLibrary,
      };

      let { data: userBook, error } = await supabase
        .from("user_books")
        .insert(userBookPayload)
        .select("id")
        .single();

      if (isMissingLibraryScopeError(error)) {
        if (isPersonalLibrary) {
          throw new Error("Sanal Kitaplık için Supabase SQL güncellemesini çalıştırman gerekiyor.");
        }

        const fallbackInsert = await supabase
          .from("user_books")
          .insert({
            user_id: userId,
            book_id: bookId,
            condition,
            exchange_type: exchangeType,
            status: "mevcut",
            custom_title: cleanTitle,
            custom_author: cleanAuthor,
            image_url: cleanNullable(coverUrl),
            note: cleanNullable(note),
            city: city.trim(),
            university: university.trim(),
            is_active: true,
          })
          .select("id")
          .single();

        userBook = fallbackInsert.data;
        error = fallbackInsert.error;
      }

      if (error || !userBook) {
        throw new Error(error?.message || "Kitap rafa eklenemedi.");
      }

      const { error: matchError } = isPersonalLibrary
        ? { error: null }
        : await supabase.rpc("create_matches_for_user_book", {
            p_user_book_id: userBook.id,
          });

      setSaving(false);

      if (matchError) {
        Alert.alert(
          "Kitap eklendi",
          "Kitap rafına eklendi, ancak eşleşmeler daha sonra yenilenebilir."
        );
      }

      router.replace({
        pathname: "/books/[userBookId]",
        params: { userBookId: String(userBook.id) },
      } as never);
    } catch (error) {
      setSaving(false);
      const text = error instanceof Error ? error.message : "Kitap eklenirken sorun oluştu.";
      setMessage(text);
      Alert.alert("Kitap eklenemedi", text);
    }
  }

  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Kitap ekleme hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Geri</Text>
          </Pressable>

          <Text style={styles.eyebrow}>Kitap Ekle</Text>
          <Text style={styles.title}>Kitabını mobil rafına ekle.</Text>
          <Text style={styles.description}>
            Katalogda ara, varsa hazır kaydı seç; yoksa manuel bilgilerle yeni kayıt oluştur.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Uyarı</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>1. Adım</Text>
          <Text style={styles.sectionTitle}>Katalogda ara</Text>
          <Text style={styles.helperText}>Kitap adı, yazar veya ISBN ile mevcut katalog kaydını bul.</Text>

          <View style={styles.searchRow}>
            <TextInput
              value={catalogQuery}
              onChangeText={setCatalogQuery}
              placeholder="Örn. Suç ve Ceza"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={searchCatalog}
            />
            <Pressable style={styles.searchButton} onPress={searchCatalog} disabled={searchingCatalog}>
              {searchingCatalog ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>Ara</Text>}
            </Pressable>
          </View>

          {selectedCatalogBook ? (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedTitle}>Seçili kitap</Text>
              <Text style={styles.selectedText}>{selectedCatalogBook.title} - {selectedCatalogBook.author}</Text>
              <Pressable style={styles.clearButton} onPress={clearCatalogSelection}>
                <Text style={styles.clearButtonText}>Seçimi Kaldır</Text>
              </Pressable>
            </View>
          ) : null}

          {catalogResults.length > 0 ? (
            <View style={styles.resultList}>
              {catalogResults.map((book) => (
                <Pressable key={book.id} style={styles.resultCard} onPress={() => selectCatalogBook(book)}>
                  <View style={styles.resultCover}>
                    {book.cover_url ? (
                      <Image source={{ uri: book.cover_url }} style={styles.resultCoverImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.resultFallback}>📖</Text>
                    )}
                  </View>
                  <View style={styles.resultMain}>
                    <Text style={styles.resultTitle} numberOfLines={2}>{book.title}</Text>
                    <Text style={styles.resultAuthor} numberOfLines={1}>{book.author}</Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>
                      {[book.category, book.published_year ? String(book.published_year) : null, `${book.owner_count || 0} rafta`].filter(Boolean).join(" • ")}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Alternatif</Text>
          <Text style={styles.sectionTitle}>İnternetten bilgi çek</Text>
          <Text style={styles.helperText}>
            Kitap katalogda yoksa Google Books ve Open Library üzerinden kapak, ISBN ve yayın bilgisi ara.
          </Text>

          <Pressable
            style={[styles.externalButton, searchingExternal && styles.disabledButton]}
            onPress={searchExternal}
            disabled={searchingExternal}
          >
            {searchingExternal ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.externalButtonText}>İnternetten Bilgi Çek</Text>
            )}
          </Pressable>

          {externalError ? (
            <View style={styles.externalErrorBox}>
              <Text style={styles.externalErrorText}>{externalError}</Text>
            </View>
          ) : null}

          {externalResults.length > 0 ? (
            <View style={styles.resultList}>
              {externalResults.map((book) => (
                <Pressable
                  key={`${book.source}-${book.source_id}`}
                  style={styles.resultCard}
                  onPress={() => selectExternalBook(book)}
                >
                  <View style={styles.resultCover}>
                    {book.cover_url ? (
                      <Image source={{ uri: book.cover_url }} style={styles.resultCoverImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.resultFallback}>📗</Text>
                    )}
                  </View>
                  <View style={styles.resultMain}>
                    <Text style={styles.resultTitle} numberOfLines={2}>{book.title}</Text>
                    <Text style={styles.resultAuthor} numberOfLines={1}>{book.author}</Text>
                    <Text style={styles.resultMeta} numberOfLines={2}>
                      {[
                        book.source === "google_books" ? "Google Books" : "Open Library",
                        book.published_year ? String(book.published_year) : null,
                        book.isbn ? `ISBN: ${book.isbn}` : null,
                      ].filter(Boolean).join(" • ")}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>2. Adım</Text>
          <Text style={styles.sectionTitle}>Kitap bilgileri</Text>

          <View style={styles.scopeBox}>
            <Text style={styles.optionLabel}>Kitap nereye eklensin?</Text>
            <View style={styles.scopeGrid}>
              {libraryScopeOptions.map((option) => {
                const active = libraryScope === option.value;

                return (
                  <Pressable
                    key={option.value}
                    style={[styles.scopeCard, active && styles.activeScopeCard]}
                    onPress={() => setLibraryScope(option.value)}
                  >
                    <Text style={[styles.scopeTitle, active && styles.activeScopeText]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.scopeDescription, active && styles.activeScopeDescription]}>
                      {option.description}
                    </Text>
                    <Text style={[styles.scopeBadge, active && styles.activeScopeBadge]}>
                      {option.badge}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Input label="Kitap Adı" value={title} onChangeText={setTitle} placeholder="Kitap adı" editable={!selectedCatalogBook} />
          <Input label="Yazar" value={author} onChangeText={setAuthor} placeholder="Yazar adı" editable={!selectedCatalogBook} />
          <Input label="Kategori" value={category} onChangeText={setCategory} placeholder="Roman, ders kitabı..." editable={!selectedCatalogBook} />
          <Input label="ISBN" value={isbn} onChangeText={setIsbn} placeholder="İsteğe bağlı" editable={!selectedCatalogBook} />
          <Input label="Kapak URL" value={coverUrl} onChangeText={setCoverUrl} placeholder="https://..." editable={!selectedCatalogBook} autoCapitalize="none" />
          <Input label="Yayınevi" value={publisher} onChangeText={setPublisher} placeholder="İsteğe bağlı" editable={!selectedCatalogBook} />
          <Input label="Yayın Yılı" value={publishedYear} onChangeText={setPublishedYear} placeholder="Örn. 2020" editable={!selectedCatalogBook} keyboardType="numeric" />
          <Input
            label="Katalog Açıklaması"
            value={description}
            onChangeText={setDescription}
            placeholder="İsteğe bağlı kitap açıklaması"
            editable={!selectedCatalogBook}
            multiline
          />

          {coverUrl.trim() ? (
            <View style={styles.previewBox}>
              <View style={styles.previewCover}>
                <Image source={{ uri: coverUrl.trim() }} style={styles.previewCoverImage} contentFit="cover" />
              </View>
              <View style={styles.previewMain}>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {title.trim() || "Kapak önizlemesi"}
                </Text>
                <Text style={styles.previewText} numberOfLines={3}>
                  {description.trim() || "Kapak bağlantısı kaydedildiğinde kitap detayında gösterilecek."}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>3. Adım</Text>
          <Text style={styles.sectionTitle}>Kopya ve teslim bilgileri</Text>

          <Text style={styles.optionLabel}>Kitap Durumu</Text>
          <OptionRow items={conditions} value={condition} onChange={setCondition} />

          <Text style={styles.optionLabel}>Paylaşım Türü</Text>
          <OptionRow items={exchangeTypes} value={exchangeType} onChange={setExchangeType} />

          <View style={styles.mapInfoBox}>
            <View style={styles.mapInfoText}>
              <Text style={styles.mapInfoTitle}>
                {isPersonalLibrary ? "Kişisel görünürlük" : "Haritada görünürlük"}
              </Text>
              <Text style={styles.mapInfoDescription}>
                {isPersonalLibrary
                  ? "Sanal Kitaplık kayıtları arama, harita ve eşleşme sistemlerinde görünmez; paket kitap hakkını kullanmaz."
                  : "Harita ekranından konum izni verdiysen bu kitap paylaşım türüne açık olduğu için yaklaşık konumla listelenebilir."}
              </Text>
            </View>
            {!isPersonalLibrary ? (
              <Pressable style={styles.mapInfoButton} onPress={() => router.push("/map" as never)}>
                <Text style={styles.mapInfoButtonText}>Harita</Text>
              </Pressable>
            ) : null}
          </View>

          <Input
            label={isPersonalLibrary ? "Şehir (isteğe bağlı)" : "Şehir"}
            value={city}
            onChangeText={setCity}
            placeholder="Aydın"
          />
          <Input
            label={isPersonalLibrary ? "Üniversite (isteğe bağlı)" : "Üniversite"}
            value={university}
            onChangeText={setUniversity}
            placeholder="Üniversite adı"
          />
          <Input label="Açıklama / Not" value={note} onChangeText={setNote} placeholder="Teslim, takas veya kitap durumu notu" multiline />
        </View>

        {message ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.saveButton, (saving || Boolean(errorMessage)) && styles.disabledButton]}
          onPress={saveBook}
          disabled={saving || Boolean(errorMessage)}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isPersonalLibrary ? "Kitabı Sanal Kitaplığa Ekle" : "Kitabı Rafa Ekle"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({
  label,
  value,
  placeholder,
  onChangeText,
  editable = true,
  multiline,
  autoCapitalize = "sentences",
  keyboardType = "default",
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={[styles.input, multiline && styles.textArea, !editable && styles.disabledInput]}
        editable={editable}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function OptionRow({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.optionRow}>
      {items.map((item) => {
        const active = item.value === value;

        return (
          <Pressable
            key={item.value}
            style={[styles.optionChip, active && styles.activeOptionChip]}
            onPress={() => onChange(item.value)}
          >
            <Text style={[styles.optionChipText, active && styles.activeOptionChipText]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  loadingText: { marginTop: 10, color: MUTED, fontWeight: "800" },
  header: {
    borderRadius: 30,
    backgroundColor: GREEN,
    padding: 22,
    shadowColor: GREEN,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  backButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  eyebrow: { marginTop: 18, color: "#F5EBDD", fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { marginTop: 12, color: "#fff", fontSize: 30, lineHeight: 36, fontWeight: "900" },
  description: { marginTop: 10, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  card: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  scopeBox: { marginTop: 12, marginBottom: 12 },
  scopeGrid: { marginTop: 10, gap: 10 },
  scopeCard: {
    borderRadius: 20,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.10)",
    padding: 14,
  },
  activeScopeCard: { backgroundColor: GREEN, borderColor: GREEN },
  scopeTitle: { color: TEXT, fontSize: 14, fontWeight: "900" },
  activeScopeText: { color: "#FFFFFF" },
  scopeDescription: {
    marginTop: 5,
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  activeScopeDescription: { color: "rgba(255,255,255,0.76)" },
  scopeBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: GREEN,
    fontSize: 10,
    fontWeight: "900",
  },
  activeScopeBadge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    color: "#FFFFFF",
  },
  sectionEyebrow: { color: AMBER, fontSize: 11, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  sectionTitle: { marginTop: 7, color: TEXT, fontSize: 20, fontWeight: "900" },
  helperText: { marginTop: 6, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  searchRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  searchInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: BG,
    paddingHorizontal: 14,
    color: TEXT,
    fontWeight: "800",
  },
  searchButton: {
    minWidth: 72,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: { color: "#fff", fontWeight: "900" },
  selectedBox: { marginTop: 14, borderRadius: 20, backgroundColor: "rgba(46,125,91,0.1)", padding: 14 },
  selectedTitle: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  selectedText: { marginTop: 4, color: TEXT, fontSize: 13, fontWeight: "800" },
  clearButton: { marginTop: 10, alignSelf: "flex-start", borderRadius: 999, backgroundColor: CARD, paddingHorizontal: 12, paddingVertical: 8 },
  clearButtonText: { color: DARK_GREEN, fontSize: 11, fontWeight: "900" },
  resultList: { marginTop: 14, gap: 10 },
  resultCard: { borderRadius: 20, backgroundColor: BG, padding: 12, flexDirection: "row", gap: 12 },
  resultCover: { width: 50, height: 72, borderRadius: 14, overflow: "hidden", backgroundColor: CARD, alignItems: "center", justifyContent: "center" },
  resultCoverImage: { width: "100%", height: "100%" },
  resultFallback: { fontSize: 22 },
  resultMain: { flex: 1, minWidth: 0 },
  resultTitle: { color: TEXT, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  resultAuthor: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "800" },
  resultMeta: { marginTop: 7, color: GREEN, fontSize: 10, fontWeight: "900" },
  externalButton: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: AMBER,
    paddingVertical: 14,
    alignItems: "center",
  },
  externalButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  externalErrorBox: { marginTop: 12, borderRadius: 18, backgroundColor: "#FEF2F2", padding: 12 },
  externalErrorText: { color: "#991B1B", fontSize: 12, lineHeight: 18, fontWeight: "800" },
  previewBox: { marginTop: 14, borderRadius: 22, backgroundColor: BG, padding: 12, flexDirection: "row", gap: 12 },
  previewCover: {
    width: 64,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: CARD,
  },
  previewCoverImage: { width: "100%", height: "100%" },
  previewMain: { flex: 1, minWidth: 0 },
  previewTitle: { color: TEXT, fontSize: 15, lineHeight: 20, fontWeight: "900" },
  previewText: { marginTop: 6, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  inputGroup: { marginTop: 14 },
  inputLabel: { color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  input: {
    marginTop: 7,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: BG,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 14,
    fontWeight: "800",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.08)",
  },
  textArea: { minHeight: 110, paddingTop: 14, lineHeight: 20 },
  disabledInput: { opacity: 0.65 },
  optionLabel: { marginTop: 14, color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  optionRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: {
    borderRadius: 999,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  activeOptionChip: { backgroundColor: GREEN, borderColor: GREEN },
  optionChipText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  activeOptionChipText: { color: "#fff" },
  mapInfoBox: {
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: "#EAF5EF",
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.12)",
    gap: 12,
  },
  mapInfoText: { gap: 5 },
  mapInfoTitle: { color: TEXT, fontSize: 14, fontWeight: "900" },
  mapInfoDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  mapInfoButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  mapInfoButtonText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  messageCard: { marginTop: 16, borderRadius: 22, backgroundColor: "#FFFBEB", padding: 14, borderWidth: 1, borderColor: "#FDE68A" },
  messageText: { color: "#92400E", fontSize: 12, lineHeight: 18, fontWeight: "800" },
  errorCard: {
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: { color: "#B91C1C", fontSize: 15, fontWeight: "900" },
  errorText: { marginTop: 4, color: "#991B1B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  saveButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: GREEN,
    paddingVertical: 17,
    alignItems: "center",
  },
  disabledButton: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
});
