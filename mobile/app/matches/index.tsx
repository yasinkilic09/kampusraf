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
  View,
} from "react-native";

import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const DARK_GREEN = "#25684C";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";

type ProfileSummary = {
  full_name: string | null;
  username: string | null;
  university: string | null;
  city: string | null;
  trust_score: number | null;
  verification_status: string | null;
};

type RequestSummary = {
  title: string | null;
  author: string | null;
  category: string | null;
  city: string | null;
  university: string | null;
  note: string | null;
  status: string | null;
};

type RelatedBook = {
  title: string | null;
  author: string | null;
  category: string | null;
  cover_url: string | null;
};

type UserBookSummary = {
  id: string;
  custom_title: string | null;
  custom_author: string | null;
  image_url: string | null;
  city: string | null;
  university: string | null;
  condition: string | null;
  exchange_type: string | null;
  books: RelatedBook | RelatedBook[] | null;
};

type MatchRow = {
  id: string;
  request_id: string;
  user_book_id: string;
  requester_id: string;
  owner_id: string;
  match_score: number | null;
  match_level: string | null;
  match_reason: string | null;
  score_breakdown: Record<string, unknown> | null;
  status: string | null;
  created_at: string | null;
  book_requests: RequestSummary | RequestSummary[] | null;
  user_books: UserBookSummary | UserBookSummary[] | null;
  owner: ProfileSummary | ProfileSummary[] | null;
  requester: ProfileSummary | ProfileSummary[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getScorePercent(score?: number | null) {
  const value = Number(score || 0);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(value), 100));
}

function getDisplayName(profile?: ProfileSummary | null) {
  return profile?.full_name || profile?.username || "KampüsRaf kullanıcısı";
}

function getLevelLabel(level?: string | null) {
  if (level === "super") return "Süper";
  if (level === "strong") return "Güçlü";
  if (level === "good") return "İyi";
  return "Normal";
}

function getStatusLabel(status?: string | null) {
  if (status === "pending") return "Beklemede";
  if (status === "contacted") return "İletişime geçildi";
  if (status === "completed") return "Tamamlandı";
  if (status === "rejected") return "Reddedildi";
  return status || "Durum yok";
}

function getExchangeLabel(value?: string | null) {
  if (value === "satis" || value === "sell") return "Satış";
  if (value === "odunc" || value === "lend") return "Ödünç";
  if (value === "bagis" || value === "giveaway") return "Bağış";
  return "Takas";
}

