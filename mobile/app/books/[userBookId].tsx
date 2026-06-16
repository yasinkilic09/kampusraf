import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AppButton,
  AppCard,
  AppHero,
  ErrorCard,
  LoadingState,
} from "@/components/app-ui";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const DARK_GREEN = "#25684C";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";
const activeExchangeStatuses = ["requested", "meeting_planned", "handed_over"];

type RelatedBook = {
  title: string | null;
  author: string | null;
  category: string | null;
  isbn: string | null;
  cover_url: string | null;
  description: string | null;
};

type OwnerProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  university: string | null;
  department: string | null;
  city: string | null;
  bio: string | null;
  trust_score: number | null;
  is_verified: boolean | null;
  verification_status: string | null;
  account_status: string | null;
  completed_exchange_count: number | null;
  response_score: number | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  book_id: string | null;
  condition: string | null;
  exchange_type: string | null;
  status: string | null;
  custom_title: string | null;
  custom_author: string | null;
  image_url: string | null;
  note: string | null;
  city: string | null;
  university: string | null;
  created_at: string | null;
  books: RelatedBook | RelatedBook[] | null;
  profiles: OwnerProfile | OwnerProfile[] | null;
};

type BookView = {
  title: string;
  author: string;
  category: string;
  isbn: string | null;
  description: string | null;
  image: string | null;
};

