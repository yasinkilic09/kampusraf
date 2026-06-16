import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { AppHero, LoadingState } from "@/components/app-ui";
import {
  RandomQuoteRow,
  getDailyRollLimit,
  getFriendlyRollError,
  getQuoteDisplayText,
  getQuoteShareText,
} from "@/lib/random-quote";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";
const DICE_PIPS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const DIM_DICE_PIPS = new Set([1, 3, 5, 7]);

type ProfileState = {
  full_name: string | null;
  username: string | null;
  plan_type: string | null;
};

function getDisplayName(profile: ProfileState | null, email: string | null) {
  return profile?.full_name || profile?.username || email || "KampusRaf kullanicisi";
}

function getPlanLabel(planType?: string | null) {
  if (planType === "plus") return "Plus";
  if (planType === "premium") return "Premium";
  if (planType === "pro") return "Pro";
  return "Free";
}

function waitForDiceReveal(startedAt: number) {
  const minimumDuration = 900;
  const remaining = Math.max(minimumDuration - (Date.now() - startedAt), 0);

  return new Promise((resolve) => setTimeout(resolve, remaining));
}

export default function RandomShelfScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [quote, setQuote] = useState<RandomQuoteRow | null>(null);
  const [favoriteQuoteIds, setFavoriteQuoteIds] = useState<Set<string>>(new Set());
  const [shareVisibility, setShareVisibility] = useState<"friends" | "public">("public");
  const [rollsUsed, setRollsUsed] = useState(0);
  const [rollsLimit, setRollsLimit] = useState(2);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [sharingToFeed, setSharingToFeed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    loadData().finally(() => setLoading(false));

    return () => {
      Speech.stop();
    };
  }, []);

  async function loadData() {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (sessionError) {
      setMessage(sessionError.message);
      setMessageType("error");
    }

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || null);

    const today = new Date().toISOString().slice(0, 10);

    const [{ data: profileData }, { count }, { data: favoritesData }] = await Promise.all([
      supabase.from("profiles").select("full_name, username, plan_type").eq("id", user.id).maybeSingle(),
      supabase.from("quote_rolls").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("roll_date", today),
      supabase.from("quote_favorites").select("quote_id").eq("user_id", user.id),
    ]);

    const nextProfile = (profileData || null) as ProfileState | null;
    setProfile(nextProfile);
    setRollsLimit(getDailyRollLimit(nextProfile?.plan_type || "free"));
    setRollsUsed(count || 0);
    setFavoriteQuoteIds(new Set((favoritesData || []).map((item) => item.quote_id)));
  }

  async function handleRoll() {
    if (rolling || rollsUsed >= rollsLimit) return;

    Speech.stop();
    setIsSpeaking(false);
    setRolling(true);
    setMessage(null);
    const startedAt = Date.now();

    const { data, error } = await supabase.rpc("roll_random_quote");
    await waitForDiceReveal(startedAt);

    if (error) {
      setMessage(getFriendlyRollError(error.message));
      setMessageType("error");
      setRolling(false);
      return;
    }

    const nextQuote = Array.isArray(data) ? ((data[0] || null) as RandomQuoteRow | null) : ((data || null) as RandomQuoteRow | null);

    if (!nextQuote) {
      setMessage("Rastgele alinti getirilemedi.");
      setMessageType("error");
      setRolling(false);
      return;
    }

    setQuote(nextQuote);
    setRollsUsed(nextQuote.rolls_used);
    setRollsLimit(nextQuote.rolls_limit);
    setMessage("Rastgele Raf alintin hazir.");
    setMessageType("success");
    setRolling(false);
  }

  async function handleFavoriteToggle() {
    if (!quote || !userId || favoriteBusy) return;

    const alreadyFavorited = favoriteQuoteIds.has(quote.quote_id);
    setFavoriteBusy(true);

    try {
      if (alreadyFavorited) {
        const { error } = await supabase.from("quote_favorites").delete().eq("user_id", userId).eq("quote_id", quote.quote_id);

        if (error) throw error;

        setFavoriteQuoteIds((current) => {
          const next = new Set(current);
          next.delete(quote.quote_id);
          return next;
        });
        setMessage("Alinti favorilerinden kaldirildi.");
      } else {
        const { data: quoteItem } = await supabase
          .from("quote_items")
          .select("id, status, is_active")
          .eq("id", quote.quote_id)
          .maybeSingle();

        if (!quoteItem || quoteItem.status !== "approved" || !quoteItem.is_active) {
          throw new Error("Bu alinti su anda favorilere eklenemez.");
        }

        const { error } = await supabase.from("quote_favorites").upsert(
          {
            user_id: userId,
            quote_id: quote.quote_id,
          },
          {
            onConflict: "user_id,quote_id",
            ignoreDuplicates: true,
          }
        );

        if (error) throw error;

        setFavoriteQuoteIds((current) => new Set([...current, quote.quote_id]));
        setMessage("Alinti favorilerine eklendi.");
      }

      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Favori islemi sirasinda bir sorun olustu.");
      setMessageType("error");
    } finally {
      setFavoriteBusy(false);
    }
  }

  async function handleCopy() {
    if (!quote) return;

    await Clipboard.setStringAsync(getQuoteShareText(quote));
    setMessage("Alinti panoya kopyalandi.");
    setMessageType("success");
  }

  async function handleShare() {
    if (!quote) return;

    await Share.share({
      title: "KampusRaf Rastgele Raf",
      message: getQuoteShareText(quote),
    });
  }

  function handleSpeak() {
    if (!quote) return;

    Speech.stop();

    const text = `${getQuoteDisplayText(quote)} ${quote.book_title}${quote.book_author ? `, ${quote.book_author}` : ""}`;

    Speech.speak(text, {
      language: quote.quote_text_tr || quote.original_language === "tr" ? "tr-TR" : "en-US",
      rate: 0.95,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }

  async function handleShareToFeed() {
    if (!quote || !userId || sharingToFeed) return;

    if (!favoriteQuoteIds.has(quote.quote_id)) {
      Alert.alert("Favori gerekli", "Web surumundeki gibi once alintiyi favorilerine eklemelisin.");
      return;
    }

    setSharingToFeed(true);

    const caption = `"${getQuoteDisplayText(quote)}"\n\n${
      quote.book_author ? `${quote.book_title} - ${quote.book_author}` : quote.book_title
    }\n\n#KampusRaf #RastgeleRaf`;

    const { error } = await supabase.from("social_posts").insert({
      user_id: userId,
      post_type: "quote",
      quote_id: quote.quote_id,
      image_url: null,
      caption,
      visibility: shareVisibility,
      related_book_id: null,
    });

    setSharingToFeed(false);

    if (error) {
      Alert.alert("Akisa tasinamadi", error.message);
      return;
    }

    Alert.alert("Akisa tasindi", "Alinti sosyal akista paylasildi.");
  }

  function openBookSearch() {
    if (!quote?.book_title) return;

    router.push({
      pathname: "/explore",
      params: { q: quote.book_title },
    } as never);
  }

  const remainingRolls = Math.max(rollsLimit - rollsUsed, 0);
  const isCurrentFavorite = quote ? favoriteQuoteIds.has(quote.quote_id) : false;
  const progressPercent = rollsLimit <= 0 ? 0 : Math.min((rollsUsed / rollsLimit) * 100, 100);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <LoadingState label="Rastgele Raf yükleniyor..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <AppHero
          eyebrow="Rastgele Raf"
          title="Zar at, kısa bir kitap keşfi gelsin."
          description={`${getDisplayName(profile, email)} için günlük haklar hazır. Alıntıyı dinleyebilir, favorileyebilir veya akışa taşıyabilirsin.`}
          onBack={() => router.back()}
        >
          <View style={styles.heroActionRow}>
            <Pressable style={styles.favoriteLinkButton} onPress={() => router.push("/random-shelf/favorites" as never)}>
              <Text style={styles.favoriteLinkButtonText}>Favoriler</Text>
            </Pressable>
          </View>
          <View style={styles.statsRow}>
            <StatChip value={`${rollsUsed}/${rollsLimit}`} label="Bugünkü Hak" />
            <StatChip value={`${remainingRolls}`} label="Kalan Zar" />
            <StatChip value={getPlanLabel(profile?.plan_type)} label="Paket" />
          </View>
        </AppHero>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.limitCard}>
          <Text style={styles.limitTitle}>Gunluk limitler</Text>
          <View style={styles.limitGrid}>
            <LimitBox plan="Free" value="2 / gun" />
            <LimitBox plan="Plus" value="3 / gun" />
            <LimitBox plan="Premium" value="10 / gun" />
            <LimitBox plan="Pro" value="25 / gun" />
          </View>
        </View>

        {rolling ? (
          <RollingDiceCard />
        ) : quote ? (
          <View style={styles.quoteCard}>
            <View style={styles.quoteBadgeRow}>
              {quote.mood ? <Badge label={quote.mood} /> : null}
              {quote.topic ? <Badge label={quote.topic} /> : null}
              <Badge label={`~${quote.estimated_read_seconds} sn`} amber />
              {isCurrentFavorite ? <Badge label="Favoride" light /> : null}
            </View>

            <Text style={styles.quoteOriginalText}>{`"${quote.quote_text}"`}</Text>

            {quote.original_language !== "tr" && quote.quote_text_tr ? (
              <View style={styles.translationBox}>
                <Text style={styles.translationLabel}>Turkce ceviri</Text>
                    <Text style={styles.translationText}>{`"${quote.quote_text_tr}"`}</Text>
              </View>
            ) : null}

            <View style={styles.quoteMetaBox}>
              <Text style={styles.quoteBookTitle}>{quote.book_title}</Text>
              <Text style={styles.quoteBookMeta}>{quote.book_author || "Yazar bilgisi yok"}</Text>
              {quote.source_name ? <Text style={styles.quoteBookSource}>Kaynak: {quote.source_name}</Text> : null}
            </View>

            <Text style={styles.inputLabel}>Akisa Paylasim Gorunurlugu</Text>
            <View style={styles.segmentRow}>
              <SegmentButton
                label="Arkadaslar"
                active={shareVisibility === "friends"}
                onPress={() => setShareVisibility("friends")}
              />
              <SegmentButton label="Herkes" active={shareVisibility === "public"} onPress={() => setShareVisibility("public")} />
            </View>

            <View style={styles.actionGrid}>
              <ActionButton label={isSpeaking ? "Okunuyor..." : "Dinle"} onPress={handleSpeak} disabled={isSpeaking} />
              <ActionButton
                label={favoriteBusy ? "Kaydediliyor..." : isCurrentFavorite ? "Favoriden Cikar" : "Favorilere Ekle"}
                onPress={handleFavoriteToggle}
                disabled={favoriteBusy}
                amber
              />
              <ActionButton label="Kopyala" onPress={handleCopy} outlined />
              <ActionButton label="Paylas" onPress={handleShare} outlined />
              <ActionButton label="Kitabi Ara" onPress={openBookSearch} outlined />
              <ActionButton label={sharingToFeed ? "Tasinıyor..." : "Akisa Tas"} onPress={handleShareToFeed} disabled={sharingToFeed} outlined />
              {isSpeaking ? <ActionButton label="Durdur" onPress={() => Speech.stop()} outlined /> : null}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyDice}>Zar</Text>
            <Text style={styles.emptyTitle}>Bugunun ilk zarini at</Text>
            <Text style={styles.emptyText}>
              Rastgele Raf sana kisa bir alinti getirsin. Sonra istersen kopyalayabilir, favorileyebilir veya akisa tasiyabilirsin.
            </Text>
          </View>
        )}

        {message ? (
          <View style={[styles.messageBox, messageType === "error" ? styles.errorBox : styles.successBox]}>
            <Text style={[styles.messageText, messageType === "error" ? styles.errorMessageText : styles.successMessageText]}>
              {message}
            </Text>
          </View>
        ) : null}

        <Pressable style={[styles.rollButton, (rolling || remainingRolls <= 0) && styles.disabledSurface]} onPress={handleRoll} disabled={rolling || remainingRolls <= 0}>
          {rolling ? (
            <View style={styles.rollButtonContent}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.rollButtonText}>Zar dönüyor...</Text>
            </View>
          ) : (
            <Text style={styles.rollButtonText}>{quote ? "Yeni Zar At" : "Zar At"}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function RollingDiceCard() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 650, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const diceStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.rollingCard}>
      <View style={styles.diceStage}>
        <Animated.View style={[styles.diceFace, diceStyle]}>
          {DICE_PIPS.map((index) => (
            <View
              key={index}
              style={[styles.dicePip, DIM_DICE_PIPS.has(index) && styles.dicePipDim]}
            />
          ))}
        </Animated.View>
      </View>

      <Text style={styles.rollingTitle}>Zar dönüyor...</Text>
      <Text style={styles.rollingText}>Raf karışıyor, birazdan sana yeni bir alıntı çıkacak.</Text>
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipValue}>{value}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

