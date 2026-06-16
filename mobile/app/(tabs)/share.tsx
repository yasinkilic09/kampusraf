import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { uploadImageAsset, getFriendlyImageError } from "@/lib/storage-images";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const DARK_GREEN = "#25684C";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";

type UserBook = {
  id: string;
  custom_title: string | null;
  custom_author: string | null;
  books:
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }
    | {
        id: string;
        title: string | null;
        author: string | null;
        cover_url: string | null;
      }[]
    | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verification_status: string | null;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getProfileName(profile: Profile | null, email?: string | null) {
  return profile?.full_name || profile?.username || email || "KampusRaf kullanicisi";
}

function getUsername(profile: Profile | null) {
  return profile?.username ? `@${profile.username}` : "@kampusraf";
}

function getSafeVisibility(value: string) {
  return value === "public" ? "public" : "friends";
}

export default function ShareScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [caption, setCaption] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [visibility, setVisibility] = useState<"friends" | "public">("friends");
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<"gallery" | "camera" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setErrorMessage(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (sessionError) setErrorMessage(sessionError.message);

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || null);

      const [{ data: profileData, error: profileError }, { data: booksData, error: booksError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, verification_status")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("user_books")
            .select(
              `
              id,
              custom_title,
              custom_author,
              books (
                id,
                title,
                author,
                cover_url
              )
            `
            )
            .eq("user_id", user.id)
            .eq("status", "available")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

      if (profileError) setErrorMessage(profileError.message);
      if (booksError) setErrorMessage(booksError.message);

      setProfile((profileData || null) as Profile | null);
      setUserBooks((booksData || []) as UserBook[]);
    }

    loadData().finally(() => setLoading(false));
  }, []);

  const selectedBook = useMemo(
    () => userBooks.find((item) => item.id === selectedBookId) || null,
    [selectedBookId, userBooks]
  );

  const selectedBookRelation = first(selectedBook?.books);
  const selectedRelatedBookId = selectedBookRelation?.id || null;

  async function chooseFromGallery() {
    if (picking) return;

    setPicking("gallery");

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Izin gerekli", "Galeriden gorsel secmek icin medya izni vermelisin.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.82,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedAsset(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Galeri acilamadi", getFriendlyImageError(error instanceof Error ? error.message : undefined));
    } finally {
      setPicking(null);
    }
  }

  async function takePhoto() {
    if (picking) return;

    setPicking("camera");

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Izin gerekli", "Kamera ile fotograf cekmek icin kamera izni vermelisin.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.82,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedAsset(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Kamera acilamadi", getFriendlyImageError(error instanceof Error ? error.message : undefined));
    } finally {
      setPicking(null);
    }
  }

  async function createPost() {
    if (saving || !userId) return;

    const cleanCaption = caption.trim();
    const safeVisibility = getSafeVisibility(visibility);

    if (!selectedAsset) {
      Alert.alert("Gorsel gerekli", "Web surumundeki gibi paylasim icin bir gorsel secmelisin.");
      return;
    }

    setSaving(true);

    try {
      const imageUrl = await uploadImageAsset({
        asset: selectedAsset,
        bucket: "post-images",
        userId,
        prefix: "post",
        maxBytes: 10 * 1024 * 1024,
      });

      const { error } = await supabase.from("social_posts").insert({
        user_id: userId,
        post_type: "image",
        image_url: imageUrl,
        caption: cleanCaption || null,
        visibility: safeVisibility,
        related_book_id: selectedRelatedBookId,
      });

      if (error) {
        throw new Error(error.message);
      }

      router.replace("/feed" as never);
    } catch (error) {
      Alert.alert(
        "Paylasim olusturulamadi",
        getFriendlyImageError(error instanceof Error ? error.message : undefined, "Paylasim olusturulamadi.")
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Paylasim ekrani hazirlaniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Geri</Text>
          </Pressable>

          <Text style={styles.eyebrow}>Sosyal Paylasim</Text>
          <Text style={styles.title}>Kitap anini kampusle paylas.</Text>
          <Text style={styles.description}>
            Web akisi ile ayni veri modelini kullaniyoruz: once gorsel sec, sonra aciklamani ve kitap etiketini ekle.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Uyari</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  accessibilityLabel={getProfileName(profile, email)}
                />
              ) : (
                <Text style={styles.avatarText}>{getProfileName(profile, email).slice(0, 1).toUpperCase()}</Text>
              )}
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{getProfileName(profile, email)}</Text>
              <Text style={styles.profileMeta}>{getUsername(profile)}</Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>Paylasim Gorseli</Text>
          <View style={styles.mediaActionRow}>
            <ActionButton
              label={picking === "gallery" ? "Seciliyor..." : "Galeriden Sec"}
              onPress={chooseFromGallery}
              active
              disabled={Boolean(picking) || saving}
            />
            <ActionButton
              label={picking === "camera" ? "Aciliyor..." : "Fotograf Cek"}
              onPress={takePhoto}
              disabled={Boolean(picking) || saving}
            />
          </View>

          {selectedAsset ? (
            <View style={styles.selectedMediaCard}>
              <Image
                source={{ uri: selectedAsset.uri }}
                style={styles.previewImage}
                contentFit="cover"
                accessibilityLabel="Secilen paylasim gorseli"
              />
              <View style={styles.mediaMetaRow}>
                <Text style={styles.mediaMetaText} numberOfLines={1}>
                  {selectedAsset.fileName || "Secilen gorsel"}
                </Text>
                <Pressable onPress={() => setSelectedAsset(null)}>
                  <Text style={styles.removeText}>Kaldir</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderTitle}>Henuz gorsel secilmedi</Text>
              <Text style={styles.previewPlaceholderText}>
                Galeriden sec veya anlik fotograf cek. JPG, PNG ve WEBP dosyalari desteklenir.
              </Text>
            </View>
          )}

          <Input
            label="Aciklama"
            value={caption}
            onChangeText={setCaption}
            placeholder="Paylasimina kisa ve dogal bir aciklama yaz..."
            multiline
          />

          <Text style={styles.inputLabel}>Gorunurluk</Text>
          <View style={styles.segmentRow}>
            <SegmentButton
              label="Arkadaslar"
              active={visibility === "friends"}
              onPress={() => setVisibility("friends")}
            />
            <SegmentButton label="Herkes" active={visibility === "public"} onPress={() => setVisibility("public")} />
          </View>

          <Text style={styles.inputLabel}>Kitap Etiketi</Text>
          <View style={styles.bookList}>
            <Pressable
              style={[styles.bookChoice, selectedBookId === "" && styles.selectedBookChoice]}
              onPress={() => setSelectedBookId("")}
            >
              <Text style={[styles.bookChoiceText, selectedBookId === "" && styles.selectedBookChoiceText]}>
                Kitap etiketi ekleme
              </Text>
            </Pressable>

            {userBooks.map((item) => {
              const book = first(item.books);
              const title = item.custom_title || book?.title || "Kitap";
              const author = item.custom_author || book?.author || "Yazar belirtilmemis";
              const active = item.id === selectedBookId;

              return (
                <Pressable
                  key={item.id}
                  style={[styles.bookChoice, active && styles.selectedBookChoice]}
                  onPress={() => setSelectedBookId(item.id)}
                >
                  <Text style={[styles.bookChoiceTitle, active && styles.selectedBookChoiceText]} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={[styles.bookChoiceMeta, active && styles.selectedBookChoiceText]} numberOfLines={1}>
                    {author}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Onizleme</Text>
          <Text style={styles.sectionDescription}>
            Gonderin mobilde secilen gercek gorselle, web ile ayni `social_posts` tablosuna yazilacak.
          </Text>

          {selectedAsset ? (
            <Image
              source={{ uri: selectedAsset.uri }}
              style={styles.previewLarge}
              contentFit="cover"
              accessibilityLabel="Paylasim onizleme gorseli"
            />
          ) : (
            <View style={styles.previewPlaceholderLarge}>
              <Text style={styles.previewPlaceholderText}>Gorsel onizlemesi burada gorunecek</Text>
            </View>
          )}

          <View style={styles.previewCaptionBox}>
            <Text style={styles.previewCaptionText}>
              {caption.trim() || "Aciklama eklenmediyse gonderi daha sade gorunur."}
            </Text>
          </View>

          {selectedBook ? (
            <View style={styles.tagBox}>
              <Text style={styles.tagText}>
                {selectedBook.custom_title || selectedBookRelation?.title || "Kitap"}
                {selectedBook.custom_author || selectedBookRelation?.author
                  ? ` • ${selectedBook.custom_author || selectedBookRelation?.author}`
                  : ""}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Web ile eslesen kisimlar</Text>
          <Text style={styles.noticeText}>
            Gorsel zorunlu, yukleme `post-images` bucket alanina gidiyor ve kayit `image` turunde olusuyor. Yani web akisi ile bire bir ayni veri modeli.
          </Text>
        </View>

        <Pressable
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={createPost}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Paylasimi Yayinla</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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

function ActionButton({
  label,
  onPress,
  active = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.actionButton, active && styles.actionButtonActive, disabled && styles.disabledSurface]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.actionButtonText, active && styles.actionButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
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
  backButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  eyebrow: { marginTop: 16, color: "#F5EBDD", fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { marginTop: 12, color: "#fff", fontSize: 29, lineHeight: 35, fontWeight: "900" },
  description: { marginTop: 10, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  errorCard: { marginTop: 14, borderRadius: 22, backgroundColor: "#FEF2F2", padding: 16, borderWidth: 1, borderColor: "#FECACA" },
  errorTitle: { color: "#B91C1C", fontSize: 15, fontWeight: "900" },
  errorText: { marginTop: 4, color: "#991B1B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  card: {
    marginTop: 16,
    borderRadius: 28,
    backgroundColor: CARD,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
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
  avatarText: { color: GREEN, fontSize: 20, fontWeight: "900" },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { color: TEXT, fontSize: 17, fontWeight: "900" },
  profileMeta: { marginTop: 4, color: MUTED, fontSize: 12, fontWeight: "700" },
  inputGroup: { marginTop: 12 },
  inputLabel: { marginTop: 12, marginBottom: 7, color: TEXT, fontSize: 13, fontWeight: "900" },
  input: {
    borderRadius: 18,
    backgroundColor: BG,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: TEXT,
    fontWeight: "700",
  },
  textarea: { minHeight: 120, textAlignVertical: "top" },
  mediaActionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: BG,
    paddingVertical: 13,
    alignItems: "center",
  },
  actionButtonActive: { backgroundColor: GREEN },
  actionButtonText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  actionButtonTextActive: { color: "#fff" },
  disabledSurface: { opacity: 0.6 },
  selectedMediaCard: { marginTop: 12 },
  previewImage: { width: "100%", height: 250, borderRadius: 22, backgroundColor: "#E2E8F0" },
  mediaMetaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  mediaMetaText: { flex: 1, color: MUTED, fontSize: 12, fontWeight: "700" },
  removeText: { color: "#B91C1C", fontSize: 12, fontWeight: "900" },
  previewPlaceholder: {
    marginTop: 12,
    borderRadius: 22,
    backgroundColor: BG,
    padding: 18,
    alignItems: "center",
  },
  previewPlaceholderTitle: { color: TEXT, fontSize: 14, fontWeight: "900" },
  previewPlaceholderText: { marginTop: 6, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700", textAlign: "center" },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  segmentButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: BG,
    paddingVertical: 13,
    alignItems: "center",
  },
  segmentButtonActive: { backgroundColor: GREEN },
  segmentButtonText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  segmentButtonTextActive: { color: "#fff" },
  bookList: { marginTop: 4, gap: 8 },
  bookChoice: { borderRadius: 18, backgroundColor: BG, padding: 14 },
  selectedBookChoice: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  bookChoiceText: { color: DARK_GREEN, fontSize: 12, fontWeight: "900" },
  selectedBookChoiceText: { color: "#92400E" },
  bookChoiceTitle: { color: TEXT, fontSize: 13, fontWeight: "900" },
  bookChoiceMeta: { marginTop: 4, color: MUTED, fontSize: 11, fontWeight: "700" },
  sectionTitle: { color: TEXT, fontSize: 20, fontWeight: "900" },
  sectionDescription: { marginTop: 6, color: MUTED, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  previewLarge: { marginTop: 14, width: "100%", height: 300, borderRadius: 24, backgroundColor: "#E2E8F0" },
  previewPlaceholderLarge: {
    marginTop: 14,
    height: 220,
    borderRadius: 24,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  previewCaptionBox: { marginTop: 14, borderRadius: 20, backgroundColor: BG, padding: 14 },
  previewCaptionText: { color: TEXT, fontSize: 14, lineHeight: 21, fontWeight: "700" },
  tagBox: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  tagText: { color: "#92400E", fontSize: 11, fontWeight: "900" },
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
  submitButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: GREEN,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
});
