import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
const DARK_GREEN = "#25684C";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";

const shelfSegments = [
  { label: "Tümü", value: "all" },
  { label: "Aktif", value: "active" },
  { label: "Takas", value: "takas" },
  { label: "Ödünç", value: "odunc" },
  { label: "Arşiv", value: "archive" },
];

type RelatedBook = {
  title: string | null;
  author: string | null;
  category: string | null;
  cover_url: string | null;
};

type UserBookRow = {
  id: string;
  condition: string | null;
  exchange_type: string | null;
  status: string | null;
  custom_title: string | null;
  custom_author: string | null;
  image_url: string | null;
  note: string | null;
  city: string | null;
  university: string | null;
  created_at: string | null;
  books: RelatedBook | RelatedBook[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getBookInfo(userBook: UserBookRow) {
  const book = first(userBook.books);

  return {
    title: userBook.custom_title || book?.title || "İsimsiz Kitap",
    author: userBook.custom_author || book?.author || "Yazar bilgisi yok",
    category: book?.category || "Kategori yok",
    image: userBook.image_url || book?.cover_url || null,
  };
}

function getConditionLabel(value?: string | null) {
  if (value === "new" || value === "yeni") return "Yeni";
  if (value === "like_new") return "Yeni gibi";
  if (value === "good" || value === "temiz") return "Temiz";
  if (value === "fair" || value === "orta" || value === "az_kullanilmis") return "Az kullanılmış";
  if (value === "worn" || value === "yipranmis") return "Yıpranmış";
  return value || "Durum yok";
}

function getExchangeLabel(value?: string | null) {
  if (value === "sell" || value === "satis") return "Satış";
  if (value === "lend" || value === "odunc") return "Ödünç";
  if (value === "giveaway" || value === "bagis") return "Bağış";
  if (value === "swap" || value === "takas") return "Takas";
  return "Takas";
}

function getStatusLabel(value?: string | null) {
  if (value === "active" || value === "mevcut") return "Mevcut";
  if (value === "inactive" || value === "pasif") return "Pasif";
  if (value === "reserved" || value === "rezerve") return "Rezerve";
  if (value === "exchanged" || value === "takaslandi") return "Takaslandı";
  if (value === "given" || value === "verildi") return "Verildi";
  return value || "Durum yok";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isVisibleStatus(value?: string | null) {
  return value === "active" || value === "mevcut";
}

function normalizeSearchText(value?: string | null) {
  return (value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getShelfMood(item: UserBookRow) {
  if (!isVisibleStatus(item.status)) return "Arşivde";
  if (item.exchange_type === "odunc" || item.exchange_type === "lend") return "Ödünç verilebilir";
  if (item.exchange_type === "satis" || item.exchange_type === "sell") return "Satışta";
  if (item.exchange_type === "bagis" || item.exchange_type === "giveaway") return "Bağışlanabilir";
  return "Paylaşmaya hazır";
}

function getLibraryQuality(item: UserBookRow) {
  const book = getBookInfo(item);
  let score = 40;

  if (book.image) score += 18;
  if (item.note && item.note.length > 20) score += 16;
  if (item.city) score += 8;
  if (item.university) score += 8;
  if (isVisibleStatus(item.status)) score += 10;

  return Math.min(score, 100);
}

function matchesShelf(item: UserBookRow, shelf: string) {
  if (shelf === "all") return true;
  if (shelf === "active") return isVisibleStatus(item.status);
  if (shelf === "archive") return !isVisibleStatus(item.status);
  if (shelf === "odunc") return item.exchange_type === "odunc" || item.exchange_type === "lend";

  return item.exchange_type === shelf;
}

export default function MyBooksScreen() {
  const [items, setItems] = useState<UserBookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedShelf, setSelectedShelf] = useState("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const loadBooks = useCallback(async () => {
    setErrorMessage(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (sessionError) {
      setErrorMessage(sessionError.message);
    }

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("user_books")
      .select(
        `
        id,
        condition,
        exchange_type,
        status,
        custom_title,
        custom_author,
        image_url,
        note,
        city,
        university,
        created_at,
        books (
          title,
          author,
          category,
          cover_url
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setItems([]);
      return;
    }

    setItems((data || []) as unknown as UserBookRow[]);
  }, []);

  useEffect(() => {
    loadBooks().finally(() => setLoading(false));
  }, [loadBooks]);

  async function onRefresh() {
    setRefreshing(true);
    await loadBooks();
    setRefreshing(false);
  }

  async function updateBookVisibility(item: UserBookRow) {
    if (!userId || updatingId) return;

    const nextStatus = isVisibleStatus(item.status) ? "pasif" : "mevcut";
    const nextActive = nextStatus === "mevcut";

    setUpdatingId(item.id);

    const { error } = await supabase
      .from("user_books")
      .update({
        status: nextStatus,
        is_active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("user_id", userId);

    setUpdatingId(null);

    if (error) {
      Alert.alert("Raf güncellenemedi", error.message);
      return;
    }

    setItems((current) =>
      current.map((book) =>
        book.id === item.id ? { ...book, status: nextStatus } : book
      )
    );
  }

  const stats = useMemo(() => {
    const visible = items.filter((item) => isVisibleStatus(item.status)).length;
    const swap = items.filter((item) => item.exchange_type === "takas" || item.exchange_type === "swap").length;
    const lend = items.filter((item) => item.exchange_type === "odunc" || item.exchange_type === "lend").length;
    const withCover = items.filter((item) => getBookInfo(item).image).length;
    const withNote = items.filter((item) => item.note && item.note.length > 8).length;
    const archive = items.length - visible;
    const quality =
      items.length > 0
        ? Math.round(items.reduce((total, item) => total + getLibraryQuality(item), 0) / items.length)
        : 0;

    return { total: items.length, visible, swap, lend, withCover, withNote, archive, quality };
  }, [items]);

  const displayedItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    return items.filter((item) => {
      if (!matchesShelf(item, selectedShelf)) return false;
      if (!normalizedQuery) return true;

      const book = getBookInfo(item);
      const haystack = normalizeSearchText(
        [
          book.title,
          book.author,
          book.category,
          item.note,
          item.city,
          item.university,
          getConditionLabel(item.condition),
          getExchangeLabel(item.exchange_type),
          getStatusLabel(item.status),
        ].join(" ")
      );

      return haystack.includes(normalizedQuery);
    });
  }, [items, query, selectedShelf]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Rafın yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Benim Rafım</Text>
        <Text style={styles.title}>Kitaplarını mobilde yönet.</Text>
        <Text style={styles.description}>
          Rafa eklediğin kitapları görüntüle, detayına git veya görünürlüğünü hızlıca değiştir.
        </Text>

        <View style={styles.headerStats}>
          <HeaderStat value={stats.total} label="Toplam" />
          <HeaderStat value={stats.visible} label="Aktif" />
          <HeaderStat value={stats.withCover} label="Kapaklı" />
          <HeaderStat value={`%${stats.quality}`} label="Kalite" />
        </View>
      </View>

      <View style={styles.libraryPulse}>
        <View>
          <Text style={styles.libraryPulseLabel}>Sanal kütüphane özeti</Text>
          <Text style={styles.libraryPulseTitle}>
            {stats.swap + stats.lend} kitap paylaşıma hazır, {stats.archive} kayıt arşivde.
          </Text>
        </View>
        <Text style={styles.libraryPulseBadge}>{stats.withNote} not</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/books/add" as never)}>
          <Text style={styles.primaryButtonText}>📚 Kitap Ekle</Text>
        </Pressable>

        <Pressable style={styles.outlineButton} onPress={() => router.push("/explore" as never)}>
          <Text style={styles.outlineButtonText}>Kitap Ara</Text>
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Kitap, yazar, kategori veya not ara"
        placeholderTextColor="#94A3B8"
        style={styles.searchInput}
      />

      <View style={styles.viewSwitch}>
        <Pressable
          style={[styles.viewSwitchButton, viewMode === "cards" && styles.activeViewSwitchButton]}
          onPress={() => setViewMode("cards")}
        >
          <Text style={[styles.viewSwitchText, viewMode === "cards" && styles.activeViewSwitchText]}>
            Kart
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewSwitchButton, viewMode === "list" && styles.activeViewSwitchButton]}
          onPress={() => setViewMode("list")}
        >
          <Text style={[styles.viewSwitchText, viewMode === "list" && styles.activeViewSwitchText]}>
            Liste
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.segmentRow}
      >
        {shelfSegments.map((segment) => {
          const active = selectedShelf === segment.value;

          return (
            <Pressable
              key={segment.value}
              style={[styles.segmentButton, active && styles.activeSegmentButton]}
              onPress={() => setSelectedShelf(segment.value)}
            >
              <Text style={[styles.segmentText, active && styles.activeSegmentText]}>
                {segment.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Raf yüklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>Rafın henüz boş</Text>
            <Text style={styles.emptyText}>
              İlk kitabını eklediğinde diğer öğrenciler arama ekranında seni görebilir.
            </Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push("/books/add" as never)}>
              <Text style={styles.emptyButtonText}>İlk Kitabımı Ekle</Text>
            </Pressable>
          </View>
        ) : displayedItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyTitle}>Bu filtrelerde kitap yok</Text>
            <Text style={styles.emptyText}>
              Aramayı temizleyebilir veya başka bir raf segmenti seçebilirsin.
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => {
                setQuery("");
                setSelectedShelf("all");
              }}
            >
              <Text style={styles.emptyButtonText}>Filtreleri Temizle</Text>
            </Pressable>
          </View>
        ) : viewMode === "list" ? (
          displayedItems.map((item) => {
            const book = getBookInfo(item);
            const quality = getLibraryQuality(item);

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.compactRow, pressed && styles.pressedCard]}
                onPress={() => {
                  router.push({
                    pathname: "/books/[userBookId]",
                    params: { userBookId: item.id },
                  } as never);
                }}
              >
                <View style={styles.compactCover}>
                  {book.image ? (
                    <Image source={{ uri: book.image }} style={styles.coverImage} contentFit="cover" />
                  ) : (
                    <Text style={styles.compactCoverFallback}>📖</Text>
                  )}
                </View>

                <View style={styles.compactMain}>
                  <Text style={styles.compactTitle} numberOfLines={1}>
                    {book.title}
                  </Text>
                  <Text style={styles.compactAuthor} numberOfLines={1}>
                    {book.author}
                  </Text>
                  <Text style={styles.compactMeta} numberOfLines={1}>
                    {getExchangeLabel(item.exchange_type)} • {getStatusLabel(item.status)} • %{quality}
                  </Text>
                </View>

                <Text style={styles.compactDetail}>Detay</Text>
              </Pressable>
            );
          })
        ) : (
          displayedItems.map((item) => {
            const book = getBookInfo(item);
            const visible = isVisibleStatus(item.status);
            const quality = getLibraryQuality(item);

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.card, pressed && styles.pressedCard]}
                onPress={() => {
                  router.push({
                    pathname: "/books/[userBookId]",
                    params: { userBookId: item.id },
                  } as never);
                }}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.cover}>
                    {book.image ? (
                      <Image source={{ uri: book.image }} style={styles.coverImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.coverFallback}>📖</Text>
                    )}
                  </View>

                  <View style={styles.cardMain}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={styles.cardAuthor} numberOfLines={1}>
                      {book.author}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {book.category} • {formatDate(item.created_at)}
                    </Text>
                    <Text style={styles.shelfMood} numberOfLines={1}>
                      {getShelfMood(item)}
                    </Text>
                  </View>
                </View>

                {item.note ? (
                  <Text style={styles.noteText} numberOfLines={2}>
                    {item.note}
                  </Text>
                ) : null}

                <View style={styles.badgeRow}>
                  <Text style={[styles.badge, visible && styles.activeBadge]}>
                    {getStatusLabel(item.status)}
                  </Text>
                  <Text style={styles.badge}>{getExchangeLabel(item.exchange_type)}</Text>
                  <Text style={styles.badge}>{getConditionLabel(item.condition)}</Text>
                </View>

                <View style={styles.qualityBox}>
                  <View style={styles.qualityHeader}>
                    <Text style={styles.qualityLabel}>Kütüphane kaydı</Text>
                    <Text style={styles.qualityValue}>%{quality}</Text>
                  </View>
                  <View style={styles.qualityTrack}>
                    <View style={[styles.qualityFill, { width: `${quality}%` }]} />
                  </View>
                </View>

                <View style={styles.locationBox}>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.university || "Üniversite bilgisi yok"}
                  </Text>
                  <Text style={styles.locationSubText} numberOfLines={1}>
                    {item.city || "Şehir bilgisi yok"}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.secondaryAction}
                    onPress={(event) => {
                      event.stopPropagation();
                      updateBookVisibility(item);
                    }}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id ? (
                      <ActivityIndicator color={DARK_GREEN} size="small" />
                    ) : (
                      <Text style={styles.secondaryActionText}>
                        {visible ? "Pasife Al" : "Aktifleştir"}
                      </Text>
                    )}
                  </Pressable>

                  <Text style={styles.detailText}>Detay →</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function HeaderStat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.headerStatBox}>
      <Text style={styles.headerStatValue}>{value}</Text>
      <Text style={styles.headerStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingBottom: 120 },
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
  eyebrow: { color: "#F5EBDD", fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { marginTop: 12, color: "#fff", fontSize: 29, lineHeight: 35, fontWeight: "900" },
  description: { marginTop: 10, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  headerStats: { marginTop: 18, flexDirection: "row", gap: 8 },
  headerStatBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 12,
    alignItems: "center",
  },
  headerStatValue: { color: "#fff", fontSize: 19, fontWeight: "900" },
  headerStatLabel: { marginTop: 3, color: "rgba(255,255,255,0.68)", fontSize: 10, fontWeight: "900" },
  libraryPulse: {
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: "#10251C",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  libraryPulseLabel: {
    color: "#F5EBDD",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  libraryPulseTitle: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
  },
  libraryPulseBadge: {
    marginLeft: "auto",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  actionRow: { marginTop: 16, flexDirection: "row", gap: 10 },
  primaryButton: {
    flex: 1.3,
    borderRadius: 18,
    backgroundColor: GREEN,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  outlineButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.14)",
    paddingVertical: 15,
    alignItems: "center",
  },
  outlineButtonText: { color: DARK_GREEN, fontSize: 13, fontWeight: "900" },
  searchInput: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.12)",
    paddingHorizontal: 16,
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },
  viewSwitch: {
    marginTop: 12,
    flexDirection: "row",
    borderRadius: 999,
    backgroundColor: CARD,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.1)",
  },
  viewSwitchButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeViewSwitchButton: { backgroundColor: GREEN },
  viewSwitchText: { color: MUTED, fontSize: 12, fontWeight: "900" },
  activeViewSwitchText: { color: "#FFFFFF" },
  segmentRow: { gap: 8, paddingTop: 12, paddingBottom: 2 },
  segmentButton: {
    borderRadius: 999,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  activeSegmentButton: { backgroundColor: GREEN, borderColor: GREEN },
  segmentText: { color: MUTED, fontSize: 11, fontWeight: "900" },
  activeSegmentText: { color: "#FFFFFF" },
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
  list: { marginTop: 16, gap: 12 },
  card: {
    borderRadius: 26,
    backgroundColor: CARD,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.07)",
  },
  pressedCard: { transform: [{ scale: 0.99 }], opacity: 0.92 },
  compactRow: {
    borderRadius: 22,
    backgroundColor: CARD,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.07)",
  },
  compactCover: {
    width: 46,
    height: 66,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  compactCoverFallback: { fontSize: 20 },
  compactMain: { flex: 1, minWidth: 0 },
  compactTitle: { color: TEXT, fontSize: 15, fontWeight: "900" },
  compactAuthor: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "800" },
  compactMeta: { marginTop: 6, color: GREEN, fontSize: 10, fontWeight: "900" },
  compactDetail: { color: GREEN, fontSize: 11, fontWeight: "900" },
  cardTopRow: { flexDirection: "row", gap: 12 },
  cover: {
    width: 72,
    height: 104,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: { width: "100%", height: "100%" },
  coverFallback: { fontSize: 30 },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { color: TEXT, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  cardAuthor: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "800" },
  cardMeta: { marginTop: 8, color: GREEN, fontSize: 11, fontWeight: "900" },
  shelfMood: {
    alignSelf: "flex-start",
    marginTop: 9,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#B45309",
    fontSize: 10,
    fontWeight: "900",
  },
  noteText: { marginTop: 12, borderRadius: 18, backgroundColor: BG, padding: 12, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  badgeRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
  },
  activeBadge: { backgroundColor: "rgba(46,125,91,0.1)", color: GREEN },
  qualityBox: { marginTop: 12, borderRadius: 18, backgroundColor: "#F8FAFC", padding: 12 },
  qualityHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qualityLabel: { color: MUTED, fontSize: 11, fontWeight: "900" },
  qualityValue: { color: GREEN, fontSize: 11, fontWeight: "900" },
  qualityTrack: {
    marginTop: 8,
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  qualityFill: { height: "100%", borderRadius: 999, backgroundColor: GREEN },
  locationBox: { marginTop: 12, borderRadius: 18, backgroundColor: "#FFFBEB", padding: 12 },
  locationText: { color: "#92400E", fontSize: 12, fontWeight: "900" },
  locationSubText: { marginTop: 4, color: "#B45309", fontSize: 11, fontWeight: "800" },
  cardActions: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  secondaryAction: {
    minWidth: 108,
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  secondaryActionText: { color: DARK_GREEN, fontSize: 11, fontWeight: "900" },
  detailText: { marginLeft: "auto", color: GREEN, fontSize: 12, fontWeight: "900" },
  emptyCard: { borderRadius: 26, backgroundColor: CARD, padding: 24, alignItems: "center" },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 6, color: MUTED, fontSize: 13, fontWeight: "700", lineHeight: 20, textAlign: "center" },
  emptyButton: { marginTop: 16, borderRadius: 999, backgroundColor: GREEN, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
