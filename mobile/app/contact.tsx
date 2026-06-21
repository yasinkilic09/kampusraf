import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/components/animated-primitives";
import { AppCard, AppColors, AppHero } from "@/components/app-ui";
import { getPublicApiUrl, readApiJson } from "@/lib/public-api";

type ContactResponse = {
  ok?: boolean;
  error?: string;
  needsMigration?: boolean;
};

export default function ContactScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitMessage() {
    const cleanPayload = {
      name: name.trim(),
      email: email.trim().toLocaleLowerCase("tr-TR"),
      subject: subject.trim(),
      message: message.trim(),
      source: "mobile",
    };

    if (
      !cleanPayload.name ||
      !cleanPayload.email ||
      !cleanPayload.subject ||
      !cleanPayload.message
    ) {
      Alert.alert("Eksik bilgi", "Ad, e-posta, konu ve mesaj alanlarını doldur.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(getPublicApiUrl("/api/contact"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(cleanPayload),
      });
      const payload = await readApiJson<ContactResponse>(response);

      if (!response.ok) {
        throw new Error(payload.error || "Mesaj gönderilemedi.");
      }

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      Alert.alert("Mesaj alındı", "En kısa sürede dönüş yapacağız.");
    } catch (error) {
      Alert.alert(
        "Mesaj gönderilemedi",
        error instanceof Error ? error.message : "Lütfen daha sonra tekrar dene."
      );
    } finally {
      setLoading(false);
    }
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
        >
          <AppHero
            eyebrow="Bize Ulaşın"
            title="Sorun, öneri veya iş birliği için yaz."
            description="Öğrenci doğrulama, kitap paylaşımı, güvenlik, paketler ve iş birlikleri hakkında ekibe mesaj gönderebilirsin."
            onBack={() => router.back()}
          />

          <AppCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail" size={20} color={AppColors.green} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>destek@kampusraf.com</Text>
                <Text style={styles.infoDescription}>
                  KVKK ve hukuki başvurular için de bu adres kullanılabilir.
                </Text>
              </View>
            </View>
          </AppCard>

          <AppCard style={styles.formCard}>
            <Text style={styles.formTitle}>Mesaj Gönder</Text>

            <Field
              label="Ad Soyad"
              value={name}
              onChangeText={setName}
              placeholder="Adın ve soyadın"
              autoComplete="name"
            />
            <Field
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Konu"
              value={subject}
              onChangeText={setSubject}
              placeholder="Öğrenci doğrulama, takas, iş birliği..."
            />

            <Text style={styles.label}>Mesaj</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Nasıl yardımcı olabiliriz?"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              maxLength={2000}
              style={[styles.input, styles.textarea]}
            />

            <PressableScale
              style={[styles.button, loading && styles.disabled]}
              onPress={submitMessage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Mesajı Gönder</Text>
              )}
            </PressableScale>
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = "sentences",
  keyboardType = "default",
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  autoComplete?: "name" | "email";
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        style={styles.input}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.background },
  keyboard: { flex: 1 },
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 18, paddingBottom: 110 },
  infoCard: { padding: 18 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: "rgba(46,125,91,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1 },
  infoTitle: { color: AppColors.text, fontSize: 16, fontWeight: "900" },
  infoDescription: {
    marginTop: 4,
    color: AppColors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  formCard: { padding: 18 },
  formTitle: { color: AppColors.text, fontSize: 21, fontWeight: "900" },
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
  textarea: {
    minHeight: 140,
    paddingTop: 14,
    paddingBottom: 14,
    lineHeight: 21,
  },
  button: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: AppColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
});
