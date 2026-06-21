import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import { SponsorSlot } from "@/components/sponsor-slot";
import { getAdExperienceLabel } from "@/lib/monetization";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const DANGER = "#DC2626";

type ProfileState = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  university: string | null;
  department: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  profile_visibility: string | null;
  allow_friend_requests: boolean | null;
  show_books_on_profile: boolean | null;
  show_city_on_profile: boolean | null;
  show_university_on_profile: boolean | null;
  plan_type: string | null;
  trust_score: number | null;
  verification_status: string | null;
  account_status: string | null;
  completed_exchange_count: number | null;
};

type UsageStats = {
  books: number;
  requests: number;
  unreadMessages: number;
  unreadNotifications: number;
  audioBooks: number;
  exchanges: number;
  friends: number;
  socialPosts: number;
  favoriteQuotes: number;
};

function getPlanLabel(value?: string | null) {
  if (value === "plus") return "Plus";
  if (value === "premium") return "Premium";
  if (value === "pro") return "Pro";
  return "Ucretsiz";
}

function getVerificationLabel(value?: string | null) {
  if (value === "verified") return "Dogrulanmis Ogrenci";
  if (value === "pending") return "Inceleme Bekliyor";
  if (value === "rejected") return "Reddedildi";
  return "Dogrulanmadi";
}

function getAccountStatusLabel(value?: string | null) {
  if (value === "suspended") return "Askiya Alindi";
  if (value === "banned") return "Kisitlandi";
  return "Aktif";
}

function getTrustLabel(score?: number | null) {
  const value = score ?? 0;
  if (value >= 85) return "Cok Guvenilir";
  if (value >= 65) return "Guvenilir";
  if (value >= 40) return "Gelisiyor";
  return "Yeni Profil";
}

function getVisibilityLabel(value?: string | null) {
  if (value === "public") return "Herkese Acik";
  if (value === "private") return "Gizli";
  return "Sadece Arkadaslar";
}

function firstLetter(value?: string | null) {
  const clean = (value || "K").trim();
  return clean.slice(0, 1).toLocaleUpperCase("tr-TR") || "K";
}