function getNumberFromBreakdown(breakdown: Record<string, unknown> | null | undefined, key: string) {
  const value = breakdown?.[key];
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getDistanceSignal(breakdown: Record<string, unknown> | null | undefined) {
  const distancePoints = getNumberFromBreakdown(breakdown, "distance_points");
  const distanceKm = getNumberFromBreakdown(breakdown, "distance_km");
  const radiusKm = getNumberFromBreakdown(breakdown, "distance_radius_km");

  if (!distancePoints || !distanceKm) return null;

  return {
    points: Math.round(distancePoints),
    detail: radiusKm
      ? `${distanceKm.toFixed(1)} km / ${Math.round(radiusKm)} km tercih`
      : `${distanceKm.toFixed(1)} km yakininda`,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(value));
}

export default function MatchesScreen() {
  const [items, setItems] = useState<MatchRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    setErrorMessage(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (sessionError) setErrorMessage(sessionError.message);

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from("book_matches")
      .select(
        `
        id,
        request_id,
        user_book_id,
        requester_id,
        owner_id,
        match_score,
        match_level,
        match_reason,
        score_breakdown,
        status,
        created_at,
        book_requests (
          title,
          author,
          category,
          city,
          university,
          note,
          status
        ),
        user_books (
          id,
          custom_title,
          custom_author,
          image_url,
          city,
          university,
          condition,
          exchange_type,
          books (
            title,
            author,
            category,
            cover_url
          )
        ),
        owner:profiles!book_matches_owner_id_fkey (
          full_name,
          username,
          university,
          city,
          trust_score,
          verification_status
        ),
        requester:profiles!book_matches_requester_id_fkey (
          full_name,
          username,
          university,
          city,
          trust_score,
          verification_status
        )
      `
      )
      .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order("match_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      setErrorMessage(error.message);
      setItems([]);
      return;
    }

    setItems((data || []) as unknown as MatchRow[]);
  }, []);

  useEffect(() => {
    loadMatches().finally(() => setLoading(false));
  }, [loadMatches]);

  async function onRefresh() {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  }

  async function startMatchConversation(match: MatchRow) {
    if (!currentUserId || startingId) return;

    const otherUserId = match.requester_id === currentUserId ? match.owner_id : match.requester_id;

    setStartingId(match.id);

    const { data: existingConversations, error: existingError } = await supabase
      .from("conversations")
      .select("id, user_one_id, user_two_id")
      .eq("user_book_id", match.user_book_id)
      .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`);

    if (existingError) {
      setStartingId(null);
      Alert.alert("Sohbet başlatılamadı", existingError.message);
      return;
    }

    const existingConversation = existingConversations?.find((conversation) => {
      return (
        (conversation.user_one_id === currentUserId && conversation.user_two_id === otherUserId) ||
        (conversation.user_one_id === otherUserId && conversation.user_two_id === currentUserId)
      );
    });

    if (existingConversation) {
      await supabase.from("book_matches").update({ status: "contacted" }).eq("id", match.id);
      setStartingId(null);
      router.push({
        pathname: "/messages/[userId]",
        params: { userId: otherUserId, conversationId: existingConversation.id },
      } as never);
      return;
    }

    const now = new Date().toISOString();
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        user_one_id: currentUserId,
        user_two_id: otherUserId,
        user_book_id: match.user_book_id,
        last_message: "Eşleşme üzerinden sohbet başlatıldı.",
        last_message_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (error || !conversation) {
      setStartingId(null);
      Alert.alert("Sohbet başlatılamadı", error?.message || "Yeni sohbet oluşturulamadı.");
      return;
    }

    await supabase.from("book_matches").update({ status: "contacted" }).eq("id", match.id);
    setStartingId(null);
    router.push({
      pathname: "/messages/[userId]",
      params: { userId: otherUserId, conversationId: conversation.id },
    } as never);
  }

  const stats = useMemo(() => {
    const strong = items.filter((item) => item.match_level === "super" || item.match_level === "strong").length;
    const pending = items.filter((item) => item.status === "pending").length;
    const best = items.reduce((highest, item) => Math.max(highest, getScorePercent(item.match_score)), 0);
    return { total: items.length, strong, pending, best };
  }, [items]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Eşleşmeler yükleniyor...</Text>
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
        <Text style={styles.eyebrow}>Eşleşmeler</Text>
        <Text style={styles.title}>Kitap fırsatlarını yakala.</Text>
        <Text style={styles.description}>
          Arama kayıtların ve rafındaki kitaplar üzerinden oluşan akıllı eşleşmeleri takip et.
        </Text>

        <View style={styles.headerStats}>
          <HeaderStat value={stats.total} label="Toplam" />
          <HeaderStat value={stats.strong} label="Güçlü" />
          <HeaderStat value={stats.pending} label="Bekleyen" />
          <HeaderStat value={stats.best} label="En iyi %" />
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/requests/add" as never)}>
          <Text style={styles.primaryButtonText}>🔎 Arama Kaydı Aç</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => router.push("/books/add" as never)}>
          <Text style={styles.outlineButtonText}>Kitap Ekle</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Eşleşmeler yüklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyTitle}>Henüz eşleşme yok</Text>
            <Text style={styles.emptyText}>
              Bir arama kaydı aç veya rafına kitap ekle; uyumlu kayıtlar burada görünecek.
            </Text>
          </View>
        ) : (
          items.map((match) => {
            const request = first(match.book_requests);
            const userBook = first(match.user_books);
            const relatedBook = first(userBook?.books);
            const owner = first(match.owner);
            const requester = first(match.requester);
            const isRequester = match.requester_id === currentUserId;
            const otherPerson = isRequester ? owner : requester;
            const score = getScorePercent(match.match_score);
            const distanceSignal = getDistanceSignal(match.score_breakdown);
            const bookTitle = userBook?.custom_title || relatedBook?.title || "Kitap bilgisi yok";
            const bookAuthor = userBook?.custom_author || relatedBook?.author || "Yazar bilgisi yok";
            const image = userBook?.image_url || relatedBook?.cover_url || null;

            return (
              <View key={match.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Pressable
                    style={styles.cover}
                    onPress={() => {
                      router.push({
                        pathname: "/books/[userBookId]",
                        params: { userBookId: match.user_book_id },
                      } as never);
                    }}
                  >
                    {image ? (
                      <Image source={{ uri: image }} style={styles.coverImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.coverFallback}>📖</Text>
                    )}
                  </Pressable>

                  <View style={styles.cardMain}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.levelBadge}>{getLevelLabel(match.match_level)}</Text>
                      <Text style={styles.scoreBadge}>%{score}</Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{bookTitle}</Text>
                    <Text style={styles.cardAuthor} numberOfLines={1}>{bookAuthor}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {getExchangeLabel(userBook?.exchange_type)} • {getStatusLabel(match.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestBox}>
                  <Text style={styles.requestEyebrow}>
                    {isRequester ? "Aradığın kayıt" : "Bu kitapla eşleşen arama"}
                  </Text>
                  <Text style={styles.requestTitle} numberOfLines={2}>{request?.title || "Arama kaydı"}</Text>
                  {request?.author ? <Text style={styles.requestMeta}>{request.author}</Text> : null}
                </View>

                <View style={styles.personBox}>
                  <Text style={styles.personLabel}>Karşı taraf</Text>
                  <Text style={styles.personName} numberOfLines={1}>{getDisplayName(otherPerson)}</Text>
                  <Text style={styles.personMeta} numberOfLines={1}>
                    {[otherPerson?.university, otherPerson?.city].filter(Boolean).join(" • ") || "Profil bilgisi yok"}
                  </Text>
                </View>

                {match.match_reason ? (
                  <Text style={styles.reasonText} numberOfLines={3}>{match.match_reason}</Text>
                ) : null}

                {distanceSignal ? (
                  <View style={styles.signalCard}>
                    <View style={styles.signalContent}>
                      <Text style={styles.signalLabel}>Harita yakinligi</Text>
                      <Text style={styles.signalDetail}>{distanceSignal.detail}</Text>
                    </View>
                    <Text style={styles.signalPoints}>+{distanceSignal.points}</Text>
                  </View>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.chatButton}
                    onPress={() => startMatchConversation(match)}
                    disabled={startingId === match.id}
                  >
                    {startingId === match.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.chatButtonText}>Mesaj Gönder</Text>
                    )}
                  </Pressable>
                  <Text style={styles.dateText}>{formatDate(match.created_at)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function HeaderStat({ value, label }: { value: number; label: string }) {
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
  actionRow: { marginTop: 16, flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1.3, borderRadius: 18, backgroundColor: GREEN, paddingVertical: 15, alignItems: "center" },
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
  errorCard: { marginTop: 14, borderRadius: 22, backgroundColor: "#FEF2F2", padding: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { color: "#B91C1C", fontSize: 15, fontWeight: "900" },
  errorText: { marginTop: 4, color: "#991B1B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  list: { marginTop: 16, gap: 12 },
  card: { borderRadius: 26, backgroundColor: CARD, padding: 16, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTopRow: { flexDirection: "row", gap: 12 },
  cover: { width: 72, height: 104, borderRadius: 18, overflow: "hidden", backgroundColor: BG, alignItems: "center", justifyContent: "center" },
  coverImage: { width: "100%", height: "100%" },
  coverFallback: { fontSize: 30 },
  cardMain: { flex: 1, minWidth: 0 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  levelBadge: { overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 10, paddingVertical: 6, color: "#B45309", fontSize: 10, fontWeight: "900" },
  scoreBadge: { overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(46,125,91,0.1)", paddingHorizontal: 10, paddingVertical: 6, color: GREEN, fontSize: 10, fontWeight: "900" },
  cardTitle: { marginTop: 10, color: TEXT, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  cardAuthor: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "800" },
  cardMeta: { marginTop: 8, color: GREEN, fontSize: 11, fontWeight: "900" },
  requestBox: { marginTop: 13, borderRadius: 18, backgroundColor: BG, padding: 12 },
  requestEyebrow: { color: MUTED, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  requestTitle: { marginTop: 5, color: TEXT, fontSize: 15, lineHeight: 20, fontWeight: "900" },
  requestMeta: { marginTop: 3, color: MUTED, fontSize: 12, fontWeight: "700" },
  personBox: { marginTop: 10, borderRadius: 18, backgroundColor: "#FFFBEB", padding: 12 },
  personLabel: { color: "#92400E", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  personName: { marginTop: 5, color: "#92400E", fontSize: 14, fontWeight: "900" },
  personMeta: { marginTop: 3, color: "#B45309", fontSize: 11, fontWeight: "800" },
  reasonText: { marginTop: 11, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  signalCard: {
    marginTop: 11,
    borderRadius: 18,
    backgroundColor: "rgba(46,125,91,0.08)",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.14)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  signalContent: { flex: 1, minWidth: 0 },
  signalLabel: { color: DARK_GREEN, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.7 },
  signalDetail: { marginTop: 4, color: TEXT, fontSize: 12, fontWeight: "800" },
  signalPoints: { color: GREEN, fontSize: 18, fontWeight: "900" },
  cardActions: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  chatButton: { minWidth: 130, borderRadius: 999, backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" },
  chatButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  dateText: { marginLeft: "auto", color: MUTED, fontSize: 11, fontWeight: "800" },
  emptyCard: { borderRadius: 26, backgroundColor: CARD, padding: 24, alignItems: "center" },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 6, color: MUTED, fontSize: 13, fontWeight: "700", lineHeight: 20, textAlign: "center" },
});
