import { Image } from "expo-image";
import { router } from "expo-router";
import { Fragment, useEffect, useMemo, useState } from "react";
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
import { createMobileNotification, getActorDisplayName } from "@/lib/notifications";
import { deleteStorageObjectFromPublicUrl } from "@/lib/storage-images";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const DARK_GREEN = "#25684C";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";

type PostProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string | null;
  university: string | null;
  plan_type?: string | null;
};

type RelatedBook = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
};

type QuoteBook = {
  title: string | null;
  author: string | null;
  source_name: string | null;
};

type QuoteItem = {
  id: string;
  quote_text: string;
  quote_text_tr: string | null;
  original_language: string | null;
  mood: string | null;
  topic: string | null;
  quote_books: QuoteBook | QuoteBook[] | null;
};

type SocialPost = {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  visibility: string;
  post_type: string | null;
  quote_id: string | null;
  related_book_id: string | null;
  created_at: string;
  profiles: PostProfile | PostProfile[] | null;
  books: RelatedBook | RelatedBook[] | null;
  quote_items: QuoteItem | QuoteItem[] | null;
};

type Friendship = {
  requester_id: string;
  addressee_id: string;
  status: string;
};

type PostLike = {
  id: string;
  post_id: string;
  user_id: string;
};

type PostComment = {
  id: string;
  post_id: string;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getProfileName(profile?: PostProfile | null) {
  return profile?.full_name || profile?.username || "KampusRaf kullanicisi";
}

function getInitial(profile?: PostProfile | null) {
  return getProfileName(profile).trim().slice(0, 1).toLocaleUpperCase("tr-TR") || "K";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function countByPostId<T extends { post_id: string }>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.post_id] = (acc[item.post_id] || 0) + 1;
    return acc;
  }, {});
}

