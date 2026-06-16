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

type AudioBookRow = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  source_type: string | null;
  created_at: string | null;
};

type AudioChapterRow = {
  id: string;
  audio_book_id: string;
};

type AudioBookItem = AudioBookRow & {
  chapterCount: number;
};

function getSourceLabel(value?: string | null) {
  if (value === "public_domain") return "Kamu malı";
  if (value === "own_work") return "Kendi eseri";
  if (value === "permission_granted") return "İzinli içerik";
  if (value === "short_review") return "Kısa inceleme";
  return "Telif onaylı";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function shortDescription(value?: string | null) {
  const clean = (value || "").replace(/\s+/g, " ").trim();

  if (!clean) return "Açıklama eklenmemiş.";
  if (clean.length <= 130) return clean;

  return `${clean.slice(0, 130)}...`;
}

export default function AudioScreen() {
  const [items, setItems] = useState<AudioBookItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadAudioBooks() {
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session?.user) {
      router.replace("/auth/login");
      return;
    }

    const { data, error } = await supabase
      .from("audio_books")
      .select("id, title, author, description, source_type, created_at")
      .eq("status", "approved")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      setErrorMessage(error.message);
      setItems([]);
      return;
    }

    const audioBooks = (data || []) as AudioBookRow[];
    const audioBookIds = audioBooks.map((item) => item.id);
    const chapterCounts = new Map<string, number>();

    if (audioBookIds.length > 0) {
      const { data: chapterData, error: chapterError } = await supabase
        .from("audio_chapters")
        .select("id, audio_book_id")
        .in("audio_book_id", audioBookIds)
        .eq("status", "approved");

      if (chapterError) {
        setErrorMessage(chapterError.message);
      } else {
        ((chapterData || []) as AudioChapterRow[]).forEach((chapter) => {
          chapterCounts.set(
            chapter.audio_book_id,
            (chapterCounts.get(chapter.audio_book_id) || 0) + 1
          );
        });
      }
    }

    setItems(
      audioBooks.map((item) => ({
        ...item,
        chapterCount: chapterCounts.get(item.id) || 0,
      }))
    );
  }

  useEffect(() => {
    loadAudioBooks().finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadAudioBooks();
    setRefreshing(false);
  }

  const filteredItems = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("tr-TR");

    if (!clean) return items;

    return items.filter((item) => {
      const haystack = [item.title, item.author, item.description, item.source_type]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return haystack.includes(clean);
    });
  }, [items, query]);

  const totalChapters = items.reduce((total, item) => total + item.chapterCount, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AMBER} />
        <Text style={styles.loadingText}>Sesli Raf yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AMBER} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Sesli Raf</Text>
        <Text style={styles.title}>Öğrencilerin seslendirdiği içerikleri keşfet.</Text>
        <Text style={styles.description}>
          Onaylı sesli kitapları ve bölümleri mobilde takip et. Kartlara dokunarak detay ve dinleme ekranına geç.
        </Text>

        <View style={styles.headerStats}>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{items.length}</Text>
            <Text style={styles.headerStatLabel}>İçerik</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{totalChapters}</Text>
            <Text style={styles.headerStatLabel}>Bölüm</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>🎧</Text>
            <Text style={styles.headerStatLabel}>Mobil</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchCard}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Sesli kitap, yazar veya açıklama ara..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
      </View>

      {errorMessage && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Sesli Raf yüklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.list}>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎧</Text>
            <Text style={styles.emptyTitle}>
              {items.length === 0 ? "Henüz onaylı içerik yok" : "Sonuç bulunamadı"}
            </Text>
            <Text style={styles.emptyText}>
              {items.length === 0
                ? "Admin onayından geçen sesli içerikler burada görünür."
                : "Başka bir sesli kitap, yazar veya açıklama araması dene."}
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressedCard]}
              onPress={() => router.push(`/audio/${item.id}` as any)}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.audioIconBox}>
                  <Text style={styles.audioIcon}>🎧</Text>
                </View>

                <View style={styles.cardMain}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardAuthor} numberOfLines={1}>
                    {item.author || "Yazar belirtilmemiş"}
                  </Text>
                </View>
              </View>

              <Text style={styles.descriptionText} numberOfLines={3}>
                {shortDescription(item.description)}
              </Text>

              <View style={styles.badgeRow}>
                <Text style={styles.badge}>{getSourceLabel(item.source_type)}</Text>
                <Text style={styles.badge}>{item.chapterCount} bölüm</Text>
                <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
              </View>
            </Pressable>
          ))
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
    backgroundColor: AMBER,
    padding: 22,
    shadowColor: AMBER,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  eyebrow: {
    color: "#FFF7ED",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { marginTop: 12, color: "#fff", fontSize: 29, lineHeight: 35, fontWeight: "900" },
  description: {
    marginTop: 10,
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "600",
  },
  headerStats: { marginTop: 18, flexDirection: "row", gap: 8 },
  headerStatBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingVertical: 12,
    alignItems: "center",
  },
  headerStatValue: { color: "#fff", fontSize: 20, fontWeight: "900" },
  headerStatLabel: { marginTop: 3, color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "900" },
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
    borderColor: "rgba(245,158,11,0.12)",
  },
  pressedCard: { transform: [{ scale: 0.99 }], opacity: 0.92 },
  cardTopRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  audioIconBox: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: "rgba(245,158,11,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioIcon: { fontSize: 24 },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { color: TEXT, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  cardAuthor: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "800" },
  descriptionText: { marginTop: 12, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  badgeRow: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: "#B45309",
    fontSize: 11,
    fontWeight: "900",
  },
  dateText: { marginLeft: "auto", color: GREEN, fontSize: 11, fontWeight: "900" },
  emptyCard: { borderRadius: 26, backgroundColor: "#fff", padding: 24, alignItems: "center" },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 20 },
});
