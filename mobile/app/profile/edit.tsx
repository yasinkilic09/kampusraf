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
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { getFriendlyImageError, uploadImageAsset } from "@/lib/storage-images";
import {
  distanceRadiusOptions,
  getMatchDistanceConfig,
  normalizeDistanceRadiusForPlan,
  normalizePlanType,
} from "@/lib/match-plans";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";

type ProfileForm = {
  full_name: string;
  username: string;
  university: string;
  department: string;
  city: string;
  bio: string;
  profile_visibility: "friends" | "public" | "private";
  allow_friend_requests: boolean;
  show_books_on_profile: boolean;
  show_city_on_profile: boolean;
  show_university_on_profile: boolean;
  plan_type: string;
  match_distance_preference_enabled: boolean;
  match_distance_radius_km: number;
  avatar_url: string | null;
  cover_url: string | null;
};

type AssetKind = "avatar" | "cover";

const initialForm: ProfileForm = {
  full_name: "",
  username: "",
  university: "",
  department: "",
  city: "",
  bio: "",
  profile_visibility: "friends",
  allow_friend_requests: true,
  show_books_on_profile: true,
  show_city_on_profile: true,
  show_university_on_profile: true,
  plan_type: "free",
  match_distance_preference_enabled: true,
  match_distance_radius_km: 10,
  avatar_url: null,
  cover_url: null,
};

function cleanNullable(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 0 ? clean : null;
}

function cleanUsername(value: string) {
  return value.trim().replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
}

function getSafeVisibility(value: string): "friends" | "public" | "private" {
  if (value === "public" || value === "private") return value;
  return "friends";
}

function getPlanLabel(plan?: string | null) {
  if (plan === "pro") return "Pro";
  if (plan === "premium") return "Premium";
  if (plan === "plus") return "Plus";
  return "Ucretsiz";
}

function isDistancePreferenceColumnError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const message = error.message || "";
  return error.code === "42703" || error.code === "PGRST204" || message.includes("match_distance_");
}

function stripDistancePreferenceColumns<T extends Record<string, unknown>>(payload: T) {
  const cleanPayload = { ...payload };
  delete cleanPayload.match_distance_preference_enabled;
  delete cleanPayload.match_distance_radius_km;
  delete cleanPayload.match_distance_updated_at;
  return cleanPayload;
}

