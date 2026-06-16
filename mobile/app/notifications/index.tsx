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
import { SafeAreaView } from "react-native-safe-area-context";

import { getMobileRouteFromUrl } from "@/lib/navigation-routes";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const DARK_GREEN = "#25684C";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";
const RED = "#DC2626";

type NotificationRow = {
  id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string | null;
  target_url: string | null;
  link_url: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  const date = new Date(value);
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function notificationMeta(type?: string | null) {
  if (type === "message") {
    return { icon: "💬", label: "Mesaj", color: GREEN };
  }

  if (type === "match" || type === "book_match") {
    return { icon: "🤝", label: "Eşleşme", color: AMBER };
  }

  if (type === "exchange") {
    return { icon: "🔁", label: "Takas", color: GREEN };
  }

  if (type === "social_like") {
    return { icon: "❤️", label: "Beğeni", color: RED };
  }

  if (type === "social_comment") {
    return { icon: "💬", label: "Yorum", color: AMBER };
  }

  if (type === "student_verification" || type === "verification") {
    return { icon: "🎓", label: "Doğrulama", color: GREEN };
  }

  return { icon: "🔔", label: "Bildirim", color: MUTED };
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
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
      .from("notifications")
      .select("id, title, message, type, is_read, created_at, target_url, link_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      setErrorMessage(error.message);
      setItems([]);
      return;
    }

    setItems((data || []) as NotificationRow[]);
  }, []);

  useEffect(() => {
    loadNotifications().finally(() => setLoading(false));
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`mobile-notifications-screen:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, userId]);

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }

  async function markOneAsRead(notificationId: string) {
    if (!userId) return;

    setItems((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      setErrorMessage(error.message);
      await loadNotifications();
    }
  }

  async function markAllAsRead() {
    if (!userId || unreadCount === 0) return;

    setItems((current) => current.map((item) => ({ ...item, is_read: true })));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      setErrorMessage(error.message);
      await loadNotifications();
    }
  }

  async function handleNotificationPress(item: NotificationRow) {
    if (!item.is_read) {
      await markOneAsRead(item.id);
    }

    const mobileRoute = getMobileRouteFromUrl(item.target_url || item.link_url);

    if (mobileRoute) {
      router.push(mobileRoute as never);
      return;
    }

    Alert.alert(
      "Bildirim",
      "Bu bildirimin mobil detay ekranı henüz eklenmedi. İlgili web ekranı daha sonra mobil akışa bağlanacak."
    );
  }

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items]
  );

  const messageCount = useMemo(
    () => items.filter((item) => item.type === "message").length,
    [items]
  );

  const socialCount = useMemo(
    () => items.filter((item) => item.type === "social_like" || item.type === "social_comment").length,
    [items]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
        <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Bildirim Merkezi</Text>
        <Text style={styles.title}>KampüsRaf hareketlerini takip et.</Text>
        <Text style={styles.description}>
          Mesaj, eşleşme, takas ve sosyal bildirimlerini mobil uygulamadan kontrol et.
        </Text>

        <View style={styles.headerStats}>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{unreadCount}</Text>
            <Text style={styles.headerStatLabel}>Okunmamış</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{messageCount}</Text>
            <Text style={styles.headerStatLabel}>Mesaj</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{socialCount}</Text>
            <Text style={styles.headerStatLabel}>Sosyal</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </Pressable>

        <Pressable
          style={[styles.markAllButton, unreadCount === 0 && styles.disabledButton]}
          onPress={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <Text style={[styles.markAllText, unreadCount === 0 && styles.disabledText]}>
            Tümünü Okundu Yap
          </Text>
        </Pressable>
      </View>

      {errorMessage && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Bildirimler yüklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.list}>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
            <Text style={styles.emptyText}>
              Mesaj, eşleşme, takas ve sosyal hareketler burada görünecek.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const meta = notificationMeta(item.type);
            const isUnread = !item.is_read;

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.notificationCard,
                  isUnread && styles.unreadCard,
                  pressed && styles.pressedCard,
                ]}
                onPress={() => handleNotificationPress(item)}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.iconBox, { backgroundColor: `${meta.color}22` }]}>
                    <Text style={styles.iconText}>{meta.icon}</Text>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.titleRow}>
                      <Text style={styles.notificationTitle} numberOfLines={1}>
                        {item.title || "Bildirim"}
                      </Text>
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>

                    <Text style={styles.metaText}>
                      {meta.label} • {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.notificationMessage} numberOfLines={3}>
                  {item.message || "Bildirim içeriği yok."}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={[styles.typeBadge, { color: meta.color }]}>#{meta.label}</Text>

                  {isUnread ? (
                    <Pressable
                      style={styles.smallReadButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        markOneAsRead(item.id);
                      }}
                    >
                      <Text style={styles.smallReadText}>Okundu Yap</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.readText}>Okundu</Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
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
  headerStats: { marginTop: 18, flexDirection: "row", gap: 8 },
  headerStatBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 12,
    alignItems: "center",
  },
  headerStatValue: { color: "#fff", fontSize: 20, fontWeight: "900" },
  headerStatLabel: {
    marginTop: 3,
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    fontWeight: "900",
  },
  actionRow: { marginTop: 16, flexDirection: "row", gap: 10 },
  backButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: CARD,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.12)",
  },
  backButtonText: { color: DARK_GREEN, fontWeight: "900", fontSize: 13 },
  markAllButton: {
    flex: 1.4,
    borderRadius: 18,
    backgroundColor: GREEN,
    paddingVertical: 14,
    alignItems: "center",
  },
  markAllText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  disabledButton: { backgroundColor: "#E2E8F0" },
  disabledText: { color: MUTED },
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
  notificationCard: {
    borderRadius: 26,
    backgroundColor: CARD,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.06)",
  },
  unreadCard: { borderColor: "rgba(245,158,11,0.42)", backgroundColor: "#FFFBEB" },
  pressedCard: { transform: [{ scale: 0.99 }], opacity: 0.92 },
  cardTopRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 23 },
  cardMain: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  notificationTitle: { flex: 1, color: TEXT, fontSize: 17, fontWeight: "900" },
  unreadDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: AMBER },
  metaText: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "800" },
  notificationMessage: { marginTop: 13, color: TEXT, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  cardFooter: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: "900",
  },
  smallReadButton: {
    marginLeft: "auto",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  smallReadText: { color: DARK_GREEN, fontSize: 10, fontWeight: "900" },
  readText: { marginLeft: "auto", color: MUTED, fontSize: 10, fontWeight: "900" },
  emptyCard: { borderRadius: 26, backgroundColor: CARD, padding: 24, alignItems: "center" },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 20 },
});
