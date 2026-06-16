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

type BookRequestRow = {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  city: string | null;
  university: string | null;
  note: string | null;
  status: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

function getStatusLabel(status?: string | null) {
  if (status === "active") return "Aktif Aranıyor";
  if (status === "matched") return "Eşleşme Bulundu";
  if (status === "closed") return "Kapalı";
  return status || "Durum yok";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isActiveRequest(status?: string | null) {
  return status === "active" || status === "matched";
}

export default function RequestsScreen() {
  const [items, setItems] = useState<BookRequestRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
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
      .from("book_requests")
      .select("id, title, author, category, city, university, note, status, is_active, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setItems([]);
      return;
    }

    setItems((data || []) as BookRequestRow[]);
  }, []);

  useEffect(() => {
    loadRequests().finally(() => setLoading(false));
  }, [loadRequests]);

  async function onRefresh() {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }

  async function toggleRequest(item: BookRequestRow) {
    if (!userId || updatingId) return;

    const active = isActiveRequest(item.status);
    const nextStatus = active ? "closed" : "active";

    setUpdatingId(item.id);

    const { error } = await supabase
      .from("book_requests")
      .update({
        status: nextStatus,
        is_active: nextStatus === "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("user_id", userId);

    setUpdatingId(null);

    if (error) {
      Alert.alert("Arama kaydı güncellenemedi", error.message);
      return;
    }

    setItems((current) =>
      current.map((request) =>
        request.id === item.id
          ? { ...request, status: nextStatus, is_active: nextStatus === "active" }
          : request
      )
    );
  }

  const stats = useMemo(() => {
    const active = items.filter((item) => item.status === "active").length;
    const matched = items.filter((item) => item.status === "matched").length;
    const closed = items.filter((item) => item.status === "closed").length;

    return { total: items.length, active, matched, closed };
  }, [items]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Arama kayıtların yükleniyor...</Text>
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
        <Text style={styles.eyebrow}>Aradığım Kitaplar</Text>
        <Text style={styles.title}>Bulamadığın kitapları takip et.</Text>
        <Text style={styles.description}>
          Arama kaydı aç; bir öğrenci benzer kitabı rafa eklediğinde eşleşmelerin oluşsun.
        </Text>

        <View style={styles.headerStats}>
          <HeaderStat value={stats.total} label="Toplam" />
          <HeaderStat value={stats.active} label="Aktif" />
          <HeaderStat value={stats.matched} label="Eşleşen" />
          <HeaderStat value={stats.closed} label="Kapalı" />
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/requests/add" as never)}>
          <Text style={styles.primaryButtonText}>🔎 Arama Kaydı Aç</Text>
        </Pressable>

        <Pressable style={styles.outlineButton} onPress={() => router.push("/explore" as never)}>
          <Text style={styles.outlineButtonText}>Kitap Ara</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Arama kayıtları yüklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔎</Text>
            <Text style={styles.emptyTitle}>Henüz takip kaydın yok</Text>
            <Text style={styles.emptyText}>
              Bulamadığın kitabı buraya ekleyerek daha sonra eşleşmesini bekleyebilirsin.
            </Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push("/requests/add" as never)}>
              <Text style={styles.emptyButtonText}>İlk Arama Kaydımı Aç</Text>
            </Pressable>
          </View>
        ) : (
          items.map((item) => {
            const active = isActiveRequest(item.status);

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.badgeRow}>
                  <Text style={[styles.badge, active && styles.activeBadge]}>
                    {getStatusLabel(item.status)}
                  </Text>
                  {item.category ? <Text style={styles.badge}>{item.category}</Text> : null}
                </View>

                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                {item.author ? (
                  <Text style={styles.cardAuthor} numberOfLines={1}>
                    {item.author}
                  </Text>
                ) : null}

                <View style={styles.locationBox}>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.university || "Üniversite bilgisi yok"}
                  </Text>
                  <Text style={styles.locationSubText} numberOfLines={1}>
                    {item.city || "Şehir bilgisi yok"} • {formatDate(item.created_at)}
                  </Text>
                </View>

                {item.note ? (
                  <Text style={styles.noteText} numberOfLines={3}>
                    {item.note}
                  </Text>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable
                    style={styles.searchButton}
                    onPress={() => {
                      router.push({
                        pathname: "/explore",
                        params: { q: item.title },
                      } as never);
                    }}
                  >
                    <Text style={styles.searchButtonText}>Sistemde Ara</Text>
                  </Pressable>

                  <Pressable
                    style={styles.secondaryAction}
                    onPress={() => toggleRequest(item)}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id ? (
                      <ActivityIndicator color={DARK_GREEN} size="small" />
                    ) : (
                      <Text style={styles.secondaryActionText}>
                        {active ? "Kapat" : "Aktifleştir"}
                      </Text>
                    )}
                  </Pressable>
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
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  cardTitle: { marginTop: 12, color: TEXT, fontSize: 20, lineHeight: 25, fontWeight: "900" },
  cardAuthor: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "800" },
  locationBox: { marginTop: 12, borderRadius: 18, backgroundColor: "#FFFBEB", padding: 12 },
  locationText: { color: "#92400E", fontSize: 12, fontWeight: "900" },
  locationSubText: { marginTop: 4, color: "#B45309", fontSize: 11, fontWeight: "800" },
  noteText: { marginTop: 12, borderRadius: 18, backgroundColor: BG, padding: 12, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  cardActions: { marginTop: 13, flexDirection: "row", gap: 10 },
  searchButton: { flex: 1, borderRadius: 999, backgroundColor: GREEN, paddingVertical: 11, alignItems: "center" },
  searchButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  secondaryAction: {
    minWidth: 108,
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  secondaryActionText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  emptyCard: { borderRadius: 26, backgroundColor: CARD, padding: 24, alignItems: "center" },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 6, color: MUTED, fontSize: 13, fontWeight: "700", lineHeight: 20, textAlign: "center" },
  emptyButton: { marginTop: 16, borderRadius: 999, backgroundColor: GREEN, paddingHorizontal: 18, paddingVertical: 12 },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