function trimText(value?: string | null, max = 180) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export default function FeedScreen() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [currentProfile, setCurrentProfile] = useState<PostProfile | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [favoriteQuoteCount, setFavoriteQuoteCount] = useState(0);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyLikeId, setBusyLikeId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadFeed() {
    setErrorMessage(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (sessionError) setErrorMessage(sessionError.message);

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    setCurrentUserId(user.id);

    const [
      profileRes,
      favoriteQuotesRes,
      friendshipsRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, verification_status, university, plan_type")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("quote_favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    ]);

    const friendshipsData = friendshipsRes.data;
    const friendshipsError = friendshipsRes.error;

    if (friendshipsError) {
      setErrorMessage(friendshipsError.message);
      setPosts([]);
      return;
    }

    const friendships = (friendshipsData || []) as Friendship[];
    const friendIds = friendships.map((friendship) =>
      friendship.requester_id === user.id ? friendship.addressee_id : friendship.requester_id
    );
    const visibleUserIds = Array.from(new Set([user.id, ...friendIds]));

    const { data: postsData, error: postsError } = await supabase
      .from("social_posts")
      .select(
        `
        id,
        user_id,
        image_url,
        caption,
        visibility,
        post_type,
        quote_id,
        related_book_id,
        created_at,
        profiles (
          id,
          full_name,
          username,
          avatar_url,
          verification_status,
          university
        ),
        books (
          id,
          title,
          author,
          cover_url
        ),
        quote_items (
          id,
          quote_text,
          quote_text_tr,
          original_language,
          mood,
          topic,
          quote_books (
            title,
            author,
            source_name
          )
        )
      `
      )
      .in("user_id", visibleUserIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsError) {
      setErrorMessage(postsError.message);
      setPosts([]);
      return;
    }

    const nextPosts = (postsData || []) as SocialPost[];
    const postIds = nextPosts.map((post) => post.id);

    let likes: PostLike[] = [];
    let comments: PostComment[] = [];

    if (postIds.length > 0) {
      const { data: likesData } = await supabase.from("post_likes").select("id, post_id, user_id").in("post_id", postIds);

      const { data: commentsData } = await supabase.from("post_comments").select("id, post_id").in("post_id", postIds);

      likes = (likesData || []) as PostLike[];
      comments = (commentsData || []) as PostComment[];
    }

    setPosts(nextPosts);
    setCurrentProfile((profileRes.data || null) as PostProfile | null);
    setFavoriteQuoteCount(favoriteQuotesRes.count || 0);
    setFriendCount(friendIds.length);
    setLikeCounts(countByPostId(likes));
    setCommentCounts(countByPostId(comments));
    setLikedPostIds(new Set(likes.filter((like) => like.user_id === user.id).map((like) => like.post_id)));
  }

  useEffect(() => {
    loadFeed().finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }

  async function toggleLike(postId: string) {
    if (!currentUserId || busyLikeId) return;

    setBusyLikeId(postId);
    const liked = likedPostIds.has(postId);

    if (liked) {
      const { data: existingLike, error } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!error && existingLike) {
        await supabase.from("post_likes").delete().eq("id", existingLike.id);
        setLikedPostIds((current) => {
          const next = new Set(current);
          next.delete(postId);
          return next;
        });
        setLikeCounts((current) => ({ ...current, [postId]: Math.max((current[postId] || 1) - 1, 0) }));
      }
    } else {
      const { error } = await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: currentUserId,
      });

      if (!error) {
        const post = posts.find((item) => item.id === postId) || null;

        if (post && post.user_id !== currentUserId) {
          const actorName = await getActorDisplayName(currentUserId);
          const isQuotePost = post.post_type === "quote";

          await createMobileNotification({
            userId: post.user_id,
            type: "social_like",
            title: isQuotePost ? "Alinti paylasimin begenildi" : "Gonderin begenildi",
            message: `${actorName} paylasimini begendi.`,
            linkUrl: `/gonderi/${postId}`,
            targetUrl: `/gonderi/${postId}`,
          });
        }

        setLikedPostIds((current) => new Set([...current, postId]));
        setLikeCounts((current) => ({ ...current, [postId]: (current[postId] || 0) + 1 }));
      }
    }

    setBusyLikeId(null);
  }

  async function deletePost(post: SocialPost) {
    if (!currentUserId || deletingPostId) return;

    Alert.alert("Gonderi silinsin mi?", "Bu islem geri alinmaz.", [
      { text: "Vazgec", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          setDeletingPostId(post.id);

          await deleteStorageObjectFromPublicUrl({
            bucket: "post-images",
            publicUrl: post.image_url,
            expectedUserId: currentUserId,
          });

          const { error } = await supabase.from("social_posts").delete().eq("id", post.id).eq("user_id", currentUserId);

          setDeletingPostId(null);

          if (error) {
            Alert.alert("Gonderi silinemedi", error.message);
            return;
          }

          setPosts((current) => current.filter((item) => item.id !== post.id));
        },
      },
    ]);
  }

  const totalLikes = useMemo(() => Object.values(likeCounts).reduce((sum, value) => sum + value, 0), [likeCounts]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} size="large" />
        <Text style={styles.loadingText}>Sosyal akis yukleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Sosyal Akis</Text>
        <Text style={styles.title}>Kitaplardan dogan sosyal alan.</Text>
        <Text style={styles.description}>
          Arkadaslarinin gonderilerini, kitap etiketlerini ve alinti paylasimlarini tek akis icinde gor.
        </Text>

        <View style={styles.headerStats}>
          <HeaderStat value={posts.length} label="Gonderi" />
          <HeaderStat value={friendCount} label="Arkadas" />
          <HeaderStat value={totalLikes} label="Begeni" />
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/share" as never)}>
          <Text style={styles.primaryButtonText}>Paylas</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={() => router.push("/random-shelf" as never)}>
          <Text style={styles.outlineButtonText}>Rastgele Raf</Text>
        </Pressable>
      </View>

      <View style={styles.communityCard}>
        <View style={styles.communityHeader}>
          <View style={styles.communityAvatar}>
            {currentProfile?.avatar_url ? (
              <Image
                source={{ uri: currentProfile.avatar_url }}
                style={styles.communityAvatarImage}
                contentFit="cover"
                accessibilityLabel={getProfileName(currentProfile)}
              />
            ) : (
              <Text style={styles.communityAvatarText}>{getInitial(currentProfile)}</Text>
            )}
          </View>

          <View style={styles.communityInfo}>
            <Text style={styles.communityTitle}>{getProfileName(currentProfile)}</Text>
            <Text style={styles.communityMeta}>
              {friendCount} arkadas • {favoriteQuoteCount} favori alinti
            </Text>
          </View>
        </View>

        <View style={styles.communityActions}>
          <MiniAction label="Favoriler" onPress={() => router.push("/random-shelf/favorites" as never)} />
          <MiniAction label="Profilim" onPress={() => router.push("/profile" as never)} />
          <MiniAction label="Arkadaslar" onPress={() => router.push("/friends" as never)} />
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Akis yuklenemedi</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <SponsorSlot planType={currentProfile?.plan_type} title="Akis sponsoru" />

      <View style={styles.list}>
        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Henuz gonderi yok</Text>
            <Text style={styles.emptyText}>
              Web tarafindaki sosyal paylasimlar mobile de gorunuyor. Ilk paylasimi sen yapabilirsin.
            </Text>
          </View>
        ) : (
          posts.map((post, index) => {
            const profile = first(post.profiles);
            const book = first(post.books);
            const quoteItem = first(post.quote_items);
            const quoteBook = first(quoteItem?.quote_books);
            const isQuotePost = post.post_type === "quote" && Boolean(quoteItem);
            const liked = likedPostIds.has(post.id);
            const isOwnPost = currentUserId === post.user_id;

            return (
              <Fragment key={post.id}>
              {index > 0 && index % 6 === 0 ? (
                <SponsorSlot planType={currentProfile?.plan_type} compact title="Sosyal sponsor" />
              ) : null}

              <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: "/posts/[postId]", params: { postId: post.id } } as never)}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.authorRow}>
                    <View style={styles.avatar}>
                      {profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} contentFit="cover" accessibilityLabel={getProfileName(profile)} />
                      ) : (
                        <Text style={styles.avatarText}>{getInitial(profile)}</Text>
                      )}
                    </View>

                    <View style={styles.cardHeaderMain}>
                      <View style={styles.nameRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {getProfileName(profile)}
                        </Text>
                        {profile?.verification_status === "verified" ? (
                          <Text style={styles.verifiedBadge}>Dogrulanmis</Text>
                        ) : null}
                      </View>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {profile?.university || "Universite bilgisi yok"} • {formatDate(post.created_at)}
                      </Text>
                    </View>
                  </View>

                  {isOwnPost ? (
                    <Pressable
                      style={styles.deleteBadge}
                      onPress={(event) => {
                        event.stopPropagation();
                        deletePost(post);
                      }}
                    >
                      {deletingPostId === post.id ? <ActivityIndicator color="#B91C1C" size="small" /> : <Text style={styles.deleteBadgeText}>Sil</Text>}
                    </Pressable>
                  ) : null}
                </View>

                {isQuotePost ? (
                  <View style={styles.quoteBox}>
                    <View style={styles.quoteBadgeRow}>
                      {quoteItem?.mood ? <QuoteBadge label={quoteItem.mood} /> : null}
                      {quoteItem?.topic ? <QuoteBadge label={quoteItem.topic} amber /> : null}
                    </View>
                    <Text style={styles.quoteText} numberOfLines={6}>{`"${quoteItem?.quote_text || ""}"`}</Text>
                    {quoteItem?.original_language !== "tr" && quoteItem?.quote_text_tr ? (
                      <View style={styles.translationBox}>
                        <Text style={styles.translationLabel}>Turkce ceviri</Text>
                        <Text style={styles.translationText} numberOfLines={4}>{`"${quoteItem.quote_text_tr}"`}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.quoteMeta} numberOfLines={2}>
                      {quoteBook?.title || "Kitap bilgisi yok"}
                      {quoteBook?.author ? ` • ${quoteBook.author}` : ""}
                      {quoteBook?.source_name ? ` • ${quoteBook.source_name}` : ""}
                    </Text>
                  </View>
                ) : post.image_url ? (
                  <Image
                    source={{ uri: post.image_url }}
                    style={styles.postImage}
                    contentFit="cover"
                    accessibilityLabel={trimText(post.caption, 80) || "Gonderi gorseli"}
                  />
                ) : null}

                {post.caption ? (
                  <Text style={styles.caption} numberOfLines={4}>
                    {trimText(post.caption)}
                  </Text>
                ) : null}

                {book ? (
                  <View style={styles.bookTag}>
                    <Text style={styles.bookTagText} numberOfLines={1}>
                      {book.title || "Kitap"}
                      {book.author ? ` • ${book.author}` : ""}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable
                    style={[styles.likeButton, liked && styles.activeLikeButton]}
                    onPress={(event) => {
                      event.stopPropagation();
                      toggleLike(post.id);
                    }}
                    disabled={busyLikeId === post.id}
                  >
                    {busyLikeId === post.id ? (
                      <ActivityIndicator color={liked ? "#fff" : GREEN} size="small" />
                    ) : (
                      <Text style={[styles.likeButtonText, liked && styles.activeLikeButtonText]}>
                        {liked ? "Begenildi" : "Begen"} • {likeCounts[post.id] || 0}
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.commentButton}
                    onPress={() => router.push({ pathname: "/posts/[postId]", params: { postId: post.id } } as never)}
                  >
                    <Text style={styles.commentButtonText}>Yorum • {commentCounts[post.id] || 0}</Text>
                  </Pressable>
                </View>
              </Pressable>
              </Fragment>
            );
          })
        )}
      </View>
    </ScrollView>
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

