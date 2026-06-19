import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppCard, AppColors, AppHero } from "@/components/app-ui";
import {
  kvkkSections,
  legalEffectiveDate,
  legalVersions,
} from "@/lib/legal";

export default function KvkkScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <AppHero
        eyebrow="KVKK"
        title="Aydınlatma metni"
        description={`Yayın tarihi: ${legalEffectiveDate}. Sürüm: ${legalVersions.kvkk}.`}
        onBack={() => router.back()}
      />

      <AppCard tone="amber">
        <Text style={styles.note}>
          Bu metin uygulama için pratik bir uyum taslağıdır. Nihai yayında
          şirket/unvan, adres, VERBIS durumu ve ticari süreçler hukuk danışmanı
          tarafından kontrol edilmelidir.
        </Text>
      </AppCard>

      {kvkkSections.map((section) => (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 18, paddingBottom: 40 },
  note: {
    color: "#92400E",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
  },
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
});
