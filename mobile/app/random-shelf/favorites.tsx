import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHero, LoadingState } from "@/components/app-ui";
import {
  FavoriteQuoteRow,
  QuoteBookRow,
  QuoteItemRow,
  first,
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

type FavoriteCard = {
  favorite: FavoriteQuoteRow;
  quote: QuoteItemRow;
  book: QuoteBookRow | null;
};

type ProfileState = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  plan_type: string | null;
};

function getDisplayName(profile: ProfileState | null) {
  return profile?.full_name || profile?.username || profile?.email || "KampusRaf kullanicisi";
}

function getPlanLabel(planType?: string | null) {
  if (planType === "plus") return "Plus";
  if (planType === "premium") return "Premium";
  if (planType === "pro") return "Pro";
  return "Free";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function FavoriteQuotesScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [favoriteCards, setFavoriteCards] = useState<FavoriteCard[]>([]);
  const [shareVisibility, setShareVisibility] = useState<"friends" | "public">("public");
  const [loading, setLoading] = useState(true);
  const [busyQuoteId, setBusyQuoteId] = useState<string | null>(null);
  const [speakingQuoteId, setSpeakingQuoteId] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites().finally(() => setLoading(false));

    return () => {
      Speech.stop();
    };
  }, []);

  async function loadFavorites() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    setUserId(user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, username, email, plan_type")
      .eq("id", user.id)
      .maybeSingle();

    setProfile((profileData || null) as ProfileState | null);

    const { data: favoritesData } = await supabase
      .from("quote_favorites")
      .select("id, quote_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const favorites = (favoritesData || []) as FavoriteQuoteRow[];
    const quoteIds = favorites.map((favorite) => favorite.quote_id);

    const { data: quotesData } =
      quoteIds.length > 0
        ? await supabase
            .from("quote_items")
            .select(
              `
              id,
              quote_text,
              quote_text_tr,
              original_language,
              mood,
              topic,
              estimated_read_seconds,
              quote_books (
                title,
                author,
                source_name,
                source_url
              )
            `
            )
            .in("id", quoteIds)
            .eq("status", "approved")
            .eq("is_active", true)
        : { data: [] };

    const quotes = (quotesData || []) as QuoteItemRow[];
    const quoteMap = new Map(quotes.map((quote) => [quote.id, quote]));

    const nextCards = favorites
      .map((favorite) => {
        const quote = quoteMap.get(favorite.quote_id);
        const book = first(quote?.quote_books);

        if (!quote) return null;

        return {
          favorite,
          quote,
          book,
        };
      })
      .filter(Boolean) as FavoriteCard[];

    setFavoriteCards(nextCards);
  }

  async function removeFavorite(quoteId: string) {
    if (!userId || busyQuoteId) return;

    setBusyQuoteId(quoteId);

    const { error } = await supabase.from("quote_favorites").delete().eq("user_id", userId).eq("quote_id", quoteId);

    setBusyQuoteId(null);

    if (error) {
      Alert.alert("Favoriden kaldirilamadi", error.message);
      return;
    }

    setFavoriteCards((current) => current.filter((item) => item.quote.id !== quoteId));
  }

  async function copyQuote(card: FavoriteCard) {
    await Clipboard.setStringAsync(
      getQuoteShareText({
        quote_text: card.quote.quote_text,
        quote_text_tr: card.quote.quote_text_tr,
        book_title: card.book?.title || "Kitap bilgisi yok",
        book_author: card.book?.author || null,
      })
    );

    Alert.alert("Kopyalandi", "Alinti panoya kopyalandi.");
  }

  async function shareQuote(card: FavoriteCard) {
    await Share.share({
      title: "KampusRaf Favori Alinti",
      message: getQuoteShareText({
        quote_text: card.quote.quote_text,
        quote_text_tr: card.quote.quote_text_tr,
        book_title: card.book?.title || "Kitap bilgisi yok",
        book_author: card.book?.author || null,
      }),
    });
  }

  function speakQuote(card: FavoriteCard) {
    Speech.stop();

    const text = `${getQuoteDisplayText(card.quote)} ${card.book?.title || "Kitap bilgisi yok"}${
      card.book?.author ? `, ${card.book.author}` : ""
    }`;

    Speech.speak(text, {
      language: card.quote.quote_text_tr || card.quote.original_language === "tr" ? "tr-TR" : "en-US",
      rate: 0.95,
      onStart: () => setSpeakingQuoteId(card.quote.id),
      onDone: () => setSpeakingQuoteId(null),
      onStopped: () => setSpeakingQuoteId(null),
      onError: () => setSpeakingQuoteId(null),
    });
  }

  async function shareToFeed(card: FavoriteCard) {
    if (!userId || busyQuoteId) return;

    setBusyQuoteId(card.quote.id);

    const caption = `"${getQuoteDisplayText(card.quote)}"\n\n${
      card.book?.author ? `${card.book?.title || "Kitap bilgisi yok"} - ${card.book.author}` : card.book?.title || "Kitap bilgisi yok"
    }\n\n#KampusRaf #RastgeleRaf`;

    const { error } = await supabase.from("social_posts").insert({
      user_id: userId,
      post_type: "quote",
      quote_id: card.quote.id,
      image_url: null,
      caption,
      visibility: shareVisibility,
      related_book_id: null,
    });

    setBusyQuoteId(null);

    if (error) {
      Alert.alert("Akisa tasinamadi", error.message);
      return;
    }

    Alert.alert("Akisa tasindi", "Favori alinti sosyal akista paylasildi.");
  }

  const empty = useMemo(() => favoriteCards.length === 0, [favoriteCards]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <LoadingState label="Favori alıntılar yükleniyor..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <AppHero
          eyebrow="Favori Alıntılarım"
          title="Beğendiğin alıntıları kendi rafında sakla."
          description={`${getDisplayName(profile)} için favoriler hazır. Bunları tekrar dinleyebilir, paylaşabilir veya sosyal akışa taşıyabilirsin.`}
          onBack={() => router.back()}
        >
          <View style={styles.heroActionRow}>
            <Pressable style={styles.inlineButton} onPress={() => router.push("/random-shelf" as never)}>
              <Text style={styles.inlineButtonText}>Zar At</Text>
            </Pressable>
          </View>
          <View style={styles.heroStats}>
            <HeroStat value={`${favoriteCards.length}`} label="Favori" />
            <HeroStat value={getPlanLabel(profile?.plan_type)} label="Paket" />
          </View>
        </AppHero>

        <View style={styles.visibilityCard}>
          <Text style={styles.visibilityTitle}>Akisa paylasim gorunurlugu</Text>
          <View style={styles.segmentRow}>
            <SegmentButton
              label="Arkadaslar"
              active={shareVisibility === "friends"}
              onPress={() => setShareVisibility("friends")}
            />
            <SegmentButton label="Herkes" active={shareVisibility === "public"} onPress={() => setShareVisibility("public")} />
          </View>
        </View>

        {empty ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Henuz favori alintin yok</Text>
            <Text style={styles.emptyText}>
              Rastgele Raf ekraninda zar atarak alinti kesfet. Begendigini favorilerine eklediginde burada goreceksin.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push("/random-shelf" as never)}>
              <Text style={styles.primaryButtonText}>Ilk Alintini Kesfet</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {favoriteCards.map((card) => {
              const busy = busyQuoteId === card.quote.id;
              const speaking = speakingQuoteId === card.quote.id;

              return (
                <View key={card.favorite.id} style={styles.quoteCard}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardDate}>Kaydedildi: {formatDate(card.favorite.created_at)}</Text>
                    <View style={styles.badgeRow}>
                      {card.quote.mood ? <Badge label={card.quote.mood} /> : null}
                      {card.quote.topic ? <Badge label={card.quote.topic} amber /> : null}
                    </View>
                  </View>

                  <Text style={styles.quoteOriginalText}>{`"${card.quote.quote_text}"`}</Text>

                  {card.quote.original_language !== "tr" && card.quote.quote_text_tr ? (
                    <View style={styles.translationBox}>
                      <Text style={styles.translationLabel}>Turkce ceviri</Text>
                      <Text style={styles.translationText}>{`"${card.quote.quote_text_tr}"`}</Text>
                    </View>
                  ) : null}

                  <View style={styles.metaBox}>
                    <Text style={styles.bookTitle}>{card.book?.title || "Kitap bilgisi yok"}</Text>
                    <Text style={styles.bookMeta}>{card.book?.author || "Yazar bilgisi yok"}</Text>
                    {card.book?.source_name ? <Text style={styles.bookSource}>Kaynak: {card.book.source_name}</Text> : null}
                  </View>

                  <View style={styles.actionGrid}>
                    <ActionButton label={speaking ? "Okunuyor..." : "Dinle"} onPress={() => speakQuote(card)} disabled={speaking} />
                    <ActionButton label="Kopyala" onPress={() => copyQuote(card)} outlined />
                    <ActionButton label="Paylas" onPress={() => shareQuote(card)} outlined />
                    <ActionButton label={busy ? "Tasinıyor..." : "Akisa Tas"} onPress={() => shareToFeed(card)} disabled={busy} amber />
                    <ActionButton label={busy ? "Bekle..." : "Favoriden Cikar"} onPress={() => removeFavorite(card.quote.id)} disabled={busy} outlined />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroStatBox}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function Badge({ label, amber = false }: { label: string; amber?: boolean }) {
  return (
    <View style={[styles.badge, amber && styles.badgeAmber]}>
      <Text style={styles.badgeText}>{label}</Text>
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
  backButton: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 12, paddingVertical: 8 },
  backButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  inlineButton: { borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 8 },
  inlineButtonText: { color: GREEN, fontSize: 12, fontWeight: "900" },
  eyebrow: { marginTop: 16, color: "#F5EBDD", fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { marginTop: 12, color: "#fff", fontSize: 28, lineHeight: 34, fontWeight: "900" },
  description: { marginTop: 10, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  heroStats: { marginTop: 18, flexDirection: "row", gap: 8 },
  heroStatBox: { flex: 1, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", paddingVertical: 12, alignItems: "center" },
  heroStatValue: { color: "#fff", fontSize: 20, fontWeight: "900" },
  heroStatLabel: { marginTop: 3, color: "rgba(255,255,255,0.68)", fontSize: 10, fontWeight: "900" },
  visibilityCard: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: CARD,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  visibilityTitle: { color: TEXT, fontSize: 15, fontWeight: "900" },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  segmentButton: { flex: 1, borderRadius: 16, backgroundColor: BG, paddingVertical: 13, alignItems: "center" },
  segmentButtonActive: { backgroundColor: GREEN },
  segmentButtonText: { color: GREEN, fontSize: 12, fontWeight: "900" },
  segmentButtonTextActive: { color: "#fff" },
  emptyCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 22,
    alignItems: "center",
  },
  emptyTitle: { color: TEXT, fontSize: 22, fontWeight: "900", textAlign: "center" },
  emptyText: { marginTop: 8, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  primaryButton: { marginTop: 16, borderRadius: 999, backgroundColor: GREEN, paddingHorizontal: 20, paddingVertical: 14 },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  list: { marginTop: 16, gap: 14 },
  quoteCard: {
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardDate: { color: MUTED, fontSize: 11, fontWeight: "800" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" },
  badge: { borderRadius: 999, backgroundColor: "rgba(46,125,91,0.1)", paddingHorizontal: 10, paddingVertical: 6 },
  badgeAmber: { backgroundColor: "#FFFBEB" },
  badgeText: { color: GREEN, fontSize: 10, fontWeight: "900" },
  quoteOriginalText: { marginTop: 14, color: TEXT, fontSize: 21, lineHeight: 31, fontWeight: "900" },
  translationBox: { marginTop: 14, borderRadius: 20, backgroundColor: BG, padding: 14 },
  translationLabel: { color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  translationText: { marginTop: 6, color: TEXT, fontSize: 17, lineHeight: 27, fontWeight: "800" },
  metaBox: { marginTop: 14, borderRadius: 20, backgroundColor: BG, padding: 14 },
  bookTitle: { color: TEXT, fontSize: 15, fontWeight: "900" },
  bookMeta: { marginTop: 3, color: MUTED, fontSize: 12, fontWeight: "700" },
  bookSource: { marginTop: 6, color: MUTED, fontSize: 11, fontWeight: "700" },
  actionGrid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { minWidth: "48%", borderRadius: 18, backgroundColor: GREEN, paddingVertical: 13, paddingHorizontal: 12, alignItems: "center" },
  actionButtonOutlined: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(46,125,91,0.18)" },
  actionButtonAmber: { backgroundColor: AMBER },
  actionButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  actionButtonOutlinedText: { color: GREEN },
  actionButtonAmberText: { color: "#fff" },
  disabledSurface: { opacity: 0.6 },
});
