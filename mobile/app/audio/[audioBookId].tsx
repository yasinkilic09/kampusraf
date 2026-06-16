import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const RED = "#B91C1C";

type AudioBookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  description: string | null;
  category: string | null;
  language: string | null;
  source_type: string | null;
  created_at: string | null;
};

type AudioChapterRow = {
  id: string;
  audio_book_id: string;
  title: string;
  chapter_number: number | null;
  storage_path: string;
  duration_seconds: number | null;
  listen_count: number | null;
  created_at: string | null;
};

type FavoriteRow = {
  id: string;
};

function paramToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getSourceLabel(value?: string | null) {
  if (value === "public_domain") return "Kamu malı";
  if (value === "own_work") return "Kendi eseri";
  if (value === "permission_granted") return "İzinli içerik";
  if (value === "short_review") return "Kısa inceleme";
  return "Telif onaylı";
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "00:00";

  const rounded = Math.floor(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const rest = rounded % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function formatLongDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "Süre bilgisi yok";

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  if (minutes <= 0) return `${rest} sn`;
  return `${minutes} dk ${rest.toString().padStart(2, "0")} sn`;
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function AudioDetailScreen() {
  const params = useLocalSearchParams();
  const audioBookId = paramToString(params.audioBookId as string | string[] | undefined);

  const player = useAudioPlayer(null, { updateInterval: 500 });
  const playerStatus = useAudioPlayerStatus(player);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [audioBook, setAudioBook] = useState<AudioBookRow | null>(null);
  const [chapters, setChapters] = useState<AudioChapterRow[]>([]);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<AudioChapterRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openingChapterId, setOpeningChapterId] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const lastSavedPositionRef = useRef(0);

  const currentTime = Number(playerStatus.currentTime || 0);
  const duration = Number(playerStatus.duration || activeChapter?.duration_seconds || 0);
  const isPlaying = Boolean(playerStatus.playing);
  const isLoaded = Boolean(playerStatus.isLoaded);
  const isBuffering = Boolean(playerStatus.isBuffering);

  const totalDurationText = useMemo(() => {
    const total = chapters.reduce((sum, chapter) => sum + (chapter.duration_seconds || 0), 0);
    return total > 0 ? formatLongDuration(total) : "Süre bilgisi yok";
  }, [chapters]);

  const activeChapterIndex = useMemo(() => {
    if (!activeChapter) return -1;
    return chapters.findIndex((chapter) => chapter.id === activeChapter.id);
  }, [activeChapter, chapters]);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
    }).catch(() => undefined);

    return () => {
      try {
        player.pause();
      } catch {
        // Sessiz geç: ekran kapanırken player zaten bırakılabilir.
      }
    };
  }, [player]);

  useEffect(() => {
    if (!currentUserId || !audioBookId || !activeChapter) return;

    const currentSecond = Math.floor(currentTime);
    const shouldSave = currentSecond > 0 && Math.abs(currentSecond - lastSavedPositionRef.current) >= 10;

    if (!shouldSave) return;

    lastSavedPositionRef.current = currentSecond;

    supabase
      .from("audio_listens")
      .upsert(
        {
          user_id: currentUserId,
          audio_book_id: audioBookId,
          audio_chapter_id: activeChapter.id,
          last_position_seconds: currentSecond,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,audio_chapter_id" }
      )
      .then(() => undefined);
  }, [activeChapter, audioBookId, currentTime, currentUserId]);

  const loadAudioDetail = useCallback(async () => {
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    setCurrentUserId(user.id);

    if (!audioBookId) {
      setErrorMessage("Sesli içerik bilgisi alınamadı.");
      return;
    }

    const [bookRes, chapterRes, favoriteRes] = await Promise.all([
      supabase
        .from("audio_books")
        .select("id, user_id, title, author, description, category, language, source_type, created_at")
        .eq("id", audioBookId)
        .eq("status", "approved")
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("audio_chapters")
        .select("id, audio_book_id, title, chapter_number, storage_path, duration_seconds, listen_count, created_at")
        .eq("audio_book_id", audioBookId)
        .eq("status", "approved")
        .order("chapter_number", { ascending: true }),
      supabase
        .from("audio_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("audio_book_id", audioBookId)
        .maybeSingle(),
    ]);

    if (bookRes.error) {
      setErrorMessage(bookRes.error.message);
      setAudioBook(null);
      setChapters([]);
      return;
    }

    if (!bookRes.data) {
      setErrorMessage("Bu sesli içerik bulunamadı veya henüz onaylı değil.");
      setAudioBook(null);
      setChapters([]);
      return;
    }

    if (chapterRes.error) {
      setErrorMessage(chapterRes.error.message);
      setChapters([]);
    } else {
      setChapters((chapterRes.data || []) as AudioChapterRow[]);
    }

    if (favoriteRes.error && favoriteRes.error.code !== "PGRST116") {
      setFavoriteId(null);
    } else {
      setFavoriteId(((favoriteRes.data as FavoriteRow | null) || null)?.id || null);
    }

    setAudioBook(bookRes.data as AudioBookRow);
  }, [audioBookId]);

  useEffect(() => {
    loadAudioDetail().finally(() => setLoading(false));
  }, [loadAudioDetail]);

  async function onRefresh() {
    setRefreshing(true);
    await loadAudioDetail();
    setRefreshing(false);
  }

  async function toggleFavorite() {
    if (!currentUserId || !audioBookId || favoriteLoading) return;

    setFavoriteLoading(true);

    if (favoriteId) {
      const { error } = await supabase.from("audio_favorites").delete().eq("id", favoriteId);

      if (error) {
        Alert.alert("Favori güncellenemedi", error.message);
      } else {
        setFavoriteId(null);
      }

      setFavoriteLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("audio_favorites")
      .insert({ user_id: currentUserId, audio_book_id: audioBookId })
      .select("id")
      .single();

    if (error) {
      Alert.alert("Favori eklenemedi", error.message);
    } else {
      setFavoriteId((data as FavoriteRow).id);
    }

    setFavoriteLoading(false);
  }

  async function saveListenPosition(chapter: AudioChapterRow, positionSeconds = 0) {
    if (!currentUserId || !audioBookId) return;

    await supabase.from("audio_listens").upsert(
      {
        user_id: currentUserId,
        audio_book_id: audioBookId,
        audio_chapter_id: chapter.id,
        last_position_seconds: Math.max(0, Math.floor(positionSeconds)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,audio_chapter_id" }
    );
  }

  async function loadChapterSource(chapter: AudioChapterRow) {
    if (!currentUserId || !audioBookId) return false;

    setOpeningChapterId(chapter.id);

    const { data, error } = await supabase.storage
      .from("audio-raf")
      .createSignedUrl(chapter.storage_path, 60 * 30);

    if (error || !data?.signedUrl) {
      setOpeningChapterId(null);
      Alert.alert("Ses açılamadı", error?.message || "Ses dosyası için geçici bağlantı üretilemedi.");
      return false;
    }

    try {
      player.pause();
      player.replace(data.signedUrl);
      setSignedUrl(data.signedUrl);
      setActiveChapter(chapter);
      lastSavedPositionRef.current = 0;
      await saveListenPosition(chapter, 0);
      setOpeningChapterId(null);
      return true;
    } catch (error) {
      setOpeningChapterId(null);
      Alert.alert("Oynatıcı başlatılamadı", error instanceof Error ? error.message : "Bilinmeyen hata oluştu.");
      return false;
    }
  }

  async function playChapter(chapter: AudioChapterRow) {
    if (openingChapterId) return;

    if (activeChapter?.id === chapter.id && signedUrl) {
      if (isPlaying) {
        player.pause();
        await saveListenPosition(chapter, currentTime);
      } else {
        player.play();
      }

      return;
    }

    const loaded = await loadChapterSource(chapter);

    if (loaded) {
      setTimeout(() => {
        try {
          player.play();
        } catch {
          Alert.alert("Ses başlatılamadı", "Ses dosyası yüklendi ama oynatma başlatılamadı.");
        }
      }, 180);
    }
  }

  async function togglePlayPause() {
    if (!activeChapter) {
      if (chapters[0]) await playChapter(chapters[0]);
      return;
    }

    if (isPlaying) {
      player.pause();
      await saveListenPosition(activeChapter, currentTime);
    } else {
      player.play();
    }
  }

  async function seekBy(seconds: number) {
    if (!activeChapter || !isLoaded) return;

    const nextPosition = Math.max(0, Math.min(duration || currentTime + seconds, currentTime + seconds));
    await player.seekTo(nextPosition);
    await saveListenPosition(activeChapter, nextPosition);
  }

  async function playNextChapter() {
    if (activeChapterIndex < 0) {
      if (chapters[0]) await playChapter(chapters[0]);
      return;
    }

    const next = chapters[activeChapterIndex + 1];

    if (!next) {
      Alert.alert("Son bölüm", "Bu sesli içerikte başka bölüm yok.");
      return;
    }

    await playChapter(next);
  }

  async function playPreviousChapter() {
    if (activeChapterIndex <= 0) {
      await seekBy(-15);
      return;
    }

    const previous = chapters[activeChapterIndex - 1];
    if (previous) await playChapter(previous);
  }

  async function reportAudio() {
    if (!currentUserId || !audioBookId) return;

    Alert.alert(
      "İçeriği bildir",
      "Bu sesli içerik telif/uygunluk incelemesi için admin paneline bildirilecek.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Bildir",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from("audio_reports").insert({
              reporter_id: currentUserId,
              audio_book_id: audioBookId,
              reason: "copyright",
              note: "Mobil uygulamadan bildirildi.",
            });

            if (error) {
              Alert.alert("Bildirim gönderilemedi", error.message);
            } else {
              Alert.alert("Gönderildi", "Bildirim admin incelemesine alındı.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AMBER} />
        <Text style={styles.loadingText}>Sesli içerik yükleniyor...</Text>
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
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>

        <Text style={styles.eyebrow}>Sesli Raf Detay</Text>
        <Text style={styles.title}>{audioBook?.title || "Sesli içerik"}</Text>
        <Text style={styles.description}>{audioBook?.author || "Yazar belirtilmemiş"}</Text>

        <View style={styles.headerStats}>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{chapters.length}</Text>
            <Text style={styles.headerStatLabel}>Bölüm</Text>
          </View>
          <View style={styles.headerStatBox}>
            <Text style={styles.headerStatValue}>{totalDurationText}</Text>
            <Text style={styles.headerStatLabel}>Toplam süre</Text>
          </View>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Sesli içerik yüklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {audioBook && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>İçerik Bilgisi</Text>
          <Text style={styles.infoText}>{audioBook.description || "Açıklama eklenmemiş."}</Text>

          <View style={styles.badgeRow}>
            <Text style={styles.badge}>{getSourceLabel(audioBook.source_type)}</Text>
            {audioBook.category ? <Text style={styles.badge}>{audioBook.category}</Text> : null}
            {audioBook.language ? <Text style={styles.badge}>{audioBook.language.toUpperCase()}</Text> : null}
            <Text style={styles.dateText}>{formatDate(audioBook.created_at)}</Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={toggleFavorite} disabled={favoriteLoading}>
              <Text style={styles.actionButtonText}>
                {favoriteId ? "★ Favorilerde" : "☆ Favorile"}
              </Text>
            </Pressable>

            <Pressable style={styles.outlineButton} onPress={reportAudio}>
              <Text style={styles.outlineButtonText}>Bildir</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.playerCard}>
        <View style={styles.playerTopRow}>
          <View style={styles.playerIconBox}>
            {openingChapterId ? <ActivityIndicator color={AMBER} /> : <Text style={styles.playerIcon}>🎧</Text>}
          </View>
          <View style={styles.playerTitleBox}>
            <Text style={styles.playerEyebrow}>Dahili oynatıcı</Text>
            <Text style={styles.playerTitle} numberOfLines={2}>
              {activeChapter ? activeChapter.title : "Bir bölüm seç"}
            </Text>
            <Text style={styles.playerMeta}>
              {activeChapter ? `${formatDuration(currentTime)} / ${formatDuration(duration)}` : "Bölüme basınca burada oynar"}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.playerControls}>
          <Pressable style={styles.smallControlButton} onPress={playPreviousChapter}>
            <Text style={styles.smallControlText}>⏮</Text>
          </Pressable>
          <Pressable style={styles.smallControlButton} onPress={() => seekBy(-15)} disabled={!activeChapter}>
            <Text style={styles.smallControlText}>-15</Text>
          </Pressable>
          <Pressable style={styles.mainControlButton} onPress={togglePlayPause} disabled={openingChapterId !== null}>
            <Text style={styles.mainControlText}>{isPlaying ? "⏸" : "▶"}</Text>
          </Pressable>
          <Pressable style={styles.smallControlButton} onPress={() => seekBy(15)} disabled={!activeChapter}>
            <Text style={styles.smallControlText}>+15</Text>
          </Pressable>
          <Pressable style={styles.smallControlButton} onPress={playNextChapter}>
            <Text style={styles.smallControlText}>⏭</Text>
          </Pressable>
        </View>

        <Text style={styles.playerStatusText}>
          {isBuffering
            ? "Ses yükleniyor..."
            : isPlaying
              ? "Dinleniyor"
              : activeChapter
                ? "Duraklatıldı"
                : "Henüz bölüm seçilmedi"}
        </Text>
      </View>

      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionTitle}>Bölümler</Text>
        <Text style={styles.sectionMeta}>{chapters.length} bölüm</Text>
      </View>

      <View style={styles.list}>
        {chapters.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🎧</Text>
            <Text style={styles.emptyTitle}>Bölüm yok</Text>
            <Text style={styles.emptyText}>Bu sesli içerik için onaylı bölüm bulunmuyor.</Text>
          </View>
        ) : (
          chapters.map((chapter) => {
            const active = activeChapter?.id === chapter.id;

            return (
              <Pressable
                key={chapter.id}
                style={({ pressed }) => [
                  styles.chapterCard,
                  active && styles.activeChapterCard,
                  pressed && styles.pressedCard,
                ]}
                onPress={() => playChapter(chapter)}
                disabled={openingChapterId === chapter.id}
              >
                <View style={[styles.chapterIconBox, active && styles.activeChapterIconBox]}>
                  {openingChapterId === chapter.id ? (
                    <ActivityIndicator color={AMBER} />
                  ) : (
                    <Text style={[styles.chapterIcon, active && styles.activeChapterIcon]}>
                      {active && isPlaying ? "⏸" : "▶"}
                    </Text>
                  )}
                </View>

                <View style={styles.chapterMain}>
                  <Text style={styles.chapterTitle} numberOfLines={2}>
                    {chapter.chapter_number || 1}. {chapter.title}
                  </Text>
                  <Text style={styles.chapterMeta} numberOfLines={1}>
                    {formatLongDuration(chapter.duration_seconds)} • {chapter.listen_count || 0} dinlenme
                  </Text>
                  {active ? <Text style={styles.nowPlayingText}>Şu an oynatıcıda</Text> : null}
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
    backgroundColor: AMBER,
    padding: 22,
    shadowColor: AMBER,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { color: "#fff", fontSize: 34, lineHeight: 36, fontWeight: "900" },
  eyebrow: {
    marginTop: 14,
    color: "#FFF7ED",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { marginTop: 10, color: "#fff", fontSize: 28, lineHeight: 34, fontWeight: "900" },
  description: {
    marginTop: 8,
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },
  headerStats: { marginTop: 18, flexDirection: "row", gap: 8 },
  headerStatBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  headerStatValue: { color: "#fff", fontSize: 17, fontWeight: "900", textAlign: "center" },
  headerStatLabel: { marginTop: 3, color: "rgba(255,255,255,0.72)", fontSize: 10, fontWeight: "900" },
  errorCard: {
    marginTop: 14,
    borderRadius: 22,
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: { color: RED, fontSize: 15, fontWeight: "900" },
  errorText: { marginTop: 4, color: "#991B1B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  infoCard: {
    marginTop: 16,
    borderRadius: 26,
    backgroundColor: "#fff",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoTitle: { color: TEXT, fontSize: 18, fontWeight: "900" },
  infoText: { marginTop: 8, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "600" },
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
  actionRow: { marginTop: 15, flexDirection: "row", gap: 10 },
  actionButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: AMBER,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  outlineButton: {
    minWidth: 96,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.24)",
    paddingVertical: 14,
    alignItems: "center",
  },
  outlineButtonText: { color: "#B45309", fontSize: 13, fontWeight: "900" },
  playerCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: "#111827",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  playerTopRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  playerIconBox: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: "rgba(245,158,11,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  playerIcon: { fontSize: 24 },
  playerTitleBox: { flex: 1, minWidth: 0 },
  playerEyebrow: { color: "#FCD34D", fontSize: 11, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
  playerTitle: { marginTop: 4, color: "#fff", fontSize: 17, lineHeight: 22, fontWeight: "900" },
  playerMeta: { marginTop: 4, color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "800" },
  progressTrack: {
    marginTop: 15,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: AMBER },
  playerControls: { marginTop: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  smallControlButton: {
    width: 47,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  smallControlText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  mainControlButton: {
    width: 62,
    height: 54,
    borderRadius: 22,
    backgroundColor: AMBER,
    alignItems: "center",
    justifyContent: "center",
  },
  mainControlText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  playerStatusText: { marginTop: 12, color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "800", textAlign: "center" },
  listHeaderRow: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: TEXT, fontSize: 20, fontWeight: "900" },
  sectionMeta: { color: MUTED, fontSize: 12, fontWeight: "800" },
  list: { marginTop: 12, gap: 10 },
  chapterCard: {
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.08)",
  },
  activeChapterCard: { backgroundColor: "#FFFBEB", borderColor: "rgba(245,158,11,0.32)" },
  pressedCard: { transform: [{ scale: 0.99 }], opacity: 0.92 },
  chapterIconBox: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(245,158,11,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeChapterIconBox: { backgroundColor: AMBER },
  chapterIcon: { color: "#B45309", fontSize: 18, fontWeight: "900" },
  activeChapterIcon: { color: "#fff" },
  chapterMain: { flex: 1, minWidth: 0 },
  chapterTitle: { color: TEXT, fontSize: 16, lineHeight: 21, fontWeight: "900" },
  chapterMeta: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "700" },
  nowPlayingText: { marginTop: 5, color: "#B45309", fontSize: 11, fontWeight: "900" },
  emptyCard: { borderRadius: 26, backgroundColor: "#fff", padding: 24, alignItems: "center" },
  emptyIcon: { fontSize: 34 },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 5, color: MUTED, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 20 },
});