function QuoteBadge({ label, amber = false }: { label: string; amber?: boolean }) {
  return (
    <View style={[styles.quoteBadge, amber && styles.quoteBadgeAmber]}>
      <Text style={[styles.quoteBadgeText, amber && styles.quoteBadgeAmberText]}>{label}</Text>
    </View>
  );
}

function MiniAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.miniAction} onPress={onPress}>
      <Text style={styles.miniActionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  primaryButton: { flex: 1.2, borderRadius: 18, backgroundColor: GREEN, paddingVertical: 15, alignItems: "center" },
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
  communityCard: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: CARD,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  communityHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  communityAvatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "rgba(46,125,91,0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  communityAvatarImage: { width: "100%", height: "100%" },
  communityAvatarText: { color: GREEN, fontSize: 22, fontWeight: "900" },
  communityInfo: { flex: 1, minWidth: 0 },
  communityTitle: { color: TEXT, fontSize: 16, fontWeight: "900" },
  communityMeta: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "700" },
  communityActions: { marginTop: 14, flexDirection: "row", gap: 8 },
  miniAction: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: BG,
    paddingVertical: 12,
    alignItems: "center",
  },
  miniActionText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  errorCard: { marginTop: 14, borderRadius: 22, backgroundColor: "#FEF2F2", padding: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { color: "#B91C1C", fontSize: 15, fontWeight: "900" },
  errorText: { marginTop: 4, color: "#991B1B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  list: { marginTop: 16, gap: 12 },
  card: {
    borderRadius: 26,
    backgroundColor: CARD,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTopRow: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  authorRow: { flex: 1, flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: "rgba(46,125,91,0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: GREEN, fontSize: 21, fontWeight: "900" },
  cardHeaderMain: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, color: TEXT, fontSize: 17, fontWeight: "900" },
  verifiedBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: GREEN,
    fontSize: 10,
    fontWeight: "900",
  },
  cardMeta: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "800" },
  deleteBadge: {
    alignSelf: "flex-start",
    minWidth: 44,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  deleteBadgeText: { color: "#B91C1C", fontSize: 11, fontWeight: "900" },
  postImage: { marginTop: 14, width: "100%", height: 280, borderRadius: 22, backgroundColor: BG },
  quoteBox: { marginTop: 14, borderRadius: 22, backgroundColor: GREEN, padding: 18 },
  quoteBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quoteBadge: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, paddingVertical: 6 },
  quoteBadgeAmber: { backgroundColor: "#F59E0B" },
  quoteBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  quoteBadgeAmberText: { color: "#fff" },
  quoteText: { marginTop: 14, color: "#fff", fontSize: 20, lineHeight: 30, fontWeight: "900" },
  translationBox: { marginTop: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", padding: 12 },
  translationLabel: { color: "#F5EBDD", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  translationText: { marginTop: 6, color: "#fff", fontSize: 16, lineHeight: 25, fontWeight: "800" },
  quoteMeta: { marginTop: 12, color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700" },
  caption: { marginTop: 12, color: TEXT, fontSize: 14, lineHeight: 21, fontWeight: "700" },
  bookTag: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  bookTagText: { color: "#92400E", fontSize: 11, fontWeight: "900" },
  cardActions: { marginTop: 14, flexDirection: "row", gap: 8 },
  likeButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(46,125,91,0.08)",
    paddingVertical: 13,
    alignItems: "center",
  },
  activeLikeButton: { backgroundColor: GREEN },
  likeButtonText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  activeLikeButtonText: { color: "#fff" },
  commentButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    paddingVertical: 13,
    alignItems: "center",
  },
  commentButtonText: { color: MUTED, fontSize: 12, fontWeight: "900" },
  emptyCard: { borderRadius: 26, backgroundColor: CARD, padding: 24, alignItems: "center" },
  emptyTitle: { marginTop: 10, color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 6, color: MUTED, fontSize: 13, fontWeight: "700", lineHeight: 20, textAlign: "center" },
});