function displayName(profile?: ProfileState | null) {
  return profile?.full_name || profile?.username || profile?.email || "KampusRaf kullanicisi";
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [stats, setStats] = useState<UsageStats>({
    books: 0,
    requests: 0,
    unreadMessages: 0,
    unreadNotifications: 0,
    audioBooks: 0,
    exchanges: 0,
    friends: 0,
    socialPosts: 0,
    favoriteQuotes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadProfile() {
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const [
      profileRes,
      booksRes,
      requestsRes,
      messagesRes,
      notificationsRes,
      audioRes,
      exchangesRes,
      friendsRes,
      socialRes,
      favoritesRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name, username, email, university, department, city, bio, avatar_url, cover_url, profile_visibility, allow_friend_requests, show_books_on_profile, show_city_on_profile, show_university_on_profile, plan_type, trust_score, verification_status, account_status, completed_exchange_count"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("user_books").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("book_requests").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      supabase.from("audio_books").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("exchanges")
        .select("id", { count: "exact", head: true })
        .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`),
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      supabase.from("social_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("quote_favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    if (profileRes.error) {
      setErrorMessage(profileRes.error.message);
    }

    const profileData = profileRes.data;

    setProfile({
      full_name: profileData?.full_name || null,
      username: profileData?.username || null,
      email: profileData?.email || user.email || null,
      university: profileData?.university || null,
      department: profileData?.department || null,
      city: profileData?.city || null,
      bio: profileData?.bio || null,
      avatar_url: profileData?.avatar_url || null,
      cover_url: profileData?.cover_url || null,
      profile_visibility: profileData?.profile_visibility || "friends",
      allow_friend_requests: profileData?.allow_friend_requests ?? true,
      show_books_on_profile: profileData?.show_books_on_profile ?? true,
      show_city_on_profile: profileData?.show_city_on_profile ?? true,
      show_university_on_profile: profileData?.show_university_on_profile ?? true,
      plan_type: profileData?.plan_type || "free",
      trust_score: profileData?.trust_score ?? 0,
      verification_status: profileData?.verification_status || null,
      account_status: profileData?.account_status || "active",
      completed_exchange_count: profileData?.completed_exchange_count ?? 0,
    });

    setStats({
      books: booksRes.count || 0,
      requests: requestsRes.count || 0,
      unreadMessages: messagesRes.count || 0,
      unreadNotifications: notificationsRes.count || 0,
      audioBooks: audioRes.count || 0,
      exchanges: exchangesRes.count || 0,
      friends: friendsRes.count || 0,
      socialPosts: socialRes.count || 0,
      favoriteQuotes: favoritesRes.count || 0,
    });
  }

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  async function handleSignOut() {
    Alert.alert("Cikis yapilsin mi?", "Mobil oturumunu kapatacagiz.", [
      { text: "Vazgec", style: "cancel" },
      {
        text: "Cikis Yap",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/auth/login");
        },
      },
    ]);
  }

  const profileCompletion = useMemo(() => {
    const fields = [profile?.full_name, profile?.username, profile?.university, profile?.department, profile?.city, profile?.bio];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Profil yukleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
    >
      <View style={styles.hero}>
        <View style={styles.cover}>
          {profile?.cover_url ? (
            <Image source={{ uri: profile.cover_url }} style={styles.coverImage} contentFit="cover" accessibilityLabel="Kapak gorseli" />
          ) : (
            <View style={styles.coverFallback}>
              <Text style={styles.coverFallbackText}>Sosyal Profil</Text>
            </View>
          )}
        </View>

        <View style={styles.heroBody}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} contentFit="cover" accessibilityLabel={displayName(profile)} />
            ) : (
              <Text style={styles.avatarText}>{firstLetter(displayName(profile))}</Text>
            )}
          </View>

          <Text style={styles.name} numberOfLines={2}>
            {displayName(profile)}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{profile?.username || "kullaniciadi"}
          </Text>

          <View style={styles.badgeRow}>
            <Text style={styles.badge}>{getPlanLabel(profile?.plan_type)}</Text>
            <Text style={[styles.badge, profile?.verification_status === "verified" && styles.goldBadge]}>
              {getVerificationLabel(profile?.verification_status)}
            </Text>
            <Text style={[styles.badge, profile?.account_status !== "active" && styles.dangerBadge]}>
              {getAccountStatusLabel(profile?.account_status)}
            </Text>
          </View>

          <View style={styles.heroStats}>
            <HeroStat value={String(profile?.trust_score ?? 0)} label="Guven" />
            <HeroStat value={String(profile?.completed_exchange_count ?? 0)} label="Takas" />
            <HeroStat value={`%${profileCompletion}`} label="Profil" />
          </View>

          <Pressable style={styles.editHeroButton} onPress={() => router.push("/profile/edit")}>
            <Text style={styles.editHeroButtonText}>Profili Duzenle</Text>
          </Pressable>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Profil yuklenirken uyari olustu</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sosyal Profil Ozeti</Text>
          <Text style={styles.sectionBadge}>{getTrustLabel(profile?.trust_score)}</Text>
        </View>

        <InfoRow label="Profil gorunurlugu" value={getVisibilityLabel(profile?.profile_visibility)} />
        <InfoRow label="Arkadaslik istekleri" value={profile?.allow_friend_requests ? "Acik" : "Kapali"} />
        <InfoRow label="Kitaplari goster" value={profile?.show_books_on_profile ? "Acik" : "Kapali"} />
        <InfoRow label="Universiteyi goster" value={profile?.show_university_on_profile ? "Acik" : "Kapali"} />
        <InfoRow label="Sehri goster" value={profile?.show_city_on_profile ? "Acik" : "Kapali"} />
        <InfoRow label="Reklam deneyimi" value={getAdExperienceLabel(profile?.plan_type)} />
      </View>

      <SponsorSlot planType={profile?.plan_type} compact title="Profil sponsoru" />

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
          <Text style={styles.sectionBadge}>{getPlanLabel(profile?.plan_type)}</Text>
        </View>

        <InfoRow label="Kullanici adi" value={profile?.username ? `@${profile.username}` : "Belirtilmemis"} />
        <InfoRow label="Universite" value={profile?.university || "Belirtilmemis"} />
        <InfoRow label="Bolum" value={profile?.department || "Belirtilmemis"} />
        <InfoRow label="Sehir" value={profile?.city || "Belirtilmemis"} />
        <InfoRow label="Kisa Bio" value={profile?.bio || "Henuz bio eklenmemis"} />
      </View>

      <View style={styles.grid}>
        <StatCard icon="Raf" label="Rafim" value={stats.books} />
        <StatCard icon="Ara" label="Aradiklarim" value={stats.requests} />
        <StatCard icon="Mesaj" label="Okunmamis" value={stats.unreadMessages} />
        <StatCard icon="Zil" label="Bildirim" value={stats.unreadNotifications} />
        <StatCard icon="Ses" label="Sesli Raf" value={stats.audioBooks} />
        <StatCard icon="Takas" label="Takas" value={stats.exchanges} />
        <StatCard icon="Ark" label="Arkadas" value={stats.friends} />
        <StatCard icon="Akis" label="Paylasim" value={stats.socialPosts} />
        <StatCard icon="Alinti" label="Favori" value={stats.favoriteQuotes} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Hizli Erisim</Text>

        <QuickButton label="Profil Bilgilerini Duzenle" onPress={() => router.push("/profile/edit")} />
        <QuickButton label="Ogrenci Dogrulama" onPress={() => router.push("/student-verification" as never)} />
        <QuickButton label="Rastgele Raf" onPress={() => router.push("/random-shelf" as never)} />
        <QuickButton label="Favori Alintilarim" onPress={() => router.push("/random-shelf/favorites" as never)} />
        <QuickButton label="Sosyal Akis" onPress={() => router.push("/feed")} />
        <QuickButton label="Paylasim Yap" onPress={() => router.push("/share")} />
        <QuickButton label="Arkadaslar" onPress={() => router.push("/friends" as never)} />
        <QuickButton label="Mesajlar" onPress={() => router.push("/messages" as never)} />
        <QuickButton label="Sesli Raf" onPress={() => router.push("/audio" as never)} />
        <QuickButton label="Hakkimizda" onPress={() => router.push("/about" as never)} />
        <QuickButton label="Bize Ulasin" onPress={() => router.push("/contact" as never)} />
      </View>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Profil merkezi</Text>
        <Text style={styles.noticeText}>
          Mobil profil merkezi artik avatar, kapak ve sosyal gorunurluk mantigini web ile ayni alanlara yazar.
        </Text>
      </View>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Cikis Yap</Text>
      </Pressable>
    </ScrollView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStatBox}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.quickButton, pressed && styles.pressed]} onPress={onPress}>
      <Text style={styles.quickButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  loadingText: { marginTop: 10, color: MUTED, fontWeight: "800" },
  hero: {
    borderRadius: 30,
    backgroundColor: GREEN,
    overflow: "hidden",
    shadowColor: GREEN,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  cover: { height: 150, backgroundColor: "#1F2933" },
  coverImage: { width: "100%", height: "100%" },
  coverFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1F2933" },
  coverFallbackText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  heroBody: { padding: 22, paddingTop: 0, alignItems: "center" },
  avatar: {
    marginTop: -38,
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: GREEN, fontSize: 34, fontWeight: "900" },
  name: { marginTop: 15, color: "#fff", fontSize: 25, lineHeight: 31, fontWeight: "900", textAlign: "center" },
  username: { marginTop: 5, color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: "700", maxWidth: "100%" },
  badgeRow: { marginTop: 15, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  goldBadge: { backgroundColor: AMBER },
  dangerBadge: { backgroundColor: DANGER },
  heroStats: { marginTop: 18, flexDirection: "row", gap: 8, width: "100%" },
  heroStatBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 12,
    alignItems: "center",
  },
  heroStatValue: { color: "#fff", fontSize: 20, fontWeight: "900" },
  heroStatLabel: { marginTop: 3, color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "900" },
  editHeroButton: {
    marginTop: 16,
    width: "100%",
    borderRadius: 18,
    backgroundColor: "#fff",
    paddingVertical: 14,
    alignItems: "center",
  },
  editHeroButtonText: { color: GREEN, fontSize: 14, fontWeight: "900" },
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
  card: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: "#fff",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionTitle: { color: TEXT, fontSize: 19, fontWeight: "900" },
  sectionBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: GREEN,
    fontSize: 10,
    fontWeight: "900",
  },
  infoRow: { marginTop: 12, borderRadius: 18, backgroundColor: BG, padding: 14 },
  infoLabel: { color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  infoValue: { marginTop: 4, color: TEXT, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  grid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48%",
    minHeight: 108,
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 15,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statIcon: { color: MUTED, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  statValue: { marginTop: 9, color: GREEN, fontSize: 25, fontWeight: "900" },
  statLabel: { marginTop: 2, color: MUTED, fontSize: 12, fontWeight: "900" },
  quickButton: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingVertical: 15,
    alignItems: "center",
  },
  quickButtonText: { color: GREEN, fontSize: 14, fontWeight: "900" },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  noticeCard: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noticeTitle: { color: "#92400E", fontSize: 15, fontWeight: "900" },
  noticeText: { marginTop: 6, color: "#B45309", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  signOutButton: { marginTop: 16, borderRadius: 999, backgroundColor: "#FEE2E2", paddingVertical: 16, alignItems: "center" },
  signOutText: { color: DANGER, fontSize: 14, fontWeight: "900" },
});
