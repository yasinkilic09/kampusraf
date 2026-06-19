import { Link, router } from "expo-router";
import { useState } from "react";
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
import { Image } from "expo-image";
import * as Location from "expo-location";

import { roundCoordinate } from "@/lib/location";
import { createLegalConsentMetadata } from "@/lib/legal";
import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const brandSymbol = require("../../assets/images/brand-symbol.png");

type SignupLocation = {
  lat: number;
  lng: number;
  accuracy: number | null;
};

function cleanUsername(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

export default function SignUpScreen() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [signupLocation, setSignupLocation] = useState<SignupLocation | null>(
    null
  );
  const [acceptedKvkk, setAcceptedKvkk] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  async function requestSignupLocation() {
    setRequestingLocation(true);

    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      setRequestingLocation(false);
      Alert.alert(
        "Konum izni verilmedi",
        "Hesap oluşturmaya devam edebilirsin. Harita özelliğini daha sonra açabilirsin."
      );
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setSignupLocation({
        lat: roundCoordinate(position.coords.latitude),
        lng: roundCoordinate(position.coords.longitude),
        accuracy: Number.isFinite(position.coords.accuracy)
          ? Math.round(position.coords.accuracy || 0)
          : null,
      });
    } catch {
      Alert.alert(
        "Konum alınamadı",
        "Hesap oluşturmaya devam edebilirsin. Konumu daha sonra Harita ekranından açabilirsin."
      );
    } finally {
      setRequestingLocation(false);
    }
  }

  async function handleSignUp() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanUser = cleanUsername(username || cleanName);

    if (!cleanName || !cleanEmail || !password) {
      Alert.alert("Eksik bilgi", "Ad soyad, e-posta ve şifre alanlarını doldur.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Şifre kısa", "Şifre en az 6 karakter olmalı.");
      return;
    }

    if (!acceptedKvkk || !acceptedTerms) {
      Alert.alert(
        "Onay gerekli",
        "Devam etmek için KVKK aydınlatma metnini ve kullanım koşullarını onaylamalısın."
      );
      return;
    }

    setLoading(true);

    const locationMetadata = signupLocation
      ? {
          location_lat: signupLocation.lat,
          location_lng: signupLocation.lng,
          location_accuracy_m: signupLocation.accuracy,
          location_sharing_enabled: true,
          location_updated_at: new Date().toISOString(),
        }
      : {};

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          username: cleanUser || null,
          ...locationMetadata,
          ...createLegalConsentMetadata({
            source: "mobile-sign-up",
            marketingConsent,
          }),
        },
      },
    });

    if (error) {
      setLoading(false);
      Alert.alert("Kayıt oluşturulamadı", error.message);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: cleanEmail,
          full_name: cleanName,
          username: cleanUser || null,
          plan_type: "free",
          plan_status: "active",
          ...locationMetadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    setLoading(false);

    Alert.alert(
      "Kayıt tamamlandı",
      "E-posta doğrulaması açıksa gelen kutunu kontrol et. Ardından giriş yapabilirsin.",
      [{ text: "Girişe Git", onPress: () => router.replace("/auth/login") }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Image source={brandSymbol} style={styles.logo} contentFit="contain" />
        </View>

        <Text style={styles.brand}>
          Kampüs<Text style={{ color: AMBER }}>Raf</Text>
        </Text>
        <Text style={styles.title}>Öğrenci hesabını oluştur.</Text>
        <Text style={styles.description}>
          Kitap takası, sosyal akış, Sesli Raf ve kampüs içi güvenli paylaşım için mobil hesabını başlat.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Ad Soyad</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Adın ve soyadın"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Text style={styles.label}>Kullanıcı adı</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="ornek-kullanici"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ornek@universite.edu.tr"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="En az 6 karakter"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <View style={styles.locationBox}>
            <View style={styles.locationText}>
              <Text style={styles.locationTitle}>Yakındaki kitaplar için konum</Text>
              <Text style={styles.locationDescription}>
                İzin verirsen paylaşıma açık kitapların haritada yaklaşık konumla görünür.
              </Text>
            </View>

            <Pressable
              onPress={requestSignupLocation}
              disabled={requestingLocation}
              style={({ pressed }) => [
                styles.locationButton,
                pressed && { opacity: 0.88 },
                requestingLocation && { opacity: 0.7 },
              ]}
            >
              {requestingLocation ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.locationButtonText}>
                  {signupLocation ? "Konum Alındı" : "Konum İzni Ver"}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.consentBox}>
            <Text style={styles.consentTitle}>Yasal onaylar</Text>
            <Text style={styles.consentDescription}>
              Hesabını oluşturmak için aydınlatma metnini okuduğunu ve kullanım
              koşullarını kabul ettiğini kaydediyoruz.
            </Text>

            <Pressable
              onPress={() => setAcceptedKvkk((current) => !current)}
              style={({ pressed }) => [
                styles.consentRow,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedKvkk && styles.checkboxChecked,
                ]}
              >
                {acceptedKvkk ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.consentText}>
                <Text
                  style={styles.consentLink}
                  onPress={() => router.push("/legal/kvkk" as never)}
                >
                  KVKK aydınlatma metnini
                </Text>{" "}
                okudum ve kabul ediyorum.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setAcceptedTerms((current) => !current)}
              style={({ pressed }) => [
                styles.consentRow,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                ]}
              >
                {acceptedTerms ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.consentText}>
                <Text
                  style={styles.consentLink}
                  onPress={() => router.push("/legal/terms" as never)}
                >
                  Kullanım koşullarını
                </Text>{" "}
                okudum ve kabul ediyorum.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMarketingConsent((current) => !current)}
              style={({ pressed }) => [
                styles.consentRow,
                styles.optionalConsentRow,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  styles.optionalCheckbox,
                  marketingConsent && styles.optionalCheckboxChecked,
                ]}
              >
                {marketingConsent ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.consentText}>
                KampüsRaf duyuruları, paket avantajları ve kitap önerileri
                hakkında e-posta/bildirim almak istiyorum. Bu tercih zorunlu
                değildir.
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleSignUp}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.88 },
              loading && { opacity: 0.7 },
            ]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Kayıt Ol</Text>}
          </Pressable>

          <Link href="/auth/login" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Zaten hesabım var</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22,
  },
  logoBox: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  logo: {
    width: 66,
    height: 66,
  },
  brand: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: "900",
    color: TEXT,
  },
  title: {
    marginTop: 14,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: TEXT,
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: "#64748B",
    fontWeight: "600",
  },
  card: {
    marginTop: 26,
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  label: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#475569",
    textTransform: "uppercase",
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: BG,
    paddingHorizontal: 16,
    fontSize: 15,
    color: TEXT,
    fontWeight: "700",
  },
  locationBox: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "#EAF5EF",
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.12)",
  },
  locationText: { gap: 4 },
  locationTitle: { color: TEXT, fontSize: 14, fontWeight: "900" },
  locationDescription: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  locationButton: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  locationButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  consentBox: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  consentTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },
  consentDescription: {
    marginTop: 5,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  consentRow: {
    marginTop: 11,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  optionalConsentRow: {
    backgroundColor: "#FFFBEB",
    borderColor: "rgba(245,158,11,0.22)",
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(46,125,91,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  optionalCheckbox: {
    borderColor: "rgba(245,158,11,0.45)",
  },
  optionalCheckboxChecked: {
    backgroundColor: AMBER,
    borderColor: AMBER,
  },
  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  consentText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  consentLink: {
    color: GREEN,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  primaryButton: {
    marginTop: 20,
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "900",
  },
});
