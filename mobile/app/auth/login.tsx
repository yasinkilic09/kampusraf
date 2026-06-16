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

import { supabase } from "@/lib/supabase";

const GREEN = "#2E7D5B";
const AMBER = "#F59E0B";
const BG = "#FAF7F0";
const TEXT = "#1F2933";
const brandSymbol = require("../../assets/images/brand-symbol.png");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert("Eksik bilgi", "E-posta ve şifre alanlarını doldur.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Giriş yapılamadı", error.message);
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
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.88 },
              loading && { opacity: 0.7 },
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