export default function ProfileEditScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [coverAsset, setCoverAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadProfile() {
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || null);

    const baseProfileSelect =
      "full_name, username, university, department, city, bio, avatar_url, cover_url, profile_visibility, allow_friend_requests, show_books_on_profile, show_city_on_profile, show_university_on_profile, plan_type";

    let profileResult = await supabase
      .from("profiles")
      .select(`${baseProfileSelect}, match_distance_preference_enabled, match_distance_radius_km`)
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error && isDistancePreferenceColumnError(profileResult.error)) {
      profileResult = await supabase.from("profiles").select(baseProfileSelect).eq("id", user.id).maybeSingle();
    }

    if (profileResult.error) {
      setErrorMessage(profileResult.error.message);
      return;
    }

    const data = profileResult.data;
    const planType = normalizePlanType(data?.plan_type || "free");
    const matchDistanceRadius = normalizeDistanceRadiusForPlan(data?.match_distance_radius_km, planType);

    setForm({
      full_name: data?.full_name || "",
      username: data?.username || "",
      university: data?.university || "",
      department: data?.department || "",
      city: data?.city || "",
      bio: data?.bio || "",
      profile_visibility: getSafeVisibility(data?.profile_visibility || "friends"),
      allow_friend_requests: data?.allow_friend_requests ?? true,
      show_books_on_profile: data?.show_books_on_profile ?? true,
      show_city_on_profile: data?.show_city_on_profile ?? true,
      show_university_on_profile: data?.show_university_on_profile ?? true,
      plan_type: planType,
      match_distance_preference_enabled: data?.match_distance_preference_enabled ?? true,
      match_distance_radius_km: matchDistanceRadius,
      avatar_url: data?.avatar_url || null,
      cover_url: data?.cover_url || null,
    });
  }

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, []);

  function setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function pickImage(kind: AssetKind, source: "gallery" | "camera") {
    if (picking) return;

    setPicking(`${kind}-${source}`);

    try {
      if (source === "gallery") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert("Izin gerekli", "Galeriden gorsel secmek icin izin vermelisin.");
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.82,
        });

        if (!result.canceled && result.assets[0]) {
          if (kind === "avatar") {
            setAvatarAsset(result.assets[0]);
          } else {
            setCoverAsset(result.assets[0]);
          }
        }

        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Izin gerekli", "Fotograf cekmek icin kamera izni vermelisin.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.82,
      });

      if (!result.canceled && result.assets[0]) {
        if (kind === "avatar") {
          setAvatarAsset(result.assets[0]);
        } else {
          setCoverAsset(result.assets[0]);
        }
      }
    } catch (error) {
      Alert.alert("Gorsel secilemedi", getFriendlyImageError(error instanceof Error ? error.message : undefined));
    } finally {
      setPicking(null);
    }
  }

  async function handleSave() {
    if (!userId) return;

    const normalizedUsername = cleanUsername(form.username);

    if (normalizedUsername && normalizedUsername.length < 3) {
      Alert.alert("Kullanici adi kisa", "Kullanici adi en az 3 karakter olmali.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      let avatarUrl = form.avatar_url;
      let coverUrl = form.cover_url;

      if (avatarAsset) {
        avatarUrl = await uploadImageAsset({
          asset: avatarAsset,
          bucket: "profile-images",
          userId,
          prefix: "avatar",
          maxBytes: 5 * 1024 * 1024,
        });
      }

      if (coverAsset) {
        coverUrl = await uploadImageAsset({
          asset: coverAsset,
          bucket: "profile-images",
          userId,
          prefix: "cover",
          maxBytes: 5 * 1024 * 1024,
        });
      }

      const planType = normalizePlanType(form.plan_type);
      const matchDistanceRadius = normalizeDistanceRadiusForPlan(form.match_distance_radius_km, planType);

      const payload = {
        id: userId,
        email,
        full_name: cleanNullable(form.full_name),
        username: normalizedUsername || null,
        university: cleanNullable(form.university),
        department: cleanNullable(form.department),
        city: cleanNullable(form.city),
        bio: cleanNullable(form.bio),
        avatar_url: avatarUrl,
        cover_url: coverUrl,
        profile_visibility: form.profile_visibility,
        allow_friend_requests: form.allow_friend_requests,
        show_books_on_profile: form.show_books_on_profile,
        show_city_on_profile: form.show_city_on_profile,
        show_university_on_profile: form.show_university_on_profile,
        match_distance_preference_enabled: form.match_distance_preference_enabled,
        match_distance_radius_km: matchDistanceRadius,
        match_distance_updated_at: new Date().toISOString(),
        social_profile_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let saveResult = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

      if (saveResult.error && isDistancePreferenceColumnError(saveResult.error)) {
        saveResult = await supabase.from("profiles").upsert(stripDistancePreferenceColumns(payload), { onConflict: "id" });
      }

      if (saveResult.error) {
        throw saveResult.error;
      }

      Alert.alert("Profil guncellendi", "Profil ve sosyal gorunurluk ayarlarin kaydedildi.", [
        {
          text: "Tamam",
          onPress: () => router.replace("/profile"),
        },
      ]);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Profil guncellenemedi.";
      const message =
        rawMessage.includes("duplicate") || rawMessage.includes("unique")
          ? "Bu kullanici adi baska biri tarafindan kullaniliyor olabilir. Farkli bir kullanici adi dene."
          : getFriendlyImageError(rawMessage, "Profil guncellenemedi.");

      setErrorMessage(message);
      Alert.alert("Profil guncellenemedi", message);
    } finally {
      setSaving(false);
    }
  }

  const avatarPreview = useMemo(() => avatarAsset?.uri || form.avatar_url || null, [avatarAsset, form.avatar_url]);
  const coverPreview = useMemo(() => coverAsset?.uri || form.cover_url || null, [coverAsset, form.cover_url]);
  const planType = normalizePlanType(form.plan_type);
  const distanceConfig = getMatchDistanceConfig(planType);
  const radiusOptions = distanceRadiusOptions.filter((value) => value <= distanceConfig.maxRadiusKm);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Profil bilgileri yukleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Geri</Text>
          </Pressable>

          <Text style={styles.eyebrow}>Profil Duzenle</Text>
          <Text style={styles.title}>Profil ve sosyal gorunurlugunu yonet.</Text>
          <Text style={styles.description}>
            Bu ekran web profil merkeziyle ayni alanlari gunceller: temel bilgiler, avatar, kapak ve gorunurluk ayarlari.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Uyari</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sosyal Profil Medyasi</Text>

          <MediaPickerCard
            title="Profil Fotografı"
            previewUri={avatarPreview}
            placeholderText="Avatar secilmedi"
            galleryLabel={picking === "avatar-gallery" ? "Seciliyor..." : "Galeriden Sec"}
            cameraLabel={picking === "avatar-camera" ? "Aciliyor..." : "Fotograf Cek"}
            onGalleryPress={() => pickImage("avatar", "gallery")}
            onCameraPress={() => pickImage("avatar", "camera")}
            onClear={() => {
              setAvatarAsset(null);
              setField("avatar_url", null);
            }}
            disabled={Boolean(picking) || saving}
          />

          <MediaPickerCard
            title="Kapak Fotografı"
            previewUri={coverPreview}
            placeholderText="Kapak gorseli secilmedi"
            galleryLabel={picking === "cover-gallery" ? "Seciliyor..." : "Galeriden Sec"}
            cameraLabel={picking === "cover-camera" ? "Aciliyor..." : "Fotograf Cek"}
            onGalleryPress={() => pickImage("cover", "gallery")}
            onCameraPress={() => pickImage("cover", "camera")}
            onClear={() => {
              setCoverAsset(null);
              setField("cover_url", null);
            }}
            disabled={Boolean(picking) || saving}
            large
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Temel Bilgiler</Text>

          <Input
            label="Ad Soyad"
            value={form.full_name}
            placeholder="Orn. Muhammet Yasin Kilic"
            onChangeText={(value) => setField("full_name", value)}
          />

          <Input
            label="Kullanici Adi"
            value={form.username}
            placeholder="Orn. yasinkilic"
            autoCapitalize="none"
            onChangeText={(value) => setField("username", value)}
          />

          <Input
            label="Universite"
            value={form.university}
            placeholder="Orn. Aydin Adnan Menderes Universitesi"
            onChangeText={(value) => setField("university", value)}
          />

          <Input
            label="Bolum"
            value={form.department}
            placeholder="Orn. Radyo, Televizyon ve Sinema"
            onChangeText={(value) => setField("department", value)}
          />

          <Input
            label="Sehir"
            value={form.city}
            placeholder="Orn. Aydin"
            onChangeText={(value) => setField("city", value)}
          />

          <Input
            label="Kisa Bio"
            value={form.bio}
            placeholder="Kisaca kendini ve kitap ilgi alanlarini anlat..."
            multiline
            onChangeText={(value) => setField("bio", value)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sosyal Gorunurluk</Text>

          <Text style={styles.inputLabel}>Profil Gorunurlugu</Text>
          <View style={styles.segmentRow}>
            <SegmentButton
              label="Arkadaslar"
              active={form.profile_visibility === "friends"}
              onPress={() => setField("profile_visibility", "friends")}
            />
            <SegmentButton
              label="Herkes"
              active={form.profile_visibility === "public"}
              onPress={() => setField("profile_visibility", "public")}
            />
            <SegmentButton
              label="Gizli"
              active={form.profile_visibility === "private"}
              onPress={() => setField("profile_visibility", "private")}
            />
          </View>

          <ToggleRow
            label="Arkadaslik istegi al"
            description="Kapaliysa yeni kullanicilar sana istek gonderemez."
            value={form.allow_friend_requests}
            onValueChange={(value) => setField("allow_friend_requests", value)}
          />

          <ToggleRow
            label="Kitaplarim profilimde gorunsun"
            description="Genel profil kartinda rafindaki kitaplar listelenebilir."
            value={form.show_books_on_profile}
            onValueChange={(value) => setField("show_books_on_profile", value)}
          />

          <ToggleRow
            label="Universitem gorunsun"
            description="Sosyal profilde universite bilgisini acip kapatabilirsin."
            value={form.show_university_on_profile}
            onValueChange={(value) => setField("show_university_on_profile", value)}
          />

          <ToggleRow
            label="Sehrim gorunsun"
            description="Profil kartinda sehir bilgisini paylasmak istersen acik tut."
            value={form.show_city_on_profile}
            onValueChange={(value) => setField("show_city_on_profile", value)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Eslesme ve Harita</Text>

          <View style={styles.planInfoCard}>
            <Text style={styles.planInfoLabel}>Aktif paket</Text>
            <Text style={styles.planInfoTitle}>{getPlanLabel(planType)}</Text>
            <Text style={styles.planInfoText}>
              {distanceConfig.boostLabel}. Bu paket en fazla {distanceConfig.maxRadiusKm} km yakinlik sinyali kullanir.
            </Text>
          </View>

          <ToggleRow
            label="Harita yakinligi eslesmelere katilsin"
            description="Konum izni ve kitap konumu varsa yakin kitaplar eslesme skorunda one cikar."
            value={form.match_distance_preference_enabled}
            onValueChange={(value) => setField("match_distance_preference_enabled", value)}
          />

          <Text style={[styles.inputLabel, styles.radiusLabel]}>Yakinlik yaricapi</Text>
          <View style={styles.radiusRow}>
            {radiusOptions.map((radius) => {
              const disabled = !distanceConfig.customizable || !form.match_distance_preference_enabled;
              const active = form.match_distance_radius_km === radius;

              return (
                <Pressable
                  key={radius}
                  style={[styles.radiusButton, active && styles.radiusButtonActive, disabled && styles.disabledButton]}
                  onPress={() => setField("match_distance_radius_km", radius)}
                  disabled={disabled}
                >
                  <Text style={[styles.radiusButtonText, active && styles.radiusButtonTextActive]}>{radius} km</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.preferenceHint}>
            {distanceConfig.customizable
              ? "Mesafe kuculdukce daha yakin takaslar, buyudukce daha fazla secenek oncelik kazanir."
              : "Ucretsiz pakette yakinlik yaricapi 10 km olarak sabittir. Plus ve ustu paketlerde ayarlanabilir."}
          </Text>
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Guvenli profil notu</Text>
          <Text style={styles.noticeText}>
            E-posta, paket ve ogrenci dogrulama durumu bu ekrandan degismez. Bu alanlar sistem tarafindan yonetilir.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, saving && styles.disabledButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Degisiklikleri Kaydet</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MediaPickerCard({
  title,
  previewUri,
  placeholderText,
  galleryLabel,
  cameraLabel,
  onGalleryPress,
  onCameraPress,
  onClear,
  disabled,
  large = false,
}: {
  title: string;
  previewUri: string | null;
  placeholderText: string;
  galleryLabel: string;
  cameraLabel: string;
  onGalleryPress: () => void;
  onCameraPress: () => void;
  onClear: () => void;
  disabled: boolean;
  large?: boolean;
}) {
  return (
    <View style={styles.mediaCard}>
      <Text style={styles.inputLabel}>{title}</Text>
      <View style={[styles.mediaPreview, large && styles.mediaPreviewLarge]}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.mediaImage} contentFit="cover" accessibilityLabel={title} />
        ) : (
          <Text style={styles.mediaPlaceholderText}>{placeholderText}</Text>
        )}
      </View>
      <View style={styles.mediaButtonRow}>
        <Pressable style={[styles.mediaButton, disabled && styles.disabledButton]} onPress={onGalleryPress} disabled={disabled}>
          <Text style={styles.mediaButtonText}>{galleryLabel}</Text>
        </Pressable>
        <Pressable style={[styles.mediaButton, disabled && styles.disabledButton]} onPress={onCameraPress} disabled={disabled}>
          <Text style={styles.mediaButtonText}>{cameraLabel}</Text>
        </Pressable>
      </View>
      {previewUri ? (
        <Pressable style={styles.clearButton} onPress={onClear}>
          <Text style={styles.clearButtonText}>Secimi Kaldir</Text>
        </Pressable>
      ) : null}
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

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#CBD5E1", true: "#8FD3B4" }} thumbColor={value ? GREEN : "#F8FAFC"} />
    </View>
  );
}

function Input({
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={[styles.input, multiline && styles.textArea]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 18, paddingBottom: 40 },
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
  description: { marginTop: 10, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 22, fontWeight: "600" },
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
  sectionTitle: { color: TEXT, fontSize: 19, fontWeight: "900" },
  mediaCard: { marginTop: 14 },
  mediaPreview: {
    marginTop: 8,
    minHeight: 120,
    borderRadius: 22,
    backgroundColor: BG,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaPreviewLarge: { minHeight: 180 },
  mediaImage: { width: "100%", height: "100%" },
  mediaPlaceholderText: { color: MUTED, fontSize: 13, fontWeight: "700", textAlign: "center" },
  mediaButtonRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  mediaButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: GREEN,
    paddingVertical: 13,
    alignItems: "center",
  },
  mediaButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  clearButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearButtonText: { color: "#B91C1C", fontSize: 12, fontWeight: "900" },
  inputGroup: { marginTop: 14 },
  inputLabel: { color: MUTED, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  input: {
    marginTop: 7,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: BG,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 14,
    fontWeight: "800",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.08)",
  },
  textArea: { minHeight: 110, paddingTop: 14, lineHeight: 20 },
  segmentRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  segmentButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: BG,
    paddingVertical: 13,
    alignItems: "center",
  },
  segmentButtonActive: { backgroundColor: GREEN },
  segmentButtonText: { color: GREEN, fontSize: 12, fontWeight: "900" },
  segmentButtonTextActive: { color: "#fff" },
  planInfoCard: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.14)",
    padding: 14,
  },
  planInfoLabel: { color: GREEN, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  planInfoTitle: { marginTop: 5, color: TEXT, fontSize: 18, fontWeight: "900" },
  planInfoText: { marginTop: 5, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  radiusLabel: { marginTop: 16 },
  radiusRow: { marginTop: 9, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radiusButton: {
    minWidth: 76,
    borderRadius: 16,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  radiusButtonActive: { backgroundColor: GREEN, borderColor: GREEN },
  radiusButtonText: { color: GREEN, fontSize: 12, fontWeight: "900" },
  radiusButtonTextActive: { color: "#fff" },
  preferenceHint: { marginTop: 9, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  toggleRow: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: BG,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleContent: { flex: 1 },
  toggleTitle: { color: TEXT, fontSize: 14, fontWeight: "900" },
  toggleDescription: { marginTop: 4, color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: "700" },
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
  saveButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: GREEN,
    paddingVertical: 17,
    alignItems: "center",
  },
  disabledButton: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
});
