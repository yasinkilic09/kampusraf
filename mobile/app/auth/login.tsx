import { Link, router } from "expo-router";
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
import { Image } from "expo-image";
import * as SecureStore from "expo-secure-store";

import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const brandSymbol = require("../../assets/images/brand-symbol.png");
const rememberEmailKey = "kampusraf:remember-email";
const rememberPreferenceKey = "kampusraf:remember-login";

async function getRememberItem(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setRememberItem(key: string, value: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteRememberItem(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrapLogin() {
      const [sessionResult, storedPreference, storedEmail] = await Promise.all([
        supabase.auth.getSession(),
        getRememberItem(rememberPreferenceKey),
        getRememberItem(rememberEmailKey),
      ]);

      if (!active) return;

      if (sessionResult.data.session) {
        router.replace("/(tabs)");
        return;
      }

      if (storedPreference === "false") {
        setRememberMe(false);
      }

      if (storedEmail) {
        setEmail(storedEmail);
      }

      setCheckingSession(false);
    }

    void bootstrapLogin().catch(() => {
      if (active) {
        setCheckingSession(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert("Eksik bilgi", "E-posta ve şifre alanlarını doldur.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert("Giriş yapılamadı", error.message);
      return;
    }

    if (rememberMe) {
      await setRememberItem(rememberPreferenceKey, "true");
      await setRememberItem(rememberEmailKey, cleanEmail);
    } else {
      await setRememberItem(rememberPreferenceKey, "false");
      await deleteRememberItem(rememberEmailKey);
    }

    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    const { data: sessionData } = await supabase.auth.getSession();

    setLoading(false);

    if (!sessionData.session) {
      Alert.alert("Oturum hazirlanamadi", "Lutfen tekrar giris yapmayi dene.");
      return;
    }

    router.replace("/(tabs)");
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
        <Text style={styles.title}>Mobil uygulamaya giriş yap.</Text>
        <Text style={styles.description}>
          Kitap ara, mesajlarını kontrol et, Sesli Raf içeriklerini dinle ve kampüs ağını cebinden yönet.
        </Text>

        <View style={styles.card}>
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
            placeholder="Şifren"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />

          <Pressable
            onPress={() => setRememberMe((current) => !current)}
            style={({ pressed }) => [
              styles.rememberRow,
              pressed && { opacity: 0.9 },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                rememberMe && styles.checkboxChecked,
              ]}
            >
              {rememberMe ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <View style={styles.rememberTextBox}>
              <Text style={styles.rememberTitle}>Beni hatırla</Text>
              <Text style={styles.rememberDescription}>
                Bu cihazda e-postanı hatırlarız ve mevcut oturumunu açık tutarız.
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            disabled={loading || checkingSession}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.88 },
              (loading || checkingSession) && { opacity: 0.7 },
            ]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Giriş Yap</Text>}
          </Pressable>

          <Link href="/auth/sign-up" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Hesabın yoksa kayıt ol</Text>
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
  rememberRow: {
    marginTop: 14,
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: "#EAF5EF",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.12)",
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
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
  checkboxMark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  rememberTextBox: { flex: 1 },
  rememberTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  rememberDescription: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
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
