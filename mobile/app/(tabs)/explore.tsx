import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";

const PAGE_LIMIT = 40;

type BookInfo = {
  title: string | null;
  author: string | null;
  category: string | null;
};

type RawBookRow = {
  id: string;
  user_id: string;
  book_id: string | null;
  exchange_type: string | null;
  condition: string | null;
  status: string | null;
  created_at: string | null;
  books: BookInfo | BookInfo[] | null;
};

type OwnerInfo = {
  id: string;
  full_name: string | null;
  username: string | null;
  university: string | null;
  city: string | null;
  verification_status: string | null;
  trust_score: number | null;
};

type BookRow = {
  id: string;
  userId: string;
  bookId: string | null;
  title: string;
  author: string;
  category: string;
  exchangeType: string;
  condition: string;
  ownerName: string;
  ownerUniversity: string;
  ownerCity: string;
  isVerified: boolean;
  trustScore: number | null;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getExchangeLabel(value?: string | null) {
  if (value === "sell") return "Satış";
  if (value === "lend") return "Ödünç";
  if (value === "giveaway") return "Ücretsiz";
  if (value === "swap") return "Takas";
  return "Takas";
}

function getConditionLabel(value?: string | null) {
  if (value === "new") return "Yeni";
  if (value === "like_new") return "Yeni gibi";
  if (value === "good") return "İyi";
  if (value === "fair") return "Orta";
  if (value === "worn") return "Yıpranmış";
  return value || "Durum belirtilmemiş";
}

function getOwnerName(owner?: OwnerInfo) {
  return owner?.full_name || owner?.username || "KampüsRaf kullanıcısı";
}

function sanitizeSearch(value: string) {
  return value.trim().replace(/[,%]/g, " ").replace(/\s+/g, " ");
}

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const initialQuery = Array.isArray(params.q) ? params.q[0] || "" : params.q || "";

  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resultLabel = useMemo(() => {
    if (items.length === 0) return "Sonuç yok";
    if (items.length === 1) return "1 aktif kitap";
    return `${items.length} aktif kitap`;
  }, [items.length]);

  const ensureSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return null;
    }

    return user;
  }, []);

  async function findMatchingBookIds(search: string) {
    const cleanSearch = sanitizeSearch(search);

    if (!cleanSearch) {
      return null;
    }

    const like = `%${cleanSearch}%`;

    const { data, error } = await supabase
      .from("books")
      .select("id")
      .or(`title.ilike.${like},author.ilike.${like},category.ilike.${like}`)
      .limit(80);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((book) => String(book.id));
  }

  const loadBooks = useCallback(async (search: string) => {
    const user = await ensureSession();
    if (!user) return;

    setErrorMessage(null);

    try {
      const matchingBookIds = await findMatchingBookIds(search);

      if (matchingBookIds && matchingBookIds.length === 0) {
        setItems([]);
        return;
      }

      let request = supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          book_id,
          exchange_type,
          condition,
          status,
          created_at,
          books (
            title,
            author,
            category
          )
        `
        )
        .in("status", ["active", "mevcut"])
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT);

      if (matchingBookIds) {
        request = request.in("book_id", matchingBookIds);
      }

      const { data: bookRows, error: bookError } = await request;

      if (bookError) {
        throw new Error(bookError.message);
      }

      const rows = (bookRows || []) as unknown as RawBookRow[];
      const ownerIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));

      const { data: ownersData, error: ownersError } =
        ownerIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name, username, university, city, verification_status, trust_score")
              .in("id", ownerIds)
          : { data: [], error: null };

      if (ownersError) {
        throw new Error(ownersError.message);
      }

      const ownerMap = new Map(
        ((ownersData || []) as OwnerInfo[]).map((owner) => [owner.id, owner])
      );

      const mappedItems = rows.map((row) => {
        const book = first(row.books);
        const owner = ownerMap.get(row.user_id);

        return {
          id: row.id,
          userId: row.user_id,
          bookId: row.book_id,
          title: book?.title || "Kitap adı yok",
          author: book?.author || "Yazar belirtilmemiş",
          category: book?.category || "Kategori yok",
          exchangeType: getExchangeLabel(row.exchange_type),
          condition: getConditionLabel(row.condition),
          ownerName: getOwnerName(owner),
          ownerUniversity: owner?.university || "Üniversite belirtilmemiş",
          ownerCity: owner?.city || "Şehir belirtilmemiş",
          isVerified: owner?.verification_status === "verified",
          trustScore: owner?.trust_score ?? null,
        };
      });

      setItems(mappedItems);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Kitaplar yüklenirken bir sorun oluştu.";

      setErrorMessage(message);
      setItems([]);
    }
  }, [ensureSession]);

  useEffect(() => {
    loadBooks(initialQuery).finally(() => setLoading(false));
  }, [initialQuery, loadBooks]);

  async function onSearch() {
    setSearching(true);
    await loadBooks(query);
    setSearching(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadBooks(query);
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Kitaplar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Kitap Ara</Text>
        <Text style={styles.title}>Kampüsteki aktif kitapları keşfet.</Text>
        <Text style={styles.description}>
          Başlık, yazar veya kategoriye göre ara; kitap sahibi ve konum bilgilerini hızlıca gör.
        </Text>

        <View style={styles.headerStats}>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{resultLabel}</Text>
            <Text style={styles.headerStatLabel}>Görüntülenen</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{PAGE_LIMIT}</Text>
            <Text style={styles.headerStatLabel}>Liste limiti</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchCard}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Kitap, yazar veya kategori yaz..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          returnKeyType="search"
          autoCapitalize="none"
          onSubmitEditing={onSearch}
        />
        <Pressable style={styles.searchButton} onPress={onSearch} disabled={searching}>
          {searching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Ara</Text>
          )}
        </Pressable>
      </View>

      {query.trim() ? (
        <Pressable
          style={styles.clearButton}
          onPress={() => {
            setQuery("");
            loadBooks("");
          }}
        >
          <Text style={styles.clearButtonText}>Aramayı temizle</Text>
        </Pressable>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Kitaplar yüklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={onSearch}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.list}>
        {items.length === 0 && !errorMessage ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔎</Text>
            <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
            <Text style={styles.emptyText}>
              Başka bir kitap, yazar veya kategori adıyla tekrar ara.
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => {
                router.push({
                  pathname: "/requests/add",
                  params: { title: query.trim() },
                } as never);
              }}
            >
              <Text style={styles.emptyButtonText}>Arama Kaydı Aç</Text>
            </Pressable>
          </View>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.id}
              style={styles.bookCard}
              onPress={() => {
                router.push({
                  pathname: "/books/[userBookId]",
                  params: { userBookId: item.id },
                } as never);
              }}
            >
              <View style={styles.bookTopRow}>
                <View style={styles.bookIconBox}>
                  <Text style={styles.bookIcon}>📚</Text>
                </View>

                <View style={styles.bookMain}>
                  <Text style={styles.bookTitle}>{item.title}</Text>
                  <Text style={styles.bookAuthor}>{item.author}</Text>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <Text style={styles.badge}>{item.category}</Text>
                <Text style={styles.badgeAmber}>{item.exchangeType}</Text>
                <Text style={styles.badgeNeutral}>{item.condition}</Text>
              </View>

              <View style={styles.ownerBox}>
                <View style={styles.ownerHeaderRow}>
                  <Text style={styles.ownerName}>{item.ownerName}</Text>
                  {item.isVerified ? <Text style={styles.verifiedBadge}>🎓 Doğrulanmış</Text> : null}
                </View>

                <Text style={styles.ownerMeta}>{item.ownerUniversity}</Text>
                <Text style={styles.ownerMeta}>{item.ownerCity}</Text>

                {item.trustScore !== null ? (
                  <Text style={styles.trustText}>Güven puanı: {item.trustScore}</Text>
                ) : null}
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingBottom: 110 },
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
  eyebrow: {
    color: "#F5EBDD",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { marginTop: 12, color: "#fff", fontSize: 29, lineHeight: 35, fontWeight: "900" },
  description: {
    marginTop: 10,
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
  },
  headerStats: { marginTop: 16, flexDirection: "row", gap: 10 },
  headerStatBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 12,
  },
  headerStatValue: { color: "#fff", fontSize: 16, fontWeight: "900" },
  headerStatLabel: { marginTop: 3, color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: "800" },
  searchCard: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  input: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: BG,
    paddingHorizontal: 14,
    color: TEXT,
    fontWeight: "800",
  },
  searchButton: {
    minWidth: 76,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: { color: "#fff", fontWeight: "900" },
  clearButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  clearButtonText: { color: GREEN, fontSize: 12, fontWeight: "900" },
  list: { marginTop: 16, gap: 12 },
  bookCard: {
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  bookTopRow: { flexDirection: "row", gap: 12 },
  bookIconBox: {
    height: 48,
    width: 48,
    borderRadius: 18,
    backgroundColor: "rgba(46,125,91,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  bookIcon: { fontSize: 24 },
  bookMain: { flex: 1, minWidth: 0 },
  bookTitle: { color: TEXT, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  bookAuthor: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "700" },
  badgeRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },
  badgeAmber: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: "#B45309",
    fontSize: 11,
    fontWeight: "900",
  },
  badgeNeutral: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: "#475569",
    fontSize: 11,
    fontWeight: "900",
  },
  ownerBox: { marginTop: 13, borderRadius: 18, backgroundColor: BG, padding: 12 },
  ownerHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  ownerName: { flex: 1, color: TEXT, fontSize: 13, fontWeight: "900" },
  verifiedBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: GREEN,
    fontSize: 10,
    fontWeight: "900",
  },
  ownerMeta: { marginTop: 5, color: MUTED, fontSize: 12, fontWeight: "700" },
  trustText: { marginTop: 7, color: GREEN, fontSize: 11, fontWeight: "900" },
  errorCard: { marginTop: 16, borderRadius: 24, backgroundColor: "#FEF2F2", padding: 16 },
  errorTitle: { color: "#B91C1C", fontSize: 16, fontWeight: "900" },
  errorText: { marginTop: 6, color: "#991B1B", fontSize: 13, lineHeight: 20, fontWeight: "700" },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  emptyCard: { borderRadius: 26, backgroundColor: "#fff", padding: 24, alignItems: "center" },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "700", textAlign: "center" },
  emptyButton: { marginTop: 16, borderRadius: 999, backgroundColor: GREEN, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
