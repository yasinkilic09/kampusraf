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
const RED = "#DC2626";

type ExchangeStatus = "requested" | "meeting_planned" | "handed_over" | "completed" | "canceled";

type ProfileSummary = {
  id: string;
  full_name: string | null;
  username: string | null;
  university: string | null;
  city: string | null;
};

type BookSummary = {
  title: string | null;
  author: string | null;
  cover_url: string | null;
};

type UserBookSummary = {
  custom_title: string | null;
  custom_author: string | null;
  image_url: string | null;
  condition: string | null;
  exchange_type: string | null;
  books: BookSummary | BookSummary[] | null;
};

type ExchangeRow = {
  id: string;
  conversation_id: string | null;
  user_book_id: string;
  requester_id: string;
  owner_id: string;
  requested_by: string | null;
  status: ExchangeStatus | string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  user_books: UserBookSummary | UserBookSummary[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getDisplayName(profile?: ProfileSummary | null) {
  return profile?.full_name || profile?.username || "KampusRaf kullanicisi";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status?: string | null) {
  if (status === "requested") return "Takas talebi";
  if (status === "meeting_planned") return "Bulusma planlandi";
  if (status === "handed_over") return "Kitap teslim edildi";
  if (status === "completed") return "Tamamlandi";
  if (status === "canceled") return "Iptal edildi";
  return status || "Durum yok";
}

function getStatusStep(status?: string | null) {
  if (status === "meeting_planned") return 2;
  if (status === "handed_over") return 3;
  if (status === "completed") return 4;
  if (status === "canceled") return 0;
  return 1;
}

function getExchangeTypeLabel(value?: string | null) {
  if (value === "satis" || value === "sell") return "Satis";
  if (value === "odunc" || value === "lend") return "Odunc";
  if (value === "bagis" || value === "giveaway") return "Bagis";
  return "Takas";
}

function getBookInfo(exchange: ExchangeRow) {
  const userBook = first(exchange.user_books);
  const book = first(userBook?.books);

  return {
    title: userBook?.custom_title || book?.title || "Kitap bilgisi yok",
    author: userBook?.custom_author || book?.author || "Yazar bilgisi yok",
    image: userBook?.image_url || book?.cover_url || null,
    condition: userBook?.condition || "Durum belirtilmemis",
    exchangeType: getExchangeTypeLabel(userBook?.exchange_type),
  };
}

export default function ExchangesScreen() {
  const [items, setItems] = useState<ExchangeRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadExchanges = useCallback(async () => {
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
      .from("exchanges")
      .select(
        `
        id,
        conversation_id,
        user_book_id,
        requester_id,
        owner_id,
        requested_by,
        status,
        note,
        created_at,
        updated_at,
        completed_at,
        canceled_at,
        user_books (
          custom_title,
          custom_author,
          image_url,
          condition,
          exchange_type,
          books (
            title,
            author,
            cover_url
          )
        )
      `
      )
      .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(80);

    if (error) {
      setErrorMessage(error.message);
      setItems([]);
      return;
    }

    const loadedItems = (data || []) as unknown as ExchangeRow[];
    setItems(loadedItems);

    const profileIds = Array.from(
      new Set(loadedItems.flatMap((item) => [item.requester_id, item.owner_id]).filter(Boolean))
    );

    if (profileIds.length === 0) {
      setProfiles({});
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, university, city")
      .in("id", profileIds);

    if (profileError) {
      setErrorMessage(profileError.message);
      return;
    }

    const profileMap = Object.fromEntries(
      ((profileData || []) as ProfileSummary[]).map((profile) => [profile.id, profile])
    );
    setProfiles(profileMap);
  }, []);

  useEffect(() => {
    loadExchanges().finally(() => setLoading(false));
  }, [loadExchanges]);

  async function onRefresh() {
    setRefreshing(true);
    await loadExchanges();
    setRefreshing(false);
  }

  async function updateExchangeStatus(exchange: ExchangeRow, nextStatus: ExchangeStatus) {
    if (!currentUserId || busyId) return;

    const now = new Date().toISOString();
    const patch: Record<string, string | null> = {
      status: nextStatus,
      updated_at: now,
      last_action_by: currentUserId,
    };

    if (nextStatus === "completed") patch.completed_at = now;
    if (nextStatus === "canceled") patch.canceled_at = now;

    setBusyId(exchange.id);

    const { error } = await supabase
      .from("exchanges")
      .update(patch)
      .eq("id", exchange.id)
      .or(`requester_id.eq.${currentUserId},owner_id.eq.${currentUserId}`);

    setBusyId(null);

    if (error) {
      Alert.alert("Takas guncellenemedi", error.message);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === exchange.id
          ? {
              ...item,
              status: nextStatus,
              updated_at: now,
              completed_at: nextStatus === "completed" ? now : item.completed_at,
              canceled_at: nextStatus === "canceled" ? now : item.canceled_at,
            }
          : item
      )
    );
  }

  async function openConversation(exchange: ExchangeRow) {
    if (!currentUserId || busyId) return;

    const otherUserId = exchange.requester_id === currentUserId ? exchange.owner_id : exchange.requester_id;

    if (exchange.conversation_id) {
      router.push({
        pathname: "/messages/[userId]",
        params: { userId: otherUserId, conversationId: exchange.conversation_id },
      } as never);
      return;
    }

    setBusyId(exchange.id);

    const now = new Date().toISOString();
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        user_one_id: currentUserId,
        user_two_id: otherUserId,
        user_book_id: exchange.user_book_id,
        last_message: "Takas uzerinden sohbet baslatildi.",
        last_message_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      setBusyId(null);
      Alert.alert("Sohbet acilamadi", conversationError?.message || "Sohbet kaydi olusturulamadi.");
      return;
    }

    await supabase
      .from("exchanges")
      .update({ conversation_id: conversation.id, updated_at: now, last_action_by: currentUserId })
      .eq("id", exchange.id);

    setBusyId(null);
    setItems((current) =>
      current.map((item) =>
        item.id === exchange.id ? { ...item, conversation_id: conversation.id, updated_at: now } : item
      )
    );

    router.push({
      pathname: "/messages/[userId]",
      params: { userId: otherUserId, conversationId: conversation.id },
    } as never);
  }

  const stats = useMemo(() => {
    const active = items.filter((item) =>
      ["requested", "meeting_planned", "handed_over"].includes(item.status || "")
    ).length;
    const completed = items.filter((item) => item.status === "completed").length;
    const canceled = items.filter((item) => item.status === "canceled").length;
    return { total: items.length, active, completed, canceled };
  }, [items]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
        <Text style={styles.loadingText}>Takaslar yukleniyor...</Text>
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
        <Text style={styles.eyebrow}>Takaslar</Text>
        <Text style={styles.title}>Kitap devir sureclerini takip et.</Text>
        <Text style={styles.description}>
          Baslayan takaslari, bulusma durumunu ve tamamlanan islemleri mobil uygulamadan yonet.
        </Text>

        <View style={styles.headerStats}>
          <HeaderStat value={stats.total} label="Toplam" />
          <HeaderStat value={stats.active} label="Aktif" />
          <HeaderStat value={stats.completed} label="Tamam" />
          <HeaderStat value={stats.canceled} label="Iptal" />
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/matches" as never)}>
          <Text style={styles.primaryButtonText}>Eslesmelere Git</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => router.push("/messages" as never)}>
          <Text style={styles.outlineButtonText}>Mesajlar</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Takaslar yuklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>↔</Text>
            <Text style={styles.emptyTitle}>Henuz takas yok</Text>
            <Text style={styles.emptyText}>
              Eslesmelerden sohbet baslattiginda veya bir takas talebi olustugunda surec burada gorunecek.
            </Text>
          </View>
        ) : (
          items.map((exchange) => {
            const book = getBookInfo(exchange);
            const step = getStatusStep(exchange.status);
            const otherUserId = exchange.requester_id === currentUserId ? exchange.owner_id : exchange.requester_id;
            const otherProfile = profiles[otherUserId];
            const isTerminal = exchange.status === "completed" || exchange.status === "canceled";
            const isBusy = busyId === exchange.id;

            return (
              <View key={exchange.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Pressable
                    style={styles.cover}
                    onPress={() => {
                      router.push({
                        pathname: "/books/[userBookId]",
                        params: { userBookId: exchange.user_book_id },
                      } as never);
                    }}
                  >
                    {book.image ? (
                      <Image source={{ uri: book.image }} style={styles.coverImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.coverFallback}>📖</Text>
                    )}
                  </Pressable>

                  <View style={styles.cardMain}>
                    <View style={styles.badgeRow}>
                      <Text style={[styles.statusBadge, exchange.status === "canceled" && styles.redBadge]}>
                        {getStatusLabel(exchange.status)}
                      </Text>
                      <Text style={styles.typeBadge}>{book.exchangeType}</Text>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={styles.cardAuthor} numberOfLines={1}>
                      {book.author}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {book.condition} • {formatDate(exchange.updated_at || exchange.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBox}>
                  <ProgressStep active={step >= 1} label="Talep" />
                  <ProgressStep active={step >= 2} label="Bulusma" />
                  <ProgressStep active={step >= 3} label="Teslim" />
                  <ProgressStep active={step >= 4} label="Tamam" />
                </View>

                <View style={styles.personBox}>
                  <Text style={styles.personLabel}>Karsi taraf</Text>
                  <Text style={styles.personName} numberOfLines={1}>
                    {getDisplayName(otherProfile)}
                  </Text>
                  <Text style={styles.personMeta} numberOfLines={1}>
                    {[otherProfile?.university, otherProfile?.city].filter(Boolean).join(" • ") || "Profil bilgisi yok"}
                  </Text>
                </View>

                {exchange.note ? (
                  <Text style={styles.noteText} numberOfLines={3}>
                    {exchange.note}
                  </Text>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable style={styles.chatButton} onPress={() => openConversation(exchange)} disabled={isBusy}>
                    {isBusy ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.chatButtonText}>Sohbete Git</Text>
                    )}
                  </Pressable>

                  {!isTerminal ? (
                    <View style={styles.statusActions}>
                      {exchange.status === "requested" ? (
                        <SmallAction
                          label="Bulusma planlandi"
                          onPress={() => updateExchangeStatus(exchange, "meeting_planned")}
                          disabled={Boolean(busyId)}
                        />
                      ) : null}
                      {exchange.status === "meeting_planned" ? (
                        <SmallAction
                          label="Teslim edildi"
                          onPress={() => updateExchangeStatus(exchange, "handed_over")}
                          disabled={Boolean(busyId)}
                        />
                      ) : null}
                      {exchange.status === "handed_over" ? (
                        <SmallAction
                          label="Tamamla"
                          onPress={() => updateExchangeStatus(exchange, "completed")}
                          disabled={Boolean(busyId)}
                        />
                      ) : null}
                      <SmallAction
                        label="Iptal"
                        danger
                        onPress={() => {
                          Alert.alert("Takas iptal edilsin mi?", "Bu takasi iptal edildi olarak isaretleyecegiz.", [
                            { text: "Vazgec", style: "cancel" },
                            {
                              text: "Iptal Et",
                              style: "destructive",
                              onPress: () => updateExchangeStatus(exchange, "canceled"),
                            },
                          ]);
                        }}
                        disabled={Boolean(busyId)}
                      />
                    </View>
                  ) : null}
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

function ProgressStep({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={styles.progressStep}>
      <View style={[styles.progressDot, active && styles.activeProgressDot]} />
      <Text style={[styles.progressLabel, active && styles.activeProgressLabel]}>{label}</Text>
    </View>
  );
}

function SmallAction({
  label,
  danger = false,
  disabled,
  onPress,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.smallAction, danger && styles.dangerAction, disabled && styles.disabledAction]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.smallActionText, danger && styles.dangerActionText]}>{label}</Text>
    </Pressable>
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
  statusBadge: { overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(46,125,91,0.1)", paddingHorizontal: 10, paddingVertical: 6, color: GREEN, fontSize: 10, fontWeight: "900" },
  redBadge: { backgroundColor: "#FEE2E2", color: RED },
  typeBadge: { overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 10, paddingVertical: 6, color: "#B45309", fontSize: 10, fontWeight: "900" },
  cardTitle: { marginTop: 10, color: TEXT, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  cardAuthor: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "800" },
  cardMeta: { marginTop: 8, color: GREEN, fontSize: 11, fontWeight: "900" },
  progressBox: { marginTop: 14, flexDirection: "row", borderRadius: 18, backgroundColor: BG, padding: 10 },
  progressStep: { flex: 1, alignItems: "center", gap: 5 },
  progressDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: "#CBD5E1" },
  activeProgressDot: { backgroundColor: GREEN },
  progressLabel: { color: MUTED, fontSize: 9, fontWeight: "900" },
  activeProgressLabel: { color: DARK_GREEN },
  personBox: { marginTop: 10, borderRadius: 18, backgroundColor: "#FFFBEB", padding: 12 },
  personLabel: { color: "#92400E", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  personName: { marginTop: 5, color: "#92400E", fontSize: 14, fontWeight: "900" },
  personMeta: { marginTop: 3, color: "#B45309", fontSize: 11, fontWeight: "800" },
  noteText: { marginTop: 11, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  cardActions: { marginTop: 13, gap: 10 },
  chatButton: { borderRadius: 999, backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 13, alignItems: "center" },
  chatButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  statusActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallAction: {
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  smallActionText: { color: DARK_GREEN, fontSize: 11, fontWeight: "900" },
  dangerAction: { backgroundColor: "#FEE2E2" },
  dangerActionText: { color: RED },
  disabledAction: { opacity: 0.45 },
  emptyCard: { borderRadius: 26, backgroundColor: CARD, padding: 24, alignItems: "center" },
  emptyIcon: { color: GREEN, fontSize: 36, fontWeight: "900" },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 6, color: MUTED, fontSize: 13, fontWeight: "700", lineHeight: 20, textAlign: "center" },
});