function LimitBox({ plan, value }: { plan: string; value: string }) {
  return (
    <View style={styles.limitBox}>
      <Text style={styles.limitPlan}>{plan}</Text>
      <Text style={styles.limitValue}>{value}</Text>
    </View>
  );
}

function Badge({ label, amber = false, light = false }: { label: string; amber?: boolean; light?: boolean }) {
  return (
    <View style={[styles.badge, amber && styles.badgeAmber, light && styles.badgeLight]}>
      <Text style={[styles.badgeText, light && styles.badgeLightText]}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  outlined = false,
  amber = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  outlined?: boolean;
  amber?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.actionButton,
        outlined && styles.actionButtonOutlined,
        amber && styles.actionButtonAmber,
        disabled && styles.disabledSurface,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.actionButtonText,
          outlined && styles.actionButtonOutlinedText,
          amber && styles.actionButtonAmberText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
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
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  heroActionRow: { alignItems: "flex-start" },
  backButton: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  favoriteLinkButton: {
    borderRadius: 999,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  favoriteLinkButtonText: { color: GREEN, fontSize: 12, fontWeight: "900" },
  eyebrow: { marginTop: 16, color: "#F5EBDD", fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { marginTop: 12, color: "#fff", fontSize: 28, lineHeight: 34, fontWeight: "900" },
  description: { marginTop: 10, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  statsRow: { marginTop: 18, flexDirection: "row", gap: 8 },
  statChip: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 12,
    alignItems: "center",
  },
  statChipValue: { color: "#fff", fontSize: 18, fontWeight: "900" },
  statChipLabel: { marginTop: 3, color: "rgba(255,255,255,0.68)", fontSize: 10, fontWeight: "900" },
  progressTrack: { marginTop: 16, height: 12, borderRadius: 999, overflow: "hidden", backgroundColor: "#E8EFE9" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: GREEN },
  limitCard: {
    marginTop: 16,
    borderRadius: 26,
    backgroundColor: CARD,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  limitTitle: { color: TEXT, fontSize: 17, fontWeight: "900" },
  limitGrid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  limitBox: { width: "48%", borderRadius: 18, backgroundColor: BG, padding: 14 },
  limitPlan: { color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  limitValue: { marginTop: 4, color: TEXT, fontSize: 16, fontWeight: "900" },
  quoteCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: GREEN,
    padding: 18,
    shadowColor: GREEN,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  quoteBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 8 },
  badgeAmber: { backgroundColor: AMBER },
  badgeLight: { backgroundColor: "#fff" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  badgeLightText: { color: "#B45309" },
  quoteOriginalText: { marginTop: 18, color: "#fff", fontSize: 24, lineHeight: 34, fontWeight: "900" },
  translationBox: { marginTop: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", padding: 14 },
  translationLabel: { color: "#F5EBDD", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  translationText: { marginTop: 6, color: "#fff", fontSize: 18, lineHeight: 28, fontWeight: "800" },
  quoteMetaBox: { marginTop: 16, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", padding: 14 },
  quoteBookTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  quoteBookMeta: { marginTop: 3, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700" },
  quoteBookSource: { marginTop: 6, color: "rgba(255,255,255,0.56)", fontSize: 11, fontWeight: "700" },
  inputLabel: { marginTop: 16, color: "#F5EBDD", fontSize: 12, fontWeight: "900" },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  segmentButton: { flex: 1, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.12)", paddingVertical: 13, alignItems: "center" },
  segmentButtonActive: { backgroundColor: "#fff" },
  segmentButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  segmentButtonTextActive: { color: GREEN },
  actionGrid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { minWidth: "48%", borderRadius: 18, backgroundColor: "#fff", paddingVertical: 13, paddingHorizontal: 12, alignItems: "center" },
  actionButtonOutlined: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  actionButtonAmber: { backgroundColor: AMBER },
  actionButtonText: { color: GREEN, fontSize: 12, fontWeight: "900" },
  actionButtonOutlinedText: { color: "#fff" },
  actionButtonAmberText: { color: "#fff" },
  emptyCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 22,
    alignItems: "center",
  },
  emptyDice: { color: GREEN, fontSize: 28, fontWeight: "900" },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 22, fontWeight: "900", textAlign: "center" },
  emptyText: { marginTop: 8, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  rollingCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 24,
    alignItems: "center",
    shadowColor: GREEN,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  diceStage: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  diceFace: {
    width: 78,
    height: 78,
    borderRadius: 22,
    backgroundColor: GREEN,
    padding: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    shadowColor: GREEN,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 5,
  },
  dicePip: { width: 10, height: 10, borderRadius: 999, backgroundColor: "#fff" },
  dicePipDim: { opacity: 0.25 },
  rollingTitle: { marginTop: 16, color: TEXT, fontSize: 22, fontWeight: "900" },
  rollingText: { marginTop: 7, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  messageBox: { marginTop: 16, borderRadius: 20, padding: 14 },
  successBox: { backgroundColor: "rgba(46,125,91,0.1)" },
  errorBox: { backgroundColor: "#FEF2F2" },
  messageText: { fontSize: 13, fontWeight: "800" },
  successMessageText: { color: GREEN },
  errorMessageText: { color: "#B91C1C" },
  rollButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: GREEN,
    paddingVertical: 16,
    alignItems: "center",
  },
  rollButtonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  rollButtonText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  disabledSurface: { opacity: 0.6 },
});
