import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, AppCard, AppColors, AppHero, EmptyState, LoadingState } from "@/components/app-ui";
import { DailyWordSelection, getDailyWordForUser } from "@/lib/daily-word";
import { supabase } from "@/lib/supabase";

export default function DailyWordScreen() {
  const [loading, setLoading] = useState(true);
  const [dailyWord, setDailyWord] = useState<DailyWordSelection | null>(null);

  useEffect(() => {
    loadDailyWord().finally(() => setLoading(false));
  }, []);

  async function loadDailyWord() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const nextWord = await getDailyWordForUser(user.id);
    setDailyWord(nextWord);
  }

  if (loading) {
    return <LoadingState label="Gunun kelimesi hazirlaniyor..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <AppHero
          eyebrow="Gunun Kelimesi"
          title="Okuma aliskanligi kelime hazinesiyle buyur."
          description="Her gun anlamiyla ve ornek cumlesiyle yeni bir kelime kesfet. Kelimen gun boyunca sabit kalir."
          onBack={() => router.back()}
        />

        {dailyWord ? (
          <>
            <AppCard style={styles.wordCard}>
              <View style={styles.badgeRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{dailyWord.category || "Kelime"}</Text>
                </View>
                <Text style={styles.dateText}>{dailyWord.dateLabel}</Text>
              </View>

              <Text style={styles.wordTitle}>{dailyWord.word}</Text>

              <View style={styles.meaningBox}>
                <Text style={styles.blockLabel}>Anlami</Text>
                <Text style={styles.meaningText}>{dailyWord.meaning}</Text>
              </View>

              {dailyWord.example_sentence ? (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleLabel}>Ornek cumle</Text>
                  <Text style={styles.exampleText}>{dailyWord.example_sentence}</Text>
                </View>
              ) : null}

              {dailyWord.source_note ? (
                <Text style={styles.sourceText}>Kaynak notu: {dailyWord.source_note}</Text>
              ) : null}
            </AppCard>

            <AppCard tone="amber" style={styles.habitCard}>
              <Text style={styles.habitTitle}>Kucuk okuma aliskanligi</Text>
              <Text style={styles.habitText}>
                Bugunun kelimesini bir kitap notunda, alintida veya paylasiminda kullanmayi dene.
              </Text>
              <View style={styles.buttonStack}>
                <AppButton label="Paylasim yap" variant="amber" onPress={() => router.push("/share" as never)} />
                <AppButton label="Rastgele alinti kesfet" variant="outline" onPress={() => router.push("/random-shelf" as never)} />
              </View>
            </AppCard>
          </>
        ) : (
          <EmptyState
            title="Kelime havuzu bekleniyor"
            description="Admin panelinden aktif kelimeler eklendiginde burada her gun yeni bir kelime gorunecek."
            actionLabel="Panele don"
            onAction={() => router.push("/" as never)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.background },
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 18, paddingBottom: 110 },
  wordCard: { padding: 20 },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  categoryBadge: { borderRadius: 999, backgroundColor: "rgba(46,125,91,0.1)", paddingHorizontal: 12, paddingVertical: 7 },
  categoryBadgeText: { color: AppColors.green, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  dateText: { flex: 1, color: AppColors.muted, fontSize: 12, fontWeight: "800", textAlign: "right" },
  wordTitle: { marginTop: 18, color: AppColors.text, fontSize: 42, lineHeight: 48, fontWeight: "900" },
  meaningBox: { marginTop: 18, borderRadius: 24, backgroundColor: AppColors.background, padding: 16 },
  blockLabel: { color: AppColors.amber, fontSize: 11, fontWeight: "900", letterSpacing: 1.8, textTransform: "uppercase" },
  meaningText: { marginTop: 10, color: AppColors.text, fontSize: 16, lineHeight: 25, fontWeight: "800" },
  exampleBox: {
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: "rgba(46,125,91,0.09)",
    borderLeftWidth: 4,
    borderLeftColor: AppColors.green,
    padding: 16,
  },
  exampleLabel: { color: AppColors.green, fontSize: 11, fontWeight: "900", letterSpacing: 1.8, textTransform: "uppercase" },
  exampleText: { marginTop: 9, color: AppColors.text, fontSize: 14, lineHeight: 22, fontWeight: "700" },
  sourceText: { marginTop: 14, color: AppColors.muted, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  habitCard: { padding: 18 },
  habitTitle: { color: "#92400E", fontSize: 18, fontWeight: "900" },
  habitText: { marginTop: 8, color: "#B45309", fontSize: 13, lineHeight: 20, fontWeight: "700" },
  buttonStack: { marginTop: 14, gap: 10 },
});
