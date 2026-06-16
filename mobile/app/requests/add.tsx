import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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

import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const MUTED = "#64748B";
const CARD = "#FFFFFF";

function cleanNullable(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 0 ? clean : null;
}

function getCurrentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}

export default function AddRequestScreen() {
  const params = useLocalSearchParams<{ title?: string | string[] }>();
  const initialTitle = Array.isArray(params.title) ? params.title[0] || "" : params.title || "";

  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [university, setUniversity] = useState("");
  const [note, setNote] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setErrorMessage(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("account_status, city, university")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMessage(error.message);
      }

      if (data?.account_status === "banned" || data?.account_status === "suspended") {
        setErrorMessage("Hesabın kısıtlı olduğu için arama kaydı oluşturamazsın.");
      }

      if (data?.city) setCity(data.city);
      if (data?.university) setUniversity(data.university);
    }

    loadProfile().finally(() => setLoadingProfile(false));
  }, []);

  async function checkRequestLimit() {
    if (!userId) return { allowed: false, limit: 0 };

    const monthStart = getCurrentMonthStart();

    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from("profiles").select("monthly_request_limit").eq("id", userId).maybeSingle(),
      supabase
        .from("book_requests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStart),
    ]);

    const limit = profile?.monthly_request_limit ?? 10;
    const currentUsage = count ?? 0;

    return { allowed: currentUsage < limit, limit };
  }

  async function saveRequest() {
    if (saving || errorMessage || !userId) return;

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      Alert.alert("Eksik bilgi", "Aradığın kitabın adını yazmalısın.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const limitCheck = await checkRequestLimit();

      if (!limitCheck.allowed) {
        throw new Error(`Aylık arama kaydı limitine ulaştın. Mevcut limitin: ${limitCheck.limit}/ay.`);
      }

      const { data, error } = await supabase
        .from("book_requests")
        .insert({
          user_id: userId,
          title: cleanTitle,
          author: cleanNullable(author),
          category: cleanNullable(category),
          city: cleanNullable(city),
          university: cleanNullable(university),
          note: cleanNullable(note),
          status: "active",
          is_active: true,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Arama kaydı oluşturulamadı.");
      }

      const { error: matchError } = await supabase.rpc("create_matches_for_request", {
        p_request_id: data.id,
      });

      setSaving(false);

      if (matchError) {
        Alert.alert(
          "Arama kaydı oluşturuldu",
          "Kayıt oluşturuldu, ancak eşleşmeler daha sonra yenilenebilir."
        );
      }

      router.replace("/requests" as never);
    } catch (error) {
      setSaving(false);
      const text = error instanceof Error ? error.message : "Arama kaydı oluşturulurken sorun oluştu.";
      setMessage(text);
      Alert.alert("Kayıt oluşturulamadı", text);
    }
  }

  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
        <Text style={styles.loadingText}>Arama kaydı hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Geri</Text>
          </Pressable>

          <Text style={styles.eyebrow}>Arama Kaydı</Text>
          <Text style={styles.title}>Bulamadığın kitabı takip listene ekle.</Text>
          <Text style={styles.description}>
            Kitap rafa eklendiğinde veya benzer kayıtlar oluştuğunda eşleşme merkezinde görünür.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Uyarı</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Kitap Bilgisi</Text>
          <Text style={styles.sectionTitle}>Ne arıyorsun?</Text>

          <Input label="Kitap Adı" value={title} onChangeText={setTitle} placeholder="Örn. Suç ve Ceza" />
          <Input label="Yazar" value={author} onChangeText={setAuthor} placeholder="İsteğe bağlı" />
          <Input label="Kategori" value={category} onChangeText={setCategory} placeholder="Roman, ders kitabı..." />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionEyebrow}>Konum ve Not</Text>
          <Text style={styles.sectionTitle}>Nerede arıyorsun?</Text>

          <Input label="Şehir" value={city} onChangeText={setCity} placeholder="Aydın" />
          <Input label="Üniversite" value={university} onChangeText={setUniversity} placeholder="Üniversite adı" />
          <Input
            label="Not"
            value={note}
            onChangeText={setNote}
            placeholder="Baskı, bölüm, teslim tercihi veya aciliyet notu"
            multiline
          />
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Eşleşme nasıl oluşur?</Text>
          <Text style={styles.noticeText}>
            Bir öğrenci aradığın kitaba benzer bir kitabı rafa eklediğinde sistem kitap, yazar, kategori ve konum sinyallerini kullanarak eşleşme üretir.
          </Text>
        </View>

        {message ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.saveButton, (saving || Boolean(errorMessage)) && styles.disabledButton]}
          onPress={saveRequest}
          disabled={saving || Boolean(errorMessage)}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Arama Kaydını Oluştur</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
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
        style={[styles.input, multiline && styles.textArea]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
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
  title: { marginTop: 12, color: "#fff", fontSize: 29, lineHeight: 35, fontWeight: "900" },
  description: { marginTop: 10, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 22, fontWeight: "600" },
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
  sectionEyebrow: { color: AMBER, fontSize: 11, fontWeight: "900", letterSpacing: 1.5, textTransform: "uppercase" },
  sectionTitle: { marginTop: 7, color: TEXT, fontSize: 20, fontWeight: "900" },
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
  messageCard: { marginTop: 16, borderRadius: 22, backgroundColor: "#FFFBEB", padding: 14, borderWidth: 1, borderColor: "#FDE68A" },
  messageText: { color: "#92400E", fontSize: 12, lineHeight: 18, fontWeight: "800" },
  saveButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: GREEN,
    paddingVertical: 17,
    alignItems: "center",
  },
  disabledButton: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
});
