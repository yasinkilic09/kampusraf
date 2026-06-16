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

import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const DARK_GREEN = "#25684C";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";
const RED = "#DC2626";

type FriendProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  university: string | null;
  city: string | null;
  trust_score: number | null;
  verification_status: string | null;
  completed_exchange_count: number | null;
};

type FriendshipItem = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  requester: FriendProfile | FriendProfile[] | null;
  addressee: FriendProfile | FriendProfile[] | null;
};

type FriendCardType = "friend" | "incoming" | "outgoing";

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getProfileName(profile?: FriendProfile | null) {
  return profile?.full_name || profile?.username || "KampusRaf kullanicisi";
}

function getInitial(profile?: FriendProfile | null) {
  return getProfileName(profile).trim().slice(0, 1).toLocaleUpperCase("tr-TR") || "K";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function getTypeMeta(type: FriendCardType) {
  if (type === "incoming") {
    return { label: "Gelen Istek", color: AMBER, background: "#FFFBEB" };
  }

  if (type === "outgoing") {
    return { label: "Gonderilen Istek", color: MUTED, background: "#F8FAFC" };
  }

  return { label: "Arkadas", color: GREEN, background: "rgba(46,125,91,0.1)" };
}

export default function FriendsScreen() {
  const [items, setItems] = useState<FriendshipItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
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
      .from("friendships")
      .select(
        `
        id,
        requester_id,
        addressee_id,
        status,
        created_at,
        updated_at,
        requester:profiles!friendships_requester_id_fkey (
          id,
          full_name,
          username,
          university,
          city,
          trust_score,
          verification_status,
          completed_exchange_count
        ),
        addressee:profiles!friendships_addressee_id_fkey (
          id,
          full_name,
          username,
          university,
          city,
          trust_score,
          verification_status,
          completed_exchange_count
        )
      `
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setItems([]);
      return;
    }

    setItems((data || []) as unknown as FriendshipItem[]);
  }, []);

  useEffect(() => {
    loadFriends().finally(() => setLoading(false));
  }, [loadFriends]);

  async function onRefresh() {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  }

  async function respondToRequest(friendshipId: string, response: "accepted" | "rejected") {
    if (busyId) return;

    setBusyId(friendshipId);
    const { error } = await supabase.rpc("respond_friend_request", {
      p_friendship_id: friendshipId,
      p_response: response,
    });
    setBusyId(null);

    if (error) {
      Alert.alert("Istek guncellenemedi", error.message);
      return;
    }

    await loadFriends();
  }

  async function removeFriendship(friendshipId: string) {
    if (busyId) return;

    setBusyId(friendshipId);
    const { error } = await supabase.rpc("remove_friendship", {
      p_friendship_id: friendshipId,
    });
    setBusyId(null);

    if (error) {
      Alert.alert("Arkadaslik kaldirilamadi", error.message);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== friendshipId));
  }

  const groups = useMemo(() => {
    const friends = items.filter((item) => item.status === "accepted");
    const incoming = items.filter(
      (item) => item.status === "pending" && item.addressee_id === currentUserId
    );
    const outgoing = items.filter(
      (item) => item.status === "pending" && item.requester_id === currentUserId
    );

    return { friends, incoming, outgoing };
  }, [currentUserId, items]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
        <Text style={styles.loadingText}>Arkadaslar yukleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Arkadaslar</Text>
        <Text style={styles.title}>Sosyal kitap cevrende kal.</Text>
        <Text style={styles.description}>
          Gelen istekleri yanitla, arkadaslarini gor ve kitap sohbetlerine hizli don.
        </Text>

        <View style={styles.headerStats}>
          <HeaderStat value={groups.friends.length} label="Arkadas" />
          <HeaderStat value={groups.incoming.length} label="Gelen" />
          <HeaderStat value={groups.outgoing.length} label="Giden" />
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/matches" as never)}>
          <Text style={styles.primaryButtonText}>Eslesmelere Git</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => router.push("/feed" as never)}>
          <Text style={styles.outlineButtonText}>Sosyal Akis</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Arkadaslar yuklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FriendSection
        title="Gelen Istekler"
        emptyText="Su anda gelen arkadaslik istegin yok."
        items={groups.incoming}
        currentUserId={currentUserId}
        type="incoming"
        busyId={busyId}
        onAccept={(id) => respondToRequest(id, "accepted")}
        onReject={(id) => respondToRequest(id, "rejected")}
        onRemove={removeFriendship}
      />

      <FriendSection
        title="Arkadaslarim"
        emptyText="Henuz arkadasin yok. Eslesmelerden sohbet baslatip sosyal cevrende yeni kisiler ekleyebilirsin."
        items={groups.friends}
        currentUserId={currentUserId}
        type="friend"
        busyId={busyId}
        onAccept={(id) => respondToRequest(id, "accepted")}
        onReject={(id) => respondToRequest(id, "rejected")}
        onRemove={removeFriendship}
      />

      <FriendSection
        title="Gonderilen Istekler"
        emptyText="Cevap bekleyen arkadaslik istegin yok."
        items={groups.outgoing}
        currentUserId={currentUserId}
        type="outgoing"
        busyId={busyId}
        onAccept={(id) => respondToRequest(id, "accepted")}
        onReject={(id) => respondToRequest(id, "rejected")}
        onRemove={removeFriendship}
      />
      </ScrollView>
    </SafeAreaView>
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