type OwnerView = {
  id: string;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  university: string;
  department: string;
  city: string;
  bio: string | null;
  trustScore: number;
  isVerified: boolean;
  verificationStatus: string;
  accountStatus: string;
  completedExchangeCount: number;
  responseScore: number;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function paramToString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getConditionLabel(value?: string | null) {
  if (value === "new" || value === "yeni") return "Yeni";
  if (value === "like_new") return "Yeni gibi";
  if (value === "good" || value === "temiz") return "Temiz";
  if (value === "fair" || value === "orta" || value === "az_kullanilmis") return "Az kullanılmış";
  if (value === "worn" || value === "yipranmis") return "Yıpranmış";
  return value || "Durum belirtilmemiş";
}

function getExchangeLabel(value?: string | null) {
  if (value === "sell" || value === "satis") return "Satış";
  if (value === "lend" || value === "odunc") return "Ödünç";
  if (value === "giveaway" || value === "bagis") return "Bağış";
  if (value === "swap" || value === "takas") return "Takas";
  return "Takas";
}

function getStatusLabel(value?: string | null) {
  if (value === "active" || value === "mevcut") return "Mevcut";
  if (value === "reserved" || value === "rezerve") return "Rezerve";
  if (value === "given" || value === "verildi") return "Verildi";
  if (value === "exchanged" || value === "takaslandi") return "Takaslandı";
  if (value === "inactive" || value === "pasif") return "Pasif";
  return value || "Durum yok";
}

function getVerificationLabel(value?: string | null) {
  if (value === "verified") return "Doğrulanmış öğrenci";
  if (value === "pending") return "Doğrulama bekliyor";
  if (value === "rejected") return "Doğrulama reddedildi";
  return "Standart profil";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getInitial(value: string) {
  return value.trim().slice(0, 1).toLocaleUpperCase("tr-TR") || "K";
}

function getBookView(userBook: UserBookRow): BookView {
  const book = first(userBook.books);

  return {
    title: userBook.custom_title || book?.title || "İsimsiz Kitap",
    author: userBook.custom_author || book?.author || "Yazar bilgisi yok",
    category: book?.category || "Kategori yok",
    isbn: book?.isbn || null,
    description: book?.description || null,
    image: userBook.image_url || book?.cover_url || null,
  };
}

function getOwnerView(userBook: UserBookRow): OwnerView {
  const owner = first(userBook.profiles);

  return {
    id: owner?.id || userBook.user_id,
    fullName: owner?.full_name || owner?.username || "KampüsRaf kullanıcısı",
    username: owner?.username || null,
    avatarUrl: owner?.avatar_url || null,
    university: owner?.university || userBook.university || "Üniversite bilgisi yok",
    department: owner?.department || "Bölüm bilgisi yok",
    city: owner?.city || userBook.city || "Şehir bilgisi yok",
    bio: owner?.bio || null,
    trustScore: owner?.trust_score ?? 60,
    isVerified: Boolean(owner?.is_verified || owner?.verification_status === "verified"),
    verificationStatus: owner?.verification_status || "unverified",
    accountStatus: owner?.account_status || "active",
    completedExchangeCount: owner?.completed_exchange_count ?? 0,
    responseScore: owner?.response_score ?? 0,
  };
}

export default function BookDetailScreen() {
  const params = useLocalSearchParams<{ userBookId?: string | string[] }>();
  const userBookId = paramToString(params.userBookId);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userBook, setUserBook] = useState<UserBookRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startingConversation, setStartingConversation] = useState(false);

  const book = useMemo(() => (userBook ? getBookView(userBook) : null), [userBook]);
  const owner = useMemo(() => (userBook ? getOwnerView(userBook) : null), [userBook]);
  const isMine = Boolean(currentUserId && userBook?.user_id === currentUserId);

  const loadBook = useCallback(async () => {
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

    setCurrentUserId(user.id);

    if (!userBookId) {
      setErrorMessage("Kitap bilgisi alınamadı.");
      return;
    }

    const { data, error } = await supabase
      .from("user_books")
      .select(
        `
        id,
        user_id,
        book_id,
        condition,
        exchange_type,
        status,
        custom_title,
        custom_author,
        image_url,
        note,
        city,
        university,
        created_at,
        books (
          title,
          author,
          category,
          isbn,
          cover_url,
          description
        ),
        profiles (
          id,
          full_name,
          username,
          avatar_url,
          university,
          department,
          city,
          bio,
          trust_score,
          is_verified,
          verification_status,
          account_status,
          completed_exchange_count,
          response_score
        )
      `
      )
      .eq("id", userBookId)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setUserBook(null);
      return;
    }

    if (!data) {
      setErrorMessage("Bu kitap bulunamadı veya artık yayında değil.");
      setUserBook(null);
      return;
    }

    setUserBook(data as unknown as UserBookRow);
  }, [userBookId]);

  useEffect(() => {
    loadBook().finally(() => setLoading(false));
  }, [loadBook]);

  async function onRefresh() {
    setRefreshing(true);
    await loadBook();
    setRefreshing(false);
  }

  async function ensureExchange(conversationId: string) {
    if (!currentUserId || !userBook || !owner) {
      throw new Error("Takas süreci için kullanıcı veya kitap bilgisi eksik.");
    }

    const { data: existingExchange, error: existingExchangeError } = await supabase
      .from("exchanges")
      .select("id")
      .eq("conversation_id", conversationId)
      .in("status", activeExchangeStatuses)
      .limit(1)
      .maybeSingle();

    if (existingExchangeError) {
      throw new Error(existingExchangeError.message);
    }

    if (existingExchange) {
      return;
    }

    const requesterId = userBook.user_id === currentUserId ? owner.id : currentUserId;
    const { error } = await supabase.from("exchanges").insert({
      conversation_id: conversationId,
      user_book_id: userBook.id,
      requester_id: requesterId,
      owner_id: userBook.user_id,
      requested_by: currentUserId,
      last_action_by: currentUserId,
      status: "requested",
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async function startConversation() {
    if (!currentUserId || !userBook || !owner || startingConversation) return;

    if (isMine) {
      Alert.alert("Bu kitap senin", "Kendi kitabın için sohbet veya takas başlatamazsın.");
      return;
    }

    setStartingConversation(true);

    try {
      const { data: existingConversations, error: existingError } = await supabase
        .from("conversations")
        .select("id, user_one_id, user_two_id")
        .eq("user_book_id", userBook.id)
        .or(`user_one_id.eq.${currentUserId},user_two_id.eq.${currentUserId}`);

      if (existingError) {
        throw new Error(existingError.message);
      }

      const existingConversation = existingConversations?.find((conversation) => {
        const sameUsers =
          (conversation.user_one_id === currentUserId && conversation.user_two_id === owner.id) ||
          (conversation.user_one_id === owner.id && conversation.user_two_id === currentUserId);

        return sameUsers;
      });

      if (existingConversation) {
        await ensureExchange(existingConversation.id);
        router.push({
          pathname: "/messages/[userId]",
          params: { userId: owner.id, conversationId: existingConversation.id },
        } as never);
        return;
      }

      const now = new Date().toISOString();
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          user_one_id: currentUserId,
          user_two_id: owner.id,
          user_book_id: userBook.id,
          last_message: "Sohbet ve takas süreci başlatıldı.",
          last_message_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      if (error || !conversation) {
        throw new Error(error?.message || "Yeni sohbet oluşturulamadı.");
      }

      await ensureExchange(conversation.id);

      router.push({
        pathname: "/messages/[userId]",
        params: { userId: owner.id, conversationId: conversation.id },
      } as never);
    } catch (error) {
      Alert.alert(
        "Sohbet ve takas başlatılamadı",
        error instanceof Error ? error.message : "Lütfen tekrar dene."
      );
    } finally {
      setStartingConversation(false);
    }
  }

  if (loading) {
    return <LoadingState label="Kitap detayı yükleniyor..." />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
    >
      <AppHero
        eyebrow="Kitap Detayı"
        title={book?.title || "Kitap"}
        description={book?.author || "Yazar bilgisi yok"}
        onBack={() => router.back()}
      >
        {userBook ? (
          <View style={styles.headerBadges}>
            <Text style={styles.headerBadge}>{getStatusLabel(userBook.status)}</Text>
            <Text style={styles.headerBadge}>{getExchangeLabel(userBook.exchange_type)}</Text>
            <Text style={styles.headerBadge}>{getConditionLabel(userBook.condition)}</Text>
          </View>
        ) : null}
      </AppHero>

      {errorMessage ? <ErrorCard title="Kitap detayı yüklenemedi" message={errorMessage} /> : null}

      {userBook && book && owner ? (
        <>
          <View style={styles.coverCard}>
            <View style={styles.coverFrame}>
              {book.image ? (
                <Image source={{ uri: book.image }} style={styles.coverImage} contentFit="cover" />
              ) : (
                <Text style={styles.coverFallback}>📖</Text>
              )}
            </View>

            <View style={styles.coverInfo}>
              <Text style={styles.categoryBadge}>{book.category}</Text>
              {book.isbn ? <Text style={styles.metaLine}>ISBN: {book.isbn}</Text> : null}
              <Text style={styles.metaLine}>Eklenme: {formatDate(userBook.created_at)}</Text>
              <Text style={styles.metaLine}>
                Konum: {userBook.city || owner.city} / {userBook.university || owner.university}
              </Text>
            </View>
          </View>

          <AppCard>
            {isMine ? (
              <>
                <Text style={styles.actionTitle}>Bu kitap senin rafında</Text>
                <Text style={styles.actionText}>Rafını mobilde görüntüleyebilir ve yeni kitap ekleyebilirsin.</Text>
                <AppButton label="Rafıma Git" onPress={() => router.push("/my-books" as never)} />
              </>
            ) : (
              <>
                <Text style={styles.actionTitle}>Sohbet ve takas sürecini başlat</Text>
                <Text style={styles.actionText}>
                  Web tarafındaki mantıkla aynı şekilde sohbet açılır ve bu kitap için aktif takas kaydı oluşturulur.
                </Text>
                <AppButton
                  label="Mesaj Gönder ve Takası Başlat"
                  onPress={startConversation}
                  loading={startingConversation}
                />
              </>
            )}
          </AppCard>

          <AppCard>
            <Text style={styles.sectionEyebrow}>Kitap Notu</Text>
            <Text style={styles.sectionTitle}>Açıklama</Text>
            <Text style={styles.bodyText}>
              {userBook.note || book.description || "Bu kitap için henüz açıklama eklenmemiş."}
            </Text>
          </AppCard>

          <AppCard>
            <Text style={styles.sectionEyebrow}>Kitap Sahibi</Text>
            <View style={styles.ownerTopRow}>
              <View style={styles.avatar}>
                {owner.avatarUrl ? (
                  <Image source={{ uri: owner.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{getInitial(owner.fullName)}</Text>
                )}
              </View>

              <View style={styles.ownerMain}>
                <Text style={styles.ownerName} numberOfLines={2}>
                  {owner.fullName}
                </Text>
                <Text style={styles.ownerMeta} numberOfLines={1}>
                  {owner.username ? `@${owner.username}` : getVerificationLabel(owner.verificationStatus)}
                </Text>
              </View>
            </View>

            <View style={styles.ownerGrid}>
              <InfoBox label="Üniversite" value={owner.university} />
              <InfoBox label="Bölüm" value={owner.department} />
              <InfoBox label="Şehir" value={owner.city} />
              <InfoBox label="Güven" value={String(owner.trustScore)} />
            </View>

            {owner.bio ? <Text style={styles.ownerBio}>{owner.bio}</Text> : null}

            <View style={styles.trustRow}>
              <Text style={[styles.trustBadge, owner.isVerified && styles.verifiedBadge]}>
                {getVerificationLabel(owner.verificationStatus)}
              </Text>
              <Text style={styles.trustBadge}>{owner.completedExchangeCount} takas</Text>
              <Text style={styles.trustBadge}>Yanıt {owner.responseScore}</Text>
            </View>
          </AppCard>

          <AppCard tone="amber">
            <Text style={styles.noticeTitle}>Güvenli teslim notu</Text>
            <Text style={styles.noticeText}>
              Görüşmeyi uygulama içinde sürdür, mümkünse kampüs veya kalabalık bir noktada buluş, teslimden önce kişisel bilgilerini paylaşma.
            </Text>
          </AppCard>
        </>
      ) : null}
    </ScrollView>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
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
  backButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  eyebrow: { marginTop: 18, color: "#F5EBDD", fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { marginTop: 12, color: "#fff", fontSize: 30, lineHeight: 36, fontWeight: "900" },
  description: { marginTop: 7, color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 22, fontWeight: "700" },
  headerBadges: { marginTop: 15, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headerBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
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
  coverCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  coverFrame: {
    alignSelf: "center",
    width: 190,
    height: 270,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: { width: "100%", height: "100%" },
  coverFallback: { fontSize: 62 },
  coverInfo: { marginTop: 14, gap: 7 },
  categoryBadge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },
  metaLine: { color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "800" },
  actionCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  actionTitle: { color: TEXT, fontSize: 19, fontWeight: "900" },
  actionText: { marginTop: 6, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  primaryButton: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: GREEN,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  disabledButton: { opacity: 0.7 },
  card: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionEyebrow: { color: AMBER, fontSize: 11, fontWeight: "900", letterSpacing: 1.6, textTransform: "uppercase" },
  sectionTitle: { marginTop: 7, color: TEXT, fontSize: 20, fontWeight: "900" },
  bodyText: { marginTop: 9, color: MUTED, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  ownerCard: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ownerTopRow: { marginTop: 12, flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(46,125,91,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: GREEN, fontSize: 24, fontWeight: "900" },
  ownerMain: { flex: 1, minWidth: 0 },
  ownerName: { color: TEXT, fontSize: 19, lineHeight: 24, fontWeight: "900" },
  ownerMeta: { marginTop: 3, color: MUTED, fontSize: 12, fontWeight: "800" },
  ownerGrid: { marginTop: 15, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  infoBox: { width: "48%", borderRadius: 18, backgroundColor: BG, padding: 13 },
  infoLabel: { color: MUTED, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  infoValue: { marginTop: 5, color: TEXT, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  ownerBio: { marginTop: 14, borderRadius: 18, backgroundColor: BG, padding: 13, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "600" },
  trustRow: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trustBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: DARK_GREEN,
    fontSize: 10,
    fontWeight: "900",
  },
  verifiedBadge: { backgroundColor: "rgba(245,158,11,0.15)", color: "#B45309" },
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
});
