import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, AppCard, AppColors, AppHero } from "@/components/app-ui";

const values = [
  {
    icon: "book",
    title: "Kitapları dolaşıma çıkarır",
    text: "Takas, ödünç, satış veya bağışa açık kitapların başka öğrencilere ulaşmasını kolaylaştırır.",
  },
  {
    icon: "shield-checkmark",
    title: "Güvenli paylaşımı önemser",
    text: "Öğrenci doğrulama, güven puanı, uygulama içi mesajlaşma ve şikayet akışıyla daha kontrollü bir ortam kurar.",
  },
  {
    icon: "people",
    title: "Okumayı sosyalleştirir",
    text: "Akış, topluluklar, alıntılar, kelime sözlüğü ve sanal kitaplık ile okuma alışkanlığını canlı tutar.",
  },
] as const;

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <AppHero
          eyebrow="Hakkımızda"
          title="KampüsRaf, öğrencilerin sosyal kitap ağıdır."
          description="Amacımız kitap maliyetini azaltmak, raflarda bekleyen kitapları dolaşıma çıkarmak ve kampüs içinde paylaşım kültürünü büyütmek."
          onBack={() => router.back()}
        />

        <AppCard style={styles.statementCard}>
          <Text style={styles.statementTitle}>
            Kitaplar paylaşılır, fikirler büyür.
          </Text>
          <Text style={styles.statementText}>
            Bir öğrencinin bitirdiği kitap, başka bir öğrencinin aradığı kaynak
            olabilir. KampüsRaf bu karşılaşmayı web ve mobilde görünür, güvenli
            ve sürdürülebilir hale getirmek için tasarlandı.
          </Text>
        </AppCard>

        <View style={styles.valueList}>
          {values.map((item) => (
            <AppCard key={item.title} tone="soft" style={styles.valueCard}>
              <View style={styles.iconBox}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={AppColors.green}
                />
              </View>
              <Text style={styles.valueTitle}>{item.title}</Text>
              <Text style={styles.valueText}>{item.text}</Text>
            </AppCard>
          ))}
        </View>

        <AppCard tone="amber" style={styles.roadmapCard}>
          <Text style={styles.roadmapTitle}>KampüsRaf yol haritası</Text>
          <Text style={styles.roadmapText}>
            Harita, eşleştirme, öğrenci doğrulama, sanal kitaplık ve sosyal akış
            aynı deneyimde birleşir. Hedefimiz, öğrencilerin kitap üzerinden
            daha kolay tanıştığı güçlü bir kampüs ağı kurmak.
          </Text>
          <View style={styles.buttonStack}>
            <AppButton
              label="Kitapları keşfet"
              onPress={() => router.push("/explore" as never)}
            />
            <AppButton
              label="Bize ulaş"
              variant="outline"
              onPress={() => router.push("/contact" as never)}
            />
          </View>
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.background },
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 18, paddingBottom: 110 },
  statementCard: { padding: 20 },
  statementTitle: {
    color: AppColors.green,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  statementText: {
    marginTop: 10,
    color: AppColors.muted,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },
  valueList: { marginTop: 2, gap: 0 },
  valueCard: { padding: 18 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: "rgba(46,125,91,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  valueTitle: {
    marginTop: 12,
    color: AppColors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  valueText: {
    marginTop: 7,
    color: AppColors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  roadmapCard: { padding: 18 },
  roadmapTitle: { color: "#92400E", fontSize: 18, fontWeight: "900" },
  roadmapText: {
    marginTop: 8,
    color: "#B45309",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  buttonStack: { marginTop: 14, gap: 10 },
});