function FriendSection({
  title,
  emptyText,
  items,
  currentUserId,
  type,
  busyId,
  onAccept,
  onReject,
  onRemove,
}: {
  title: string;
  emptyText: string;
  items: FriendshipItem[];
  currentUserId: string | null;
  type: FriendCardType;
  busyId: string | null;
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string) => void;
  onRemove: (friendshipId: string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionBadge}>{items.length}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <FriendCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              type={type}
              isBusy={busyId === item.id}
              onAccept={() => onAccept(item.id)}
              onReject={() => onReject(item.id)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function FriendCard({
  item,
  currentUserId,
  type,
  isBusy,
  onAccept,
  onReject,
  onRemove,
}: {
  item: FriendshipItem;
  currentUserId: string | null;
  type: FriendCardType;
  isBusy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRemove: () => void;
}) {
  const requester = first(item.requester);
  const addressee = first(item.addressee);
  const otherProfile = item.requester_id === currentUserId ? addressee : requester;
  const meta = getTypeMeta(type);

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(otherProfile)}</Text>
        </View>

        <View style={styles.cardMain}>
          <View style={styles.badgeRow}>
            <Text style={[styles.typeBadge, { color: meta.color, backgroundColor: meta.background }]}>
              {meta.label}
            </Text>
            {otherProfile?.verification_status === "verified" ? (
              <Text style={styles.verifiedBadge}>Dogrulanmis</Text>
            ) : null}
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {getProfileName(otherProfile)}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {[otherProfile?.university, otherProfile?.city].filter(Boolean).join(" • ") || "Profil bilgisi yok"}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statPill}>Guven: {otherProfile?.trust_score ?? 0}</Text>
        <Text style={styles.statPill}>Takas: {otherProfile?.completed_exchange_count ?? 0}</Text>
      </View>

      <View style={styles.cardActions}>
        {type === "incoming" ? (
          <>
            <Pressable style={styles.acceptButton} onPress={onAccept} disabled={isBusy}>
              {isBusy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptButtonText}>Kabul Et</Text>}
            </Pressable>
            <Pressable style={styles.rejectButton} onPress={onReject} disabled={isBusy}>
              <Text style={styles.rejectButtonText}>Reddet</Text>
            </Pressable>
          </>
        ) : null}

        {type === "friend" && otherProfile ? (
          <Pressable
            style={styles.acceptButton}
            onPress={() => {
              router.push({
                pathname: "/messages/[userId]",
                params: { userId: otherProfile.id },
              } as never);
            }}
          >
            <Text style={styles.acceptButtonText}>Mesaj Gonder</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.removeButton, type === "outgoing" && styles.cancelButton]}
          onPress={() => {
            Alert.alert(
              type === "outgoing" ? "Istek iptal edilsin mi?" : "Arkadaslik kaldirilsin mi?",
              type === "outgoing"
                ? "Bu arkadaslik istegini geri alacagiz."
                : "Bu kisiyi arkadas listenden kaldiracagiz.",
              [
                { text: "Vazgec", style: "cancel" },
                {
                  text: type === "outgoing" ? "Iptal Et" : "Kaldir",
                  style: "destructive",
                  onPress: onRemove,
                },
              ]
            );
          }}
          disabled={isBusy}
        >
          <Text style={styles.removeButtonText}>{type === "outgoing" ? "Iptal Et" : "Kaldir"}</Text>
        </Pressable>
      </View>
    </View>
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
  headerStatValue: { color: "#fff", fontSize: 20, fontWeight: "900" },
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
  section: { marginTop: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { color: TEXT, fontSize: 20, fontWeight: "900" },
  sectionBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },
  list: { marginTop: 10, gap: 12 },
  card: { borderRadius: 26, backgroundColor: CARD, padding: 16, shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTopRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: "rgba(46,125,91,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: GREEN, fontSize: 22, fontWeight: "900" },
  cardMain: { flex: 1, minWidth: 0 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  typeBadge: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: "900" },
  verifiedBadge: { overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(46,125,91,0.1)", paddingHorizontal: 10, paddingVertical: 6, color: GREEN, fontSize: 10, fontWeight: "900" },
  cardTitle: { marginTop: 9, color: TEXT, fontSize: 18, fontWeight: "900" },
  cardMeta: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "800" },
  dateText: { marginTop: 5, color: MUTED, fontSize: 11, fontWeight: "700" },
  statsRow: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statPill: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: BG,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
  },
  cardActions: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  acceptButton: { flexGrow: 1, borderRadius: 999, backgroundColor: GREEN, paddingHorizontal: 15, paddingVertical: 12, alignItems: "center" },
  acceptButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  rejectButton: { flexGrow: 1, borderRadius: 999, backgroundColor: "#FEE2E2", paddingHorizontal: 15, paddingVertical: 12, alignItems: "center" },
  rejectButtonText: { color: RED, fontSize: 12, fontWeight: "900" },
  removeButton: { flexGrow: 1, borderRadius: 999, backgroundColor: "rgba(46,125,91,0.1)", paddingHorizontal: 15, paddingVertical: 12, alignItems: "center" },
  cancelButton: { backgroundColor: "#F8FAFC" },
  removeButtonText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  emptyCard: { marginTop: 10, borderRadius: 26, backgroundColor: CARD, padding: 22, alignItems: "center" },
  emptyIcon: { fontSize: 31 },
  emptyText: { marginTop: 8, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "700", textAlign: "center" },
});
