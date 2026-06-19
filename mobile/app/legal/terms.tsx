import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppCard, AppColors, AppHero } from "@/components/app-ui";
import {
  legalEffectiveDate,
  legalVersions,
  termsSections,
} from "@/lib/legal";

export default function TermsScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppHero
        eyebrow="Koşullar"
        title="Kullanım koşulları"
        description={`Yayın tarihi: ${legalEffectiveDate}. Sürüm: ${legalVersions.terms}.`}
        onBack={() => router.back()}
      />

      {termsSections.map((section) => (
        <AppCard key={section.title} tone="soft">
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.items}>
            {section.items.map((item) => (
              <Text key={item} style={styles.item}>
                {item}
              </Text>
            ))}
          </View>
        </AppCard>
      ))}

      <AppCard tone="amber">
        <Text style={styles.note}>
          Hesap oluşturarak bu koşulları kabul etmiş olursun. Koşulları kabul
          etmiyorsan platformu kullanmamalısın.
        </Text>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 18, paddingBottom: 40 },
  sectionTitle: {
    color: AppColors.green,
    fontSize: 19,
    fontWeight: "900",
  },
  items: { marginTop: 10, gap: 10 },
  item: {
    color: AppColors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  note: {
    color: "#92400E",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
  },
});
