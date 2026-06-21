import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/components/animated-primitives";
import { AppCard, AppColors, AppHero, LoadingState } from "@/components/app-ui";
import { getPublicApiUrl, readApiJson } from "@/lib/public-api";
import { supabase } from "@/lib/supabase";

type ProfileVerification = {
  email: string | null;
  full_name: string | null;
  university: string | null;
  department: string | null;
  trust_score: number | null;
  verification_status: string | null;
  verification_method: string | null;
  university_email: string | null;
  verification_note: string | null;
  verification_requested_at: string | null;
  verification_verified_at: string | null;
};

type ActiveCode = {
  id: string;
  university_email: string;
  expires_at: string;
  attempts: number | null;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  delivery?: "email" | "debug";
  debugCode?: string;
  universityEmail?: string;
  expiresAt?: string;
  trustScore?: number;
  needsMigration?: boolean;
};

function getStatusLabel(status?: string | null) {
  if (status === "verified") return "Doğrulandı";
  if (status === "pending") return "İnceleme bekliyor";
  if (status === "rejected") return "Reddedildi";
  return "Doğrulanmadı";
}

function getMethodLabel(method?: string | null) {
  if (method === "university_email_otp") return "Üniversite e-postası + kod";
  if (method === "university_email_test_code") return "Test kodu";
  if (method === "manual") return "Manuel inceleme";
  if (method === "document") return "Öğrenci belgesi";
  return "Henüz seçilmedi";
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmemiş";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function StudentVerificationScreen() {
  const [profile, setProfile] = useState<ProfileVerification | null>(null);
  const [activeCode, setActiveCode] = useState<ActiveCode | null>(null);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isVerified = profile?.verification_status === "verified";
  const targetEmail = useMemo(
    () => email.trim().toLocaleLowerCase("tr-TR"),
    [email]
  );

  async function loadState() {
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        "email, full_name, university, department, trust_score, verification_status, verification_method, university_email, verification_note, verification_requested_at, verification_verified_at"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setErrorMessage(profileError.message);
      return;
    }

    const nextProfile = {
      email: profileData?.email || user.email || null,
      full_name: profileData?.full_name || null,
      university: profileData?.university || null,
      department: profileData?.department || null,
      trust_score: profileData?.trust_score ?? null,
      verification_status: profileData?.verification_status || null,
      verification_method: profileData?.verification_method || null,
      university_email: profileData?.university_email || null,
      verification_note: profileData?.verification_note || null,
      verification_requested_at: profileData?.verification_requested_at || null,
      verification_verified_at: profileData?.verification_verified_at || null,
    };

    setProfile(nextProfile);
    setEmail(nextProfile.university_email || "");
    setNote(nextProfile.verification_note || "");

    const { data: codeData, error: codeError } = await supabase
      .from("student_verification_codes")
      .select("id, university_email, expires_at, attempts")
      .eq("user_id", user.id)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      setErrorMessage(
        "Öğrenci doğrulama SQL'i eksik olabilir. supabase-student-verification-contact.sql dosyasını çalıştır."
      );
      setActiveCode(null);
      return;
    }

    setActiveCode(codeData || null);
  }

  useEffect(() => {
    loadState().finally(() => setLoading(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    await loadState();
    setRefreshing(false);
  }

  async function postVerification(path: string, body: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      router.replace("/auth/login");
      throw new Error("Oturum bulunamadı.");
    }

    const response = await fetch(getPublicApiUrl(path), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await readApiJson<ApiResponse>(response);

    if (!response.ok) {
      throw new Error(payload.error || "İşlem tamamlanamadı.");
    }

    return payload;
  }

  async function requestCode() {
    if (!targetEmail) {
      Alert.alert("E-posta gerekli", "Üniversite e-posta adresini yaz.");
      return;
    }

    setSending(true);
    setDebugCode(null);

    try {
      const payload = await postVerification("/api/student-verification/send", {
        universityEmail: targetEmail,
        verificationNote: note,
      });

      if (payload.debugCode) {
        setDebugCode(payload.debugCode);
      }

      Alert.alert(
        payload.delivery === "email" ? "Kod gönderildi" : "Test kodu oluşturuldu",
        payload.delivery === "email"
          ? "Üniversite e-posta kutunu kontrol et."
          : "Geliştirme/test modunda kod ekranda gösteriliyor."
      );

      await loadState();
    } catch (error) {
      Alert.alert(
        "Kod oluşturulamadı",
        error instanceof Error ? error.message : "Lütfen daha sonra tekrar dene."
      );
    } finally {
      setSending(false);
    }
  }

  async function verifyCode() {
    if (!targetEmail || code.replace(/\D/g, "").length !== 6) {
      Alert.alert("Kod gerekli", "Üniversite e-postanı ve 6 haneli kodu gir.");
      return;
    }

    setVerifying(true);

    try {
      await postVerification("/api/student-verification/verify", {
        universityEmail: targetEmail,
        code,
      });
      setCode("");
      setDebugCode(null);
      await loadState();
      Alert.alert("Doğrulandı", "Öğrenci rozetin aktif edildi.");
    } catch (error) {
      Alert.alert(
        "Kod doğrulanamadı",
        error instanceof Error ? error.message : "Lütfen kodu kontrol et."
      );
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return <LoadingState label="Doğrulama durumu yükleniyor..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={AppColors.green}
            />
          }
        >
          <AppHero
            eyebrow="Öğrenci Doğrulama"
            title="Öğrenci rozetini aktif et."
            description="Üniversite e-postana gelen 6 haneli kodla profil güvenini artır ve takas sürecinde daha güçlü görün."
            onBack={() => router.back()}
          />

          {errorMessage ? (
            <AppCard tone="danger" style={styles.statusCard}>
              <Text style={styles.errorTitle}>Uyarı</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </AppCard>
          ) : null}

          <AppCard style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusIcon}>
                <Ionicons
                  name={isVerified ? "checkmark-circle" : "school"}
                  size={24}
                  color={isVerified ? "#fff" : AppColors.green}
                />
              </View>
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>
                  {getStatusLabel(profile?.verification_status)}
                </Text>
                <Text style={styles.statusDescription}>
                  {getMethodLabel(profile?.verification_method)}
                </Text>
              </View>
            </View>

            <View style={styles.metrics}>
              <Metric label="Güven" value={String(profile?.trust_score ?? 0)} />
              <Metric label="Kod" value={activeCode ? "Aktif" : "Yok"} />
              <Metric label="Talep" value={formatDate(profile?.verification_requested_at)} />
            </View>
          </AppCard>

          {isVerified ? (
            <AppCard tone="soft" style={styles.verifiedCard}>
              <Text style={styles.verifiedTitle}>Rozetin aktif</Text>
              <Text style={styles.verifiedText}>
                Öğrenci doğrulaman tamamlandı. Profilinde doğrulanmış öğrenci
                rozeti görünür ve güven puanın takaslarda daha iyi sinyal verir.
              </Text>
            </AppCard>
          ) : (
            <>
              <AppCard style={styles.formCard}>
                <Text style={styles.formTitle}>1. Kod iste</Text>
                <Text style={styles.formDescription}>
                  .edu.tr uzantılı veya sisteme tanımlı üniversite e-postanı
                  kullan. Kod 10 dakika geçerlidir.
                </Text>

                <Text style={styles.label}>Üniversite e-postası</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="ornek@ogrenci.edu.tr"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />

                <Text style={styles.label}>Ek not</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Üniversiten, bölümün veya kısa açıklama..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.noteInput]}
                />

                <PressableScale
                  style={[styles.primaryButton, sending && styles.disabled]}
                  onPress={requestCode}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Doğrulama Kodu Gönder</Text>
                  )}
                </PressableScale>
              </AppCard>

              <AppCard style={styles.formCard}>
                <Text style={styles.formTitle}>2. Kodu doğrula</Text>
                <Text style={styles.formDescription}>
                  {activeCode
                    ? `${activeCode.university_email} için aktif kod var. Son geçerlilik: ${formatDate(activeCode.expires_at)}`
                    : "Aktif kod yok. Önce üniversite e-postana kod gönder."}
                </Text>

                {debugCode ? (
                  <View style={styles.debugBox}>
                    <Text style={styles.debugLabel}>Test doğrulama kodu</Text>
                    <Text style={styles.debugCode}>{debugCode}</Text>
                  </View>
                ) : null}

                <Text style={styles.label}>6 haneli kod</Text>
                <TextInput
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="123456"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, styles.codeInput]}
                />

                <PressableScale
                  style={[
                    styles.verifyButton,
                    (!activeCode || verifying) && styles.disabled,
                  ]}
                  onPress={verifyCode}
                  disabled={!activeCode || verifying}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Kodu Doğrula</Text>
                  )}
                </PressableScale>
              </AppCard>

              <AppCard tone="amber" style={styles.hintCard}>
                <Text style={styles.hintTitle}>Manuel inceleme</Text>
                <Text style={styles.hintText}>
                  Üniversite e-postan yoksa webdeki öğrenci doğrulama ekranından
                  manuel inceleme notu bırakabilirsin. Mobil manuel belge yükleme
                  adımı sonraki sürümde genişletilecek.
                </Text>
              </AppCard>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.background },
  keyboard: { flex: 1 },
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 18, paddingBottom: 110 },
  statusCard: { padding: 18 },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: "rgba(46,125,91,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { flex: 1 },
  statusTitle: { color: AppColors.text, fontSize: 20, fontWeight: "900" },
  statusDescription: {
    marginTop: 4,
    color: AppColors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  metrics: { marginTop: 16, flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    borderRadius: 17,
    backgroundColor: AppColors.background,
    padding: 11,
    alignItems: "center",
  },
  metricValue: { color: AppColors.green, fontSize: 16, fontWeight: "900" },
  metricLabel: { marginTop: 4, color: AppColors.muted, fontSize: 10, fontWeight: "900" },
  errorTitle: { color: "#B91C1C", fontSize: 16, fontWeight: "900" },
  errorText: {
    marginTop: 6,
    color: "#991B1B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  verifiedCard: { padding: 18 },
  verifiedTitle: { color: AppColors.green, fontSize: 21, fontWeight: "900" },
  verifiedText: {
    marginTop: 8,
    color: AppColors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  formCard: { padding: 18 },
  formTitle: { color: AppColors.text, fontSize: 21, fontWeight: "900" },
  formDescription: {
    marginTop: 6,
    color: AppColors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  label: {
    marginTop: 14,
    marginBottom: 8,
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: AppColors.background,
    paddingHorizontal: 15,
    color: AppColors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  noteInput: { minHeight: 98, paddingTop: 14, lineHeight: 20 },
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 10,
    fontWeight: "900",
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: AppColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButton: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: AppColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.6 },
  debugBox: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 14,
  },
  debugLabel: { color: "#92400E", fontSize: 12, fontWeight: "900" },
  debugCode: {
    marginTop: 6,
    color: AppColors.green,
    fontSize: 28,
    letterSpacing: 8,
    fontWeight: "900",
  },
  hintCard: { padding: 16 },
  hintTitle: { color: "#92400E", fontSize: 17, fontWeight: "900" },
  hintText: {
    marginTop: 7,
    color: "#B45309",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
});
