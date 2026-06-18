import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import { AnimatedAppear, PressableScale } from "@/components/animated-primitives";
import { SponsorSlot } from "@/components/sponsor-slot";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const DARK_GREEN = "#25684C";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";
const brandSymbol = require("../../assets/images/brand-symbol.png");

const initialState: DashboardState = {
  name: "KampusRaf kullanicisi",
  email: null,
  username: null,
  plan: "free",
  verificationStatus: "unverified",
  books: 0,
  requests: 0,
  unreadMessages: 0,
  unreadNotifications: 0,
  audioBooks: 0,
  exchanges: 0,
  friends: 0,
  socialPosts: 0,
  favoriteQuotes: 0,
};

type DashboardState = {
  name: string;
  email: string | null;
  username: string | null;
  plan: string;
  verificationStatus: string;
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

function planLabel(value: string) {
  if (value === "plus") return "Plus";
  if (value === "premium") return "Premium";
  if (value === "pro") return "Pro";
  return "Ucretsiz";
}

function verificationLabel(value: string) {
  if (value === "verified") return "Dogrulanmis Ogrenci";
  if (value === "pending") return "Dogrulama Bekliyor";
  if (value === "rejected") return "Dogrulama Reddedildi";
  return "Dogrulanmadi";
}

function getPrimaryAction(state: DashboardState) {
  if (state.unreadMessages > 0) {
    return {
      title: `${state.unreadMessages} okunmamis mesajin var`,
      description: "Sohbetlerini kontrol ederek takas surecini kacirma.",
      button: "Mesajlara Git",
      route: "/messages",
      icon: "Mesaj",
    };
  }

  if (state.unreadNotifications > 0) {
    return {
      title: `${state.unreadNotifications} yeni bildirimin var`,
      description: "Eslesme, yorum, begeni veya sistem bildirimlerini kontrol et.",
      button: "Bildirimleri Ac",
      route: "/notifications",
      icon: "Zil",
    };
  }

  if (state.favoriteQuotes === 0) {
    return {
      title: "Rastgele Raf ile ilk alintini kesfet",
      description: "Zar at, begendigini favorilerine ekle ve sonra sosyal akisa tasiyabil.",
      button: "Rastgele Raf",
      route: "/random-shelf",
      icon: "Zar",
    };
  }

  if (state.books === 0) {
    return {
      title: "Rafina ilk kitabini ekle",
      description: "Kitabini mobil rafina ekle; diger ogrenciler arama ekraninda seni bulabilsin.",
      button: "Kitap Ekle",
      route: "/books/add",
      icon: "Raf",
    };
  }

  return {
    title: "Bugun sosyal akis ve alinti alanina goz at",
    description: "Paylasimlarini, favori alintilarini ve kampusteki kitap akislarini tek yerden yonet.",
    button: "Akisi Ac",
    route: "/feed",
    icon: "Akis",
  };
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [state, setState] = useState<DashboardState>(initialState);

  const loadDashboard = useCallback(async () => {
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

    const [
      profileRes,
      booksRes,
      requestsRes,
      messagesRes,
      notificationsRes,
      audioRes,
      exchangesRes,
      friendsRes,
      socialPostsRes,
      favoriteQuotesRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, username, plan_type, verification_status")
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

    const firstError = [
      profileRes.error,
      booksRes.error,
      requestsRes.error,
      messagesRes.error,
      notificationsRes.error,
      audioRes.error,
      exchangesRes.error,
      friendsRes.error,
      socialPostsRes.error,
      favoriteQuotesRes.error,
    ].find(Boolean);

    if (firstError) {
      setErrorMessage(firstError.message);
    }

    const profile = profileRes.data;

    setState({
      name: profile?.full_name || profile?.username || user.email || "KampusRaf kullanicisi",
      email: user.email || null,
      username: profile?.username || null,
      plan: profile?.plan_type || "free",
      verificationStatus: profile?.verification_status || "unverified",
      books: booksRes.count || 0,
      requests: requestsRes.count || 0,
      unreadMessages: messagesRes.count || 0,
      unreadNotifications: notificationsRes.count || 0,
      audioBooks: audioRes.count || 0,
      exchanges: exchangesRes.count || 0,
      friends: friendsRes.count || 0,
      socialPosts: socialPostsRes.count || 0,
      favoriteQuotes: favoriteQuotesRes.count || 0,
    });
  }, []);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, [loadDashboard]);

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  const primaryAction = getPrimaryAction(state);
  const socialEnergy = useMemo(
    () => state.socialPosts + state.favoriteQuotes + state.friends,
    [state.favoriteQuotes, state.friends, state.socialPosts]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
        <Text style={styles.loadingText}>KampusRaf yukleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
    >
      <AnimatedAppear style={styles.hero}>
        <View style={styles.logoBox}>
          <Image source={brandSymbol} style={styles.logoImage} contentFit="contain" />
        </View>

        <Text style={styles.eyebrow}>Mobil Panel</Text>
        <Text style={styles.title}>Merhaba, {state.name}</Text>
        <Text style={styles.description}>
          Kitaplarini, sosyal akislarini, favori alintilarini ve Sesli Raf iceriklerini tek merkezden takip et.
        </Text>

        <View style={styles.badgeRow}>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>Paket: {planLabel(state.plan)}</Text>
          </View>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>{verificationLabel(state.verificationStatus)}</Text>
          </View>
        </View>
      </AnimatedAppear>

      {errorMessage ? (
        <AnimatedAppear delay={60} style={styles.errorBox}>
          <Text style={styles.errorTitle}>Veriler yuklenirken uyari</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </AnimatedAppear>
      ) : null}

      <AnimatedAppear delay={80} style={styles.primaryCard}>
        <Text style={styles.primaryIcon}>{primaryAction.icon}</Text>
        <View style={styles.primaryContent}>
          <Text style={styles.primaryTitle}>{primaryAction.title}</Text>
          <Text style={styles.primaryDescription}>{primaryAction.description}</Text>
        </View>

        <PressableScale style={styles.primaryButton} onPress={() => router.push(primaryAction.route as never)}>
          <Text style={styles.primaryButtonText}>{primaryAction.button}</Text>
        </PressableScale>
      </AnimatedAppear>

      <SponsorSlot planType={state.plan} title="Panel sponsoru" />

      <AnimatedAppear delay={130} style={styles.grid}>
        <StatCard icon="Raf" label="Rafim" value={state.books} />
        <StatCard icon="Ara" label="Aradiklarim" value={state.requests} />
        <StatCard icon="Mesaj" label="Okunmamis" value={state.unreadMessages} highlight={state.unreadMessages > 0} />
        <StatCard icon="Zil" label="Bildirim" value={state.unreadNotifications} highlight={state.unreadNotifications > 0} />
        <StatCard icon="Ses" label="Sesli Raf" value={state.audioBooks} />
        <StatCard icon="Takas" label="Takas" value={state.exchanges} />
        <StatCard icon="Ark" label="Arkadas" value={state.friends} />
        <StatCard icon="Akis" label="Paylasim" value={state.socialPosts} />
        <StatCard icon="Alinti" label="Favori" value={state.favoriteQuotes} />
      </AnimatedAppear>

      <AnimatedAppear delay={180} style={styles.quickCard}>
        <Text style={styles.sectionTitle}>Sosyal ve Alinti</Text>
        <Text style={styles.sectionDescription}>
          Web tarafindaki profil-paylasim-akis-zar bagini mobilde daha gorunur yaptik. Burasi o merkezin hizli kontrol alani.
        </Text>

        <View style={styles.dualRow}>
          <QuickAction label="Sosyal Akis" hint="Gonderileri kontrol et" route="/feed" accent="green" />
          <QuickAction label="Paylasim Yap" hint="Galeri ya da kamera" route="/share" accent="amber" />
        </View>

        <View style={styles.dualRow}>
          <QuickAction label="Rastgele Raf" hint="Zar at ve alinti bul" route="/random-shelf" accent="green" />
          <QuickAction
            label="Favori Alintilarim"
            hint="Kaydettigin alintilar"
            route="/random-shelf/favorites"
            accent="amber"
          />
        </View>

        <View style={styles.socialSummary}>
          <Text style={styles.socialSummaryValue}>{socialEnergy}</Text>
          <Text style={styles.socialSummaryLabel}>Sosyal enerji puani</Text>
          <Text style={styles.socialSummaryText}>
            Arkadas, paylasim ve favori alinti hareketlerine gore hesaplanan hizli bir momentum ozeti.
          </Text>
        </View>
      </AnimatedAppear>

      <AnimatedAppear delay={230} style={styles.quickCard}>
        <Text style={styles.sectionTitle}>Kitap ve Takas</Text>
        <Text style={styles.sectionDescription}>Gunluk kullanimda en cok ihtiyacin olan akislar burada.</Text>

        <PressableScale style={styles.quickButton} onPress={() => router.push("/explore" as never)}>
          <Text style={styles.quickButtonText}>Kitap Ara</Text>
        </PressableScale>

        <PressableScale style={styles.outlineButton} onPress={() => router.push("/my-books" as never)}>
          <Text style={styles.outlineButtonText}>Rafimi Ac</Text>
        </PressableScale>

        <PressableScale style={styles.outlineButton} onPress={() => router.push("/books/add" as never)}>
          <Text style={styles.outlineButtonText}>Kitap Ekle</Text>
        </PressableScale>

        <PressableScale style={styles.outlineButton} onPress={() => router.push("/requests" as never)}>
          <Text style={styles.outlineButtonText}>Aradiklarim</Text>
        </PressableScale>

        <PressableScale style={styles.outlineButton} onPress={() => router.push("/matches" as never)}>
          <Text style={styles.outlineButtonText}>Eslesmeler</Text>
        </PressableScale>

        <PressableScale style={styles.outlineButton} onPress={() => router.push("/exchanges" as never)}>
          <Text style={styles.outlineButtonText}>Takaslar</Text>
        </PressableScale>

        <PressableScale style={styles.outlineButton} onPress={() => router.push("/friends" as never)}>
          <Text style={styles.outlineButtonText}>Arkadaslar</Text>
        </PressableScale>

        <PressableScale style={[styles.quickButton, styles.amberButton]} onPress={() => router.push("/audio" as never)}>
          <Text style={styles.quickButtonText}>Sesli Rafi Ac</Text>
        </PressableScale>

        <PressableScale style={styles.outlineButton} onPress={() => router.push("/messages" as never)}>
          <Text style={styles.outlineButtonText}>Mesajlari Ac</Text>
        </PressableScale>

        <PressableScale style={styles.outlineButton} onPress={() => router.push("/notifications" as never)}>
          <Text style={styles.outlineButtonText}>Bildirimleri Ac</Text>
        </PressableScale>

        <PressableScale style={styles.outlineButton} onPress={() => router.push("/profile" as never)}>
          <Text style={styles.outlineButtonText}>Profilimi Ac</Text>
        </PressableScale>
      </AnimatedAppear>
    </ScrollView>
  );
}

function QuickAction({
  label,
  hint,
  route,
  accent,
}: {
  label: string;
  hint: string;
  route: string;
  accent: "green" | "amber";
}) {
  return (
    <PressableScale
      style={[styles.quickActionCard, accent === "amber" && styles.quickActionCardAmber]}
      onPress={() => router.push(route as never)}
    >
      <Text style={[styles.quickActionTitle, accent === "amber" && styles.quickActionTitleAmber]}>{label}</Text>
      <Text style={[styles.quickActionHint, accent === "amber" && styles.quickActionHintAmber]}>{hint}</Text>
    </PressableScale>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: string;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statCard, highlight && styles.highlightCard]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, highlight && styles.highlightValue]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    padding: 22,
    shadowColor: GREEN,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoImage: { width: 54, height: 54 },
  eyebrow: { color: "#F5EBDD", fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { marginTop: 12, color: "#fff", fontSize: 29, lineHeight: 36, fontWeight: "900" },
  description: { marginTop: 12, color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  badgeRow: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  planBadge: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  planText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  errorBox: {
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: "#FEF2F2",
    padding: 15,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: { color: "#B91C1C", fontWeight: "900", fontSize: 13 },
  errorText: { marginTop: 5, color: "#991B1B", fontWeight: "700", fontSize: 12, lineHeight: 18 },
  primaryCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  primaryIcon: { color: GREEN, fontSize: 16, fontWeight: "900", textTransform: "uppercase" },
  primaryContent: { marginTop: 10 },
  primaryTitle: { color: TEXT, fontSize: 19, fontWeight: "900" },
  primaryDescription: { marginTop: 7, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  primaryButton: { marginTop: 14, borderRadius: 18, backgroundColor: GREEN, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  grid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48%",
    minHeight: 112,
    borderRadius: 24,
    backgroundColor: CARD,
    padding: 15,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  highlightCard: { borderWidth: 1, borderColor: "rgba(245,158,11,0.45)", backgroundColor: "#FFFBEB" },
  statIcon: { color: MUTED, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  statValue: { marginTop: 10, color: GREEN, fontSize: 27, fontWeight: "900" },
  highlightValue: { color: AMBER },
  statLabel: { marginTop: 2, color: MUTED, fontSize: 12, fontWeight: "900" },
  quickCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: { color: TEXT, fontSize: 19, fontWeight: "900" },
  sectionDescription: { marginTop: 6, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  dualRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  quickActionCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "rgba(46,125,91,0.1)",
    padding: 16,
    minHeight: 102,
    justifyContent: "flex-end",
  },
  quickActionCardAmber: { backgroundColor: "#FFFBEB" },
  quickActionTitle: { color: GREEN, fontSize: 15, fontWeight: "900" },
  quickActionTitleAmber: { color: "#B45309" },
  quickActionHint: { marginTop: 5, color: DARK_GREEN, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  quickActionHintAmber: { color: "#92400E" },
  socialSummary: {
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: BG,
    padding: 16,
    alignItems: "center",
  },
  socialSummaryValue: { color: GREEN, fontSize: 28, fontWeight: "900" },
  socialSummaryLabel: { marginTop: 2, color: TEXT, fontSize: 14, fontWeight: "900" },
  socialSummaryText: { marginTop: 6, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center" },
  quickButton: { marginTop: 12, borderRadius: 18, backgroundColor: GREEN, paddingVertical: 15, alignItems: "center" },
  amberButton: { backgroundColor: AMBER },
  quickButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  outlineButton: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.18)",
    paddingVertical: 15,
    alignItems: "center",
  },
  outlineButtonText: { color: DARK_GREEN, fontSize: 14, fontWeight: "900" },
});
