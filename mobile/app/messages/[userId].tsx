import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getBookTitle(conversation: ConversationRow) {
  const userBook = first(conversation.user_books);
  const book = first(userBook?.books);

  return book?.title || "Kitap sohbeti";
}

function getDisplayName(profile?: ProfileRow | null) {
  return (
    profile?.full_name ||
    profile?.username ||
    profile?.email ||
    "KampüsRaf kullanıcısı"
  );
}

function formatTime(value?: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function verificationLabel(status?: string | null) {
  if (status === "verified") return "Doğrulanmış öğrenci";
  if (status === "pending") return "Doğrulama incelemede";
  if (status === "rejected") return "Doğrulama reddedildi";
  return "Standart profil";
}

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function sortMessagesByDate(items: MessageRow[]) {
  return [...items].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

    return aTime - bTime;
  });
}

function upsertMessage(items: MessageRow[], row: MessageRow) {
  const exists = items.some((item) => item.id === row.id);

  if (exists) {
    return sortMessagesByDate(items.map((item) => (item.id === row.id ? row : item)));
  }

  return sortMessagesByDate([...items, row]);
}

export default function UserChatScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    userId?: string | string[];
    conversationId?: string | string[];
  }>();
  const otherUserId = normalizeParam(params.userId);
  const requestedConversationId = normalizeParam(params.conversationId);
  const scrollRef = useRef<ScrollView>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const filteredMessages = useMemo(() => {
    if (!selectedConversationId) return messages;

    return messages.filter((message) => message.conversation_id === selectedConversationId);
  }, [messages, selectedConversationId]);

  const conversationKey = useMemo(
    () => conversations.map((item) => item.id).sort().join("|"),
    [conversations]
  );

  const loadThread = useCallback(
    async (shouldSetLoading = false) => {
      if (shouldSetLoading) setLoading(true);
      setErrorMessage(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      if (!otherUserId) {
        setErrorMessage("Sohbet kullanıcısı bulunamadı.");
        return;
      }

      setCurrentUserId(user.id);

      const [profileRes, conversationsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username, email, university, city, verification_status, trust_score")
          .eq("id", otherUserId)
          .maybeSingle(),
        supabase
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
          .or(
            `and(user_one_id.eq.${user.id},user_two_id.eq.${otherUserId}),and(user_one_id.eq.${otherUserId},user_two_id.eq.${user.id})`
          )
          .order("updated_at", { ascending: false }),
      ]);

      if (profileRes.error) {
        setErrorMessage(profileRes.error.message);
        return;
      }

      if (conversationsRes.error) {
        setErrorMessage(conversationsRes.error.message);
        return;
      }

      const loadedConversations = (conversationsRes.data || []) as unknown as ConversationRow[];
      setProfile((profileRes.data || null) as ProfileRow | null);
      setConversations(loadedConversations);

      setSelectedConversationId((current) => {
        if (
          requestedConversationId &&
          loadedConversations.some((item) => item.id === requestedConversationId)
        ) {
          return requestedConversationId;
        }

        if (current && loadedConversations.some((item) => item.id === current)) {
          return current;
        }

        return loadedConversations[0]?.id || null;
      });

      const conversationIds = loadedConversations.map((item) => item.id);

      if (conversationIds.length === 0) {
        setMessages([]);
        return;
      }

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, receiver_id, message, created_at, is_read")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })
        .limit(500);

      if (messageError) {
        setErrorMessage(messageError.message);
        return;
      }

      const loadedMessages = (messageData || []) as MessageRow[];
      setMessages(sortMessagesByDate(loadedMessages));

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user.id)
        .eq("sender_id", otherUserId)
        .eq("is_read", false)
        .in("conversation_id", conversationIds);
    },
    [otherUserId, requestedConversationId]
  );

  useEffect(() => {
    loadThread(true).finally(() => setLoading(false));
  }, [loadThread]);


  useEffect(() => {
    if (!currentUserId || !otherUserId || !conversationKey) return;

    const activeConversationIds = conversationKey.split("|").filter(Boolean);
    const activeConversationIdSet = new Set(activeConversationIds);

    const channel = supabase
      .channel(`mobile-user-chat-${currentUserId}-${otherUserId}-${conversationKey}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const row = payload.new as MessageRow;

          if (!activeConversationIdSet.has(row.conversation_id)) return;

          setMessages((current) => upsertMessage(current, row));

          if (row.receiver_id === currentUserId && row.sender_id === otherUserId && !row.is_read) {
            await supabase.from("messages").update({ is_read: true }).eq("id", row.id);
          }

          setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
          }, 120);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as MessageRow;

          if (!activeConversationIdSet.has(row.conversation_id)) return;

          setMessages((current) => upsertMessage(current, row));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationKey, currentUserId, otherUserId]);

  async function onRefresh() {
    setRefreshing(true);
    await loadThread(false);
    setRefreshing(false);
  }

  async function sendMessage() {
    const cleanMessage = newMessage.replace(/\s+/g, " ").trim();

    if (!cleanMessage || !currentUserId || !otherUserId || !selectedConversationId) return;

    setSending(true);

    const { data: insertedMessage, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversationId,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        message: cleanMessage,
        is_read: false,
      })
      .select("id, conversation_id, sender_id, receiver_id, message, created_at, is_read")
      .single();

    if (error) {
      setSending(false);
      Alert.alert("Mesaj gönderilemedi", error.message);
      return;
    }

    setNewMessage("");

    if (insertedMessage) {
      setMessages((current) => upsertMessage(current, insertedMessage as MessageRow));
    }

    await supabase
      .from("conversations")
      .update({
        last_message: cleanMessage,
        last_message_at: insertedMessage?.created_at || new Date().toISOString(),
        updated_at: insertedMessage?.created_at || new Date().toISOString(),
      })
      .eq("id", selectedConversationId);

    setSending(false);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Sohbet yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>

        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{getDisplayName(profile).slice(0, 1).toLocaleUpperCase("tr-TR")}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{getDisplayName(profile)}</Text>
          <Text style={styles.headerMeta} numberOfLines={1}>
            {[profile?.university, profile?.city].filter(Boolean).join(" • ") || verificationLabel(profile?.verification_status)}
          </Text>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Sohbet yüklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {conversations.length > 1 && (
        <View style={styles.conversationSelectorWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conversationSelector}>
            {conversations.map((conversation) => {
              const isActive = conversation.id === selectedConversationId;

              return (
                <Pressable
                  key={conversation.id}
                  style={[styles.conversationChip, isActive && styles.activeConversationChip]}
                  onPress={() => setSelectedConversationId(conversation.id)}
                >
                  <Text style={[styles.conversationChipText, isActive && styles.activeConversationChipText]} numberOfLines={1}>
                    📚 {getBookTitle(conversation)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {selectedConversation && (
        <View style={styles.bookBanner}>
          <Text style={styles.bookBannerText} numberOfLines={1}>
            Bu mesaj: {getBookTitle(selectedConversation)}
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Bu kişiyle sohbet bulunamadı</Text>
            <Text style={styles.emptyText}>Kitap detayından mesajlaşma başlatınca konuşma burada açılır.</Text>
          </View>
        ) : filteredMessages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✍️</Text>
            <Text style={styles.emptyTitle}>Henüz mesaj yok</Text>
            <Text style={styles.emptyText}>Bu kitap sohbeti için ilk mesajı yazabilirsin.</Text>
          </View>
        ) : (
          filteredMessages.map((message) => {
            const isMine = message.sender_id === currentUserId;

            return (
              <View key={message.id} style={[styles.messageRow, isMine ? styles.mineRow : styles.theirRow]}>
                <View style={[styles.bubble, isMine ? styles.mineBubble : styles.theirBubble]}>
                  <Text style={[styles.bubbleText, isMine ? styles.mineBubbleText : styles.theirBubbleText]}>
                    {message.message || ""}
                  </Text>
                  <Text style={[styles.bubbleTime, isMine ? styles.mineBubbleTime : styles.theirBubbleTime]}>
                    {formatTime(message.created_at)}
                    {isMine ? (message.is_read ? " · okundu" : " · gönderildi") : ""}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Mesaj yaz..."
          placeholderTextColor="#94A3B8"
          style={styles.messageInput}
          multiline
          maxLength={800}
          onFocus={() => {
            setTimeout(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }, 250);
          }}
        />
        <Pressable
          style={[styles.sendButton, (!newMessage.trim() || sending || !selectedConversationId) && styles.disabledSendButton]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending || !selectedConversationId}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Gönder</Text>
          )}
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  screen: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  loadingText: { marginTop: 10, color: MUTED, fontWeight: "800" },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { color: "#fff", fontSize: 32, lineHeight: 34, fontWeight: "800" },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  headerInfo: { flex: 1, minWidth: 0 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  headerMeta: { marginTop: 2, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700" },
  errorCard: {
    margin: 14,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: { color: "#B91C1C", fontSize: 14, fontWeight: "900" },
  errorText: { marginTop: 4, color: "#991B1B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  conversationSelectorWrap: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "rgba(15,23,42,0.06)" },
  conversationSelector: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  conversationChip: {
    maxWidth: 210,
    borderRadius: 999,
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.12)",
  },
  activeConversationChip: { backgroundColor: GREEN, borderColor: GREEN },
  conversationChipText: { color: GREEN, fontSize: 11, fontWeight: "900" },
  activeConversationChipText: { color: "#fff" },
  bookBanner: { backgroundColor: "#FFFBEB", paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#FDE68A" },
  bookBannerText: { color: "#92400E", fontSize: 12, fontWeight: "900" },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 32, gap: 10 },
  messageRow: { width: "100%", flexDirection: "row" },
  mineRow: { justifyContent: "flex-end" },
  theirRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10 },
  mineBubble: { backgroundColor: GREEN, borderBottomRightRadius: 7 },
  theirBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 7, borderWidth: 1, borderColor: "rgba(15,23,42,0.06)" },
  bubbleText: { fontSize: 14, lineHeight: 20, fontWeight: "700" },
  mineBubbleText: { color: "#fff" },
  theirBubbleText: { color: TEXT },
  bubbleTime: { marginTop: 6, fontSize: 10, fontWeight: "800", textAlign: "right" },
  mineBubbleTime: { color: "rgba(255,255,255,0.68)" },
  theirBubbleTime: { color: MUTED },
  inputBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.07)",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 20,
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontWeight: "700",
  },
  sendButton: {
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: AMBER,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledSendButton: { opacity: 0.45 },
  sendButtonText: { color: "#fff", fontWeight: "900" },
  emptyCard: { borderRadius: 26, backgroundColor: "#fff", padding: 24, alignItems: "center", marginTop: 24 },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900", textAlign: "center" },
  emptyText: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 20 },
});
