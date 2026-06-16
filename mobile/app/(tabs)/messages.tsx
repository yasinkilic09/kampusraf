import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";

type BookRelation = {
  title: string | null;
  author: string | null;
} | null;

type UserBookRelation = {
  books?: BookRelation | BookRelation[] | null;
} | null;

type ConversationRow = {
  id: string;
  user_one_id: string;
  user_two_id: string;
  updated_at: string | null;
  user_books?: UserBookRelation | UserBookRelation[] | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  created_at: string | null;
  is_read: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  university: string | null;
  city: string | null;
  verification_status: string | null;
  trust_score: number | null;
};

type PersonThread = {
  otherUserId: string;
  displayName: string;
  username: string | null;
  university: string | null;
  city: string | null;
  verificationStatus: string | null;
  trustScore: number | null;
  latestMessage: MessageRow | null;
  latestAt: string | null;
  unreadCount: number;
  conversationCount: number;
  bookTitles: string[];
  conversationIds: string[];
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

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

function getOtherUserId(conversation: ConversationRow, currentUserId: string) {
  return conversation.user_one_id === currentUserId
    ? conversation.user_two_id
    : conversation.user_one_id;
}

function getBookTitle(conversation: ConversationRow) {
  const userBook = first(conversation.user_books);
  const book = first(userBook?.books);

  return book?.title || "Kitap sohbeti";
}

function getDisplayName(profile?: ProfileRow) {
  return (
    profile?.full_name ||
    profile?.username ||
    profile?.email ||
    "KampüsRaf kullanıcısı"
  );
}

function shortMessage(message?: string | null) {
  const clean = (message || "").replace(/\s+/g, " ").trim();

  if (!clean) return "Henüz mesaj yok.";
  if (clean.length <= 90) return clean;

  return `${clean.slice(0, 90)}...`;
}

function verificationLabel(status?: string | null) {
  if (status === "verified") return "Doğrulanmış";
  if (status === "pending") return "İncelemede";
  if (status === "rejected") return "Reddedildi";
  return "Standart";
}

function sortByLatest(a: PersonThread, b: PersonThread) {
  const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0;
  const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0;

  return bTime - aTime;
}

export default function MessagesScreen() {
  const [items, setItems] = useState<PersonThread[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadMessages() {
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        user_one_id,
        user_two_id,
        updated_at,
        user_books (
          books (
            title,
            author
          )
        )
      `
      )
      .or(`user_one_id.eq.${user.id},user_two_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(80);

    if (conversationError) {
      setErrorMessage(conversationError.message);
      setItems([]);
      return;
    }

    const conversations = (conversationData || []) as unknown as ConversationRow[];
    const conversationIds = conversations.map((item) => item.id);
    const otherUserIds = Array.from(
      new Set(conversations.map((item) => getOtherUserId(item, user.id)))
    );

    if (conversationIds.length === 0 || otherUserIds.length === 0) {
      setItems([]);
      return;
    }

    const [profilesRes, messagesRes, unreadRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, username, email, university, city, verification_status, trust_score"
        )
        .in("id", otherUserIds),
      supabase
        .from("messages")
        .select("id, conversation_id, sender_id, receiver_id, message, created_at, is_read")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("messages")
        .select("id, conversation_id")
        .eq("receiver_id", user.id)
        .eq("is_read", false)
        .in("conversation_id", conversationIds),
    ]);

    if (profilesRes.error) {
      setErrorMessage(profilesRes.error.message);
      return;
    }

    if (messagesRes.error) {
      setErrorMessage(messagesRes.error.message);
      return;
    }

    if (unreadRes.error) {
      setErrorMessage(unreadRes.error.message);
      return;
    }

    const profileMap = new Map(
      ((profilesRes.data || []) as ProfileRow[]).map((profile) => [profile.id, profile])
    );

    const latestMessageByConversation = new Map<string, MessageRow>();
    ((messagesRes.data || []) as MessageRow[]).forEach((message) => {
      if (!latestMessageByConversation.has(message.conversation_id)) {
        latestMessageByConversation.set(message.conversation_id, message);
      }
    });

    const unreadCountByConversation = new Map<string, number>();
    ((unreadRes.data || []) as { conversation_id: string }[]).forEach((message) => {
      unreadCountByConversation.set(
        message.conversation_id,
        (unreadCountByConversation.get(message.conversation_id) || 0) + 1
      );
    });

    const groupedMap = new Map<string, PersonThread>();

    conversations.forEach((conversation) => {
      const otherUserId = getOtherUserId(conversation, user.id);
      const profile = profileMap.get(otherUserId);
      const latestMessage = latestMessageByConversation.get(conversation.id) || null;
      const unreadCount = unreadCountByConversation.get(conversation.id) || 0;
      const bookTitle = getBookTitle(conversation);

      const existing = groupedMap.get(otherUserId);

      if (!existing) {
        groupedMap.set(otherUserId, {
          otherUserId,
          displayName: getDisplayName(profile),
          username: profile?.username || null,
          university: profile?.university || null,
          city: profile?.city || null,
          verificationStatus: profile?.verification_status || null,
          trustScore: profile?.trust_score || null,
          latestMessage,
          latestAt: latestMessage?.created_at || conversation.updated_at,
          unreadCount,
          conversationCount: 1,
          bookTitles: [bookTitle],
          conversationIds: [conversation.id],
        });

        return;
      }

      existing.conversationCount += 1;
      existing.unreadCount += unreadCount;
      existing.conversationIds.push(conversation.id);

      if (!existing.bookTitles.includes(bookTitle)) {
        existing.bookTitles.push(bookTitle);
      }

      const candidateAt = latestMessage?.created_at || conversation.updated_at;
      const existingTime = existing.latestAt ? new Date(existing.latestAt).getTime() : 0;
      const candidateTime = candidateAt ? new Date(candidateAt).getTime() : 0;

      if (candidateTime > existingTime) {
        existing.latestAt = candidateAt;
        existing.latestMessage = latestMessage;
      }
    });

    setItems(Array.from(groupedMap.values()).sort(sortByLatest));
  }

  useEffect(() => {
    loadMessages().finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }

  const filteredItems = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("tr-TR");

    if (!clean) return items;

    return items.filter((item) => {
      const haystack = [
        item.displayName,
        item.username,
        item.university,
        item.city,
        item.latestMessage?.message,
        ...item.bookTitles,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return haystack.includes(clean);
    });
  }, [items, query]);

  const unreadTotal = items.reduce((total, item) => total + item.unreadCount, 0);
  const conversationTotal = items.reduce(
    (total, item) => total + item.conversationCount,
    0
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Mesaj Merkezi</Text>
        <Text style={styles.title}>Kitap sohbetlerini kişi bazlı takip et.</Text>
        <Text style={styles.description}>
          Aynı kişiyle olan farklı kitap sohbetlerini tek kartta gör, okunmamış mesajları hızlıca yakala.
        </Text>

        <View style={styles.headerStats}>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{items.length}</Text>
            <Text style={styles.headerStatLabel}>Kişi</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{conversationTotal}</Text>
            <Text style={styles.headerStatLabel}>Sohbet</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{unreadTotal}</Text>
            <Text style={styles.headerStatLabel}>Okunmamış</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchCard}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Kişi, kitap veya mesaj ara..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
      </View>

      {errorMessage && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Mesajlar yüklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.list}>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? "Henüz sohbet yok" : "Sonuç bulunamadı"}
            </Text>
            <Text style={styles.emptyText}>
              {items.length === 0
                ? "Kitap detayından mesajlaşma başlatınca sohbetlerin burada görünür."
                : "Başka bir kişi, kitap veya mesaj araması dene."}
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const latestPrefix =
              item.latestMessage?.sender_id && item.latestMessage.sender_id !== item.otherUserId
                ? "Sen: "
                : "";
            const bookPreview = item.bookTitles.slice(0, 3).join(" • ");
            const extraBookCount = Math.max(item.bookTitles.length - 3, 0);

            return (
              <Pressable
                key={item.otherUserId}
                style={({ pressed }) => [
                  styles.card,
                  item.unreadCount > 0 && styles.unreadCard,
                  pressed && styles.pressedCard,
                ]}
                onPress={() => {
                  router.push({
                    pathname: "/messages/[userId]",
                    params: { userId: item.otherUserId },
                  });
                }}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.displayName.slice(0, 1).toLocaleUpperCase("tr-TR")}</Text>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.nameRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.displayName}
                      </Text>
                      {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.metaText} numberOfLines={1}>
                      {[item.university, item.city].filter(Boolean).join(" • ") || "Profil bilgisi yok"}
                    </Text>
                  </View>
                </View>

                <View style={styles.messageBox}>
                  <Text style={styles.messageText} numberOfLines={2}>
                    {latestPrefix}
                    {shortMessage(item.latestMessage?.message)}
                  </Text>
                </View>

                <Text style={styles.bookText} numberOfLines={2}>
                  📚 {bookPreview || "Kitap sohbeti"}
                  {extraBookCount > 0 ? ` +${extraBookCount} kitap` : ""}
                </Text>

                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>{item.conversationCount} sohbet</Text>
                  <Text
                    style={[
                      styles.badge,
                      item.verificationStatus === "verified" && styles.verifiedBadge,
                    ]}
                  >
                    {verificationLabel(item.verificationStatus)}
                  </Text>
                  <Text style={styles.badge}>Güven {item.trustScore ?? 50}</Text>
                  <Text style={styles.dateText}>{formatDate(item.latestAt)}</Text>
                </View>
              </Pressable>
            );
          })
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
  headerStats: { marginTop: 18, flexDirection: "row", gap: 8 },
  headerStatBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 12,
    alignItems: "center",
  },
  headerStatValue: { color: "#fff", fontSize: 20, fontWeight: "900" },
  headerStatLabel: { marginTop: 3, color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: "900" },
  searchCard: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: BG,
    paddingHorizontal: 14,
    color: TEXT,
    fontWeight: "800",
  },
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
    backgroundColor: "#fff",
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(46,125,91,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: GREEN, fontSize: 20, fontWeight: "900" },
  cardMain: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, color: TEXT, fontSize: 18, fontWeight: "900" },
  metaText: { marginTop: 3, color: MUTED, fontSize: 12, fontWeight: "700" },
  unreadBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: AMBER,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  messageBox: { marginTop: 13, borderRadius: 18, backgroundColor: BG, padding: 12 },
  messageText: { color: TEXT, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  bookText: { marginTop: 10, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "800" },
  badgeRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 7, alignItems: "center" },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: GREEN,
    fontSize: 10,
    fontWeight: "900",
  },
  verifiedBadge: { backgroundColor: "rgba(245,158,11,0.15)", color: "#B45309" },
  dateText: { color: GREEN, fontSize: 11, fontWeight: "900", marginLeft: "auto" },
  emptyCard: { borderRadius: 26, backgroundColor: "#fff", padding: 24, alignItems: "center" },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 20 },
});
