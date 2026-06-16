import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { createMobileNotification, getActorDisplayName } from "@/lib/notifications";
import { deleteStorageObjectFromPublicUrl } from "@/lib/storage-images";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const DARK_GREEN = "#25684C";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";

type BasicProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string | null;
};

type PostProfile = BasicProfile & {
  university: string | null;
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

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: BasicProfile | BasicProfile[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getProfileName(profile?: BasicProfile | null) {
  return profile?.full_name || profile?.username || "KampusRaf kullanicisi";
}

function getInitial(profile?: BasicProfile | null) {
  return getProfileName(profile).trim().slice(0, 1).toLocaleUpperCase("tr-TR") || "K";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PostDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const postId = normalizeParam(params.postId);

  const [post, setPost] = useState<SocialPost | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    setErrorMessage(null);

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (sessionError) setErrorMessage(sessionError.message);

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    if (!postId) {
      setErrorMessage("Gonderi bulunamadi.");
      return;
    }

    setCurrentUserId(user.id);

    const { data: postData, error: postError } = await supabase
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
      .eq("id", postId)
      .maybeSingle();

    if (postError || !postData) {
      setErrorMessage(postError?.message || "Gonderi yuklenemedi.");
      setPost(null);
      return;
    }

    const { count: nextLikesCount } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    const { data: myLike } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: commentsData } = await supabase
      .from("post_comments")
      .select(
        `
        id,
        post_id,
        user_id,
        content,
        created_at,
        profiles (
          id,
          full_name,
          username,
          avatar_url,
          verification_status
        )
      `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setPost(postData as SocialPost);
    setLikesCount(nextLikesCount || 0);
    setLiked(Boolean(myLike));
    setComments((commentsData || []) as PostComment[]);
  }, [postId]);

  useEffect(() => {
    loadPost().finally(() => setLoading(false));
  }, [loadPost]);

  async function onRefresh() {
    setRefreshing(true);
    await loadPost();
    setRefreshing(false);
  }

  async function toggleLike() {
    if (!postId || !currentUserId || togglingLike || !post) return;

    setTogglingLike(true);

    if (liked) {
      const { data: existingLike, error } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!error && existingLike) {
        await supabase.from("post_likes").delete().eq("id", existingLike.id);
        setLiked(false);
        setLikesCount((current) => Math.max(current - 1, 0));
      }
    } else {
      const { error } = await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: currentUserId,
      });

      if (!error) {
        if (post.user_id !== currentUserId) {
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

        setLiked(true);
        setLikesCount((current) => current + 1);
      }
    }

    setTogglingLike(false);
  }

  async function submitComment() {
    if (!postId || !currentUserId || sendingComment || !post) return;

    const content = commentText.trim();
    if (!content) return;

    setSendingComment(true);

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content,
    });

    setSendingComment(false);

    if (error) {
      Alert.alert("Yorum gonderilemedi", error.message);
      return;
    }

    if (post.user_id !== currentUserId) {
      const actorName = await getActorDisplayName(currentUserId);
      const isQuotePost = post.post_type === "quote";

      await createMobileNotification({
        userId: post.user_id,
        type: "social_comment",
        title: isQuotePost ? "Alinti paylasimina yorum geldi" : "Gonderine yorum geldi",
        message: `${actorName} paylasimina yorum yapti: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`,
        linkUrl: `/gonderi/${postId}`,
        targetUrl: `/gonderi/${postId}`,
      });
    }

    setCommentText("");
    await loadPost();
  }

  async function handleDeletePost() {
    if (!post || !currentUserId || deletingPost) return;

    Alert.alert("Gonderi silinsin mi?", "Bu islem geri alinmaz.", [
      { text: "Vazgec", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          setDeletingPost(true);

          await deleteStorageObjectFromPublicUrl({
            bucket: "post-images",
            publicUrl: post.image_url,
            expectedUserId: currentUserId,
          });

          const { error } = await supabase.from("social_posts").delete().eq("id", post.id).eq("user_id", currentUserId);

          setDeletingPost(false);

          if (error) {
            Alert.alert("Gonderi silinemedi", error.message);
            return;
          }

          router.replace("/feed");
        },
      },
    ]);
  }

  const derived = useMemo(() => {
    const profile = first(post?.profiles);
    const book = first(post?.books);
    const quoteItem = first(post?.quote_items);
    const quoteBook = first(quoteItem?.quote_books);
    const isQuotePost = post?.post_type === "quote" && Boolean(quoteItem);
    const displayQuote = quoteItem?.quote_text_tr || quoteItem?.quote_text || "";

    return { profile, book, quoteItem, quoteBook, isQuotePost, displayQuote };
  }, [post]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={GREEN} size="large" />
          <Text style={styles.loadingText}>Gonderi yukleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Gonderi bulunamadi</Text>
          {errorMessage ? <Text style={styles.emptyText}>{errorMessage}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  const isOwnPost = currentUserId === post.user_id;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        >
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Geri</Text>
            </Pressable>

            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Gonderi Detayi</Text>
              <Text style={styles.headerMeta}>{formatDate(post.created_at)}</Text>
            </View>

            {isOwnPost ? (
              <Pressable style={styles.deleteButton} onPress={handleDeletePost}>
                {deletingPost ? <ActivityIndicator color="#B91C1C" size="small" /> : <Text style={styles.deleteButtonText}>Sil</Text>}
              </Pressable>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                {derived.profile?.avatar_url ? (
                  <Image source={{ uri: derived.profile.avatar_url }} style={styles.avatarImage} contentFit="cover" accessibilityLabel={getProfileName(derived.profile)} />
                ) : (
                  <Text style={styles.avatarText}>{getInitial(derived.profile)}</Text>
                )}
              </View>

              <View style={styles.authorInfo}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {getProfileName(derived.profile)}
                </Text>
                <Text style={styles.authorMeta} numberOfLines={1}>
                  {(derived.profile as PostProfile | null)?.university || "Universite bilgisi yok"}
                </Text>
              </View>
            </View>

            {derived.isQuotePost ? (
              <View style={styles.quoteBox}>
                <View style={styles.badgeRow}>
                  {derived.quoteItem?.mood ? <Badge label={derived.quoteItem.mood} /> : null}
                  {derived.quoteItem?.topic ? <Badge label={derived.quoteItem.topic} amber /> : null}
                </View>
                <Text style={styles.quoteText}>{`"${derived.quoteItem?.quote_text || ""}"`}</Text>
                {derived.quoteItem?.original_language !== "tr" && derived.quoteItem?.quote_text_tr ? (
                  <View style={styles.translationBox}>
                    <Text style={styles.translationLabel}>Turkce ceviri</Text>
                    <Text style={styles.translationText}>{`"${derived.quoteItem.quote_text_tr}"`}</Text>
                  </View>
                ) : null}
                <Text style={styles.quoteMeta}>
                  {derived.quoteBook?.title || "Kitap bilgisi yok"}
                  {derived.quoteBook?.author ? ` • ${derived.quoteBook.author}` : ""}
                  {derived.quoteBook?.source_name ? ` • ${derived.quoteBook.source_name}` : ""}
                </Text>
              </View>
            ) : post.image_url ? (
              <Image
                source={{ uri: post.image_url }}
                style={styles.postImage}
                contentFit="cover"
                accessibilityLabel={post.caption || "Gonderi gorseli"}
              />
            ) : null}

            {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

            {derived.book ? (
              <View style={styles.bookTag}>
                <Text style={styles.bookTagText}>
                  {derived.book.title || "Kitap"}
                  {derived.book.author ? ` • ${derived.book.author}` : ""}
                </Text>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable style={[styles.likeButton, liked && styles.activeLikeButton]} onPress={toggleLike}>
                {togglingLike ? (
                  <ActivityIndicator color={liked ? "#fff" : GREEN} size="small" />
                ) : (
                  <Text style={[styles.likeButtonText, liked && styles.activeLikeButtonText]}>
                    {liked ? "Begenildi" : "Begen"} • {likesCount}
                  </Text>
                )}
              </Pressable>

              <View style={styles.commentCountBox}>
                <Text style={styles.commentCountText}>Yorum • {comments.length}</Text>
              </View>
            </View>
          </View>

          <View style={styles.commentsCard}>
            <Text style={styles.sectionTitle}>Yorumlar</Text>

            {comments.length === 0 ? (
              <View style={styles.emptyCommentBox}>
                <Text style={styles.emptyText}>Ilk yorumu sen yazabilirsin.</Text>
              </View>
            ) : (
              <View style={styles.commentList}>
                {comments.map((comment) => {
                  const profile = first(comment.profiles);

                  return (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentAvatar}>
                        {profile?.avatar_url ? (
                          <Image source={{ uri: profile.avatar_url }} style={styles.commentAvatarImage} contentFit="cover" accessibilityLabel={getProfileName(profile)} />
                        ) : (
                          <Text style={styles.commentAvatarText}>{getInitial(profile)}</Text>
                        )}
                      </View>

                      <View style={styles.commentMain}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor} numberOfLines={1}>
                            {getProfileName(profile)}
                          </Text>
                          <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                        </View>
                        <Text style={styles.commentContent}>{comment.content}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Yorum yaz..."
            placeholderTextColor="#94A3B8"
            style={styles.input}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendButton, (!commentText.trim() || sendingComment) && styles.disabledButton]}
            onPress={submitComment}
            disabled={!commentText.trim() || sendingComment}
          >
            {sendingComment ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendButtonText}>Gonder</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Badge({ label, amber = false }: { label: string; amber?: boolean }) {
  return (
    <View style={[styles.badge, amber && styles.badgeAmber]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG, padding: 24 },
  loadingText: { marginTop: 10, color: MUTED, fontWeight: "800" },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: {
    borderRadius: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  backButtonText: { color: DARK_GREEN, fontSize: 14, fontWeight: "900" },
  headerInfo: { flex: 1 },
  headerTitle: { color: TEXT, fontSize: 22, fontWeight: "900" },
  headerMeta: { marginTop: 2, color: MUTED, fontSize: 12, fontWeight: "700" },
  deleteButton: {
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: { color: "#B91C1C", fontSize: 11, fontWeight: "900" },
  card: {
    marginTop: 14,
    borderRadius: 28,
    backgroundColor: "#fff",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  authorInfo: { flex: 1, minWidth: 0 },
  authorName: { color: TEXT, fontSize: 18, fontWeight: "900" },
  authorMeta: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "700" },
  postImage: { marginTop: 14, width: "100%", height: 360, borderRadius: 24, backgroundColor: "#E2E8F0" },
  quoteBox: { marginTop: 14, borderRadius: 24, backgroundColor: GREEN, padding: 18 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, paddingVertical: 6 },
  badgeAmber: { backgroundColor: "#F59E0B" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  quoteText: { marginTop: 14, color: "#fff", fontSize: 22, lineHeight: 32, fontWeight: "900" },
  translationBox: { marginTop: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", padding: 12 },
  translationLabel: { color: "#F5EBDD", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  translationText: { marginTop: 6, color: "#fff", fontSize: 18, lineHeight: 28, fontWeight: "800" },
  quoteMeta: { marginTop: 12, color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700" },
  caption: { marginTop: 14, color: TEXT, fontSize: 14, lineHeight: 22, fontWeight: "700" },
  bookTag: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  bookTagText: { color: "#92400E", fontSize: 11, fontWeight: "900" },
  actionRow: { marginTop: 16, flexDirection: "row", gap: 8 },
  likeButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(46,125,91,0.08)",
    paddingVertical: 14,
    alignItems: "center",
  },
  activeLikeButton: { backgroundColor: GREEN },
  likeButtonText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  activeLikeButtonText: { color: "#fff" },
  commentCountBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    alignItems: "center",
  },
  commentCountText: { color: MUTED, fontSize: 12, fontWeight: "900" },
  commentsCard: {
    marginTop: 14,
    borderRadius: 28,
    backgroundColor: "#fff",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: { color: TEXT, fontSize: 20, fontWeight: "900" },
  emptyCommentBox: { marginTop: 12, borderRadius: 18, backgroundColor: BG, padding: 16 },
  emptyTitle: { color: TEXT, fontSize: 22, fontWeight: "900", textAlign: "center" },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  commentList: { marginTop: 12, gap: 12 },
  commentCard: { flexDirection: "row", gap: 10, borderRadius: 20, backgroundColor: BG, padding: 14 },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  commentAvatarImage: { width: "100%", height: "100%" },
  commentAvatarText: { color: GREEN, fontSize: 16, fontWeight: "900" },
  commentMain: { flex: 1, minWidth: 0 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentAuthor: { flex: 1, color: TEXT, fontSize: 13, fontWeight: "900" },
  commentDate: { color: MUTED, fontSize: 10, fontWeight: "700" },
  commentContent: { marginTop: 4, color: TEXT, fontSize: 13, lineHeight: 20, fontWeight: "700" },
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
  input: {
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
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { opacity: 0.45 },
  sendButtonText: { color: "#fff", fontWeight: "900" },
});
