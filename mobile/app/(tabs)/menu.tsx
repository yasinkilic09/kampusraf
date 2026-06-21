import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AnimatedAppear, PressableScale } from "@/components/animated-primitives";
import { AppCard, AppColors, AppHero } from "@/components/app-ui";

type IconName = ComponentProps<typeof Ionicons>["name"];

type MenuItem = {
  label: string;
  hint: string;
  route: string;
  icon: IconName;
  tone?: "green" | "amber" | "soft";
};

const primaryItems: MenuItem[] = [
  {
    label: "Rafım",
    hint: "Sanal kitaplığın",
    route: "/my-books",
    icon: "library",
    tone: "green",
  },
  {
    label: "Sanal Kitaplık",
    hint: "Limit dışı kişisel arşiv",
    route: "/my-books?scope=personal",
    icon: "albums",
    tone: "soft",
  },
  {
    label: "Kitap Ara",
    hint: "Kitap, yazar veya ISBN",
    route: "/explore",
    icon: "search",
    tone: "soft",
  },
  {
    label: "Paylaş",
    hint: "Galeri veya kamera ile gönderi",
    route: "/share",
    icon: "add-circle",
    tone: "amber",
  },
  {
    label: "Harita",
    hint: "Yakındaki açık raflar",
    route: "/map",
    icon: "map",
    tone: "green",
  },
];

const socialItems: MenuItem[] = [
  { label: "Akış", hint: "Paylaşımlar ve alıntılar", route: "/feed", icon: "leaf" },
  { label: "Topluluklar", hint: "Okuma grupları", route: "/communities", icon: "people-circle" },
  { label: "Mesajlar", hint: "Sohbetlerini aç", route: "/messages", icon: "chatbubbles" },
  { label: "Arkadaşlar", hint: "Çevreni yönet", route: "/friends", icon: "people" },
  { label: "Bildirimler", hint: "Güncel hareketler", route: "/notifications", icon: "notifications" },
  { label: "Profilim", hint: "Profil ve ayarlar", route: "/profile", icon: "person-circle" },
];

const bookItems: MenuItem[] = [
  { label: "Kitap Ekle", hint: "Yeni kitap paylaş", route: "/books/add", icon: "book" },
  { label: "Aradıklarım", hint: "Talep listeni yönet", route: "/requests", icon: "bookmark" },
  { label: "Eşleşmeler", hint: "Akıllı öneriler", route: "/matches", icon: "git-compare" },
  { label: "Takaslar", hint: "Takas durumları", route: "/exchanges", icon: "swap-horizontal" },
];

const discoveryItems: MenuItem[] = [
  { label: "Rastgele Raf", hint: "Zar at, alıntı keşfet", route: "/random-shelf", icon: "dice" },
  { label: "Kelime Sözlüğü", hint: "Her gün yeni kelime", route: "/daily-word", icon: "text" },
  {
    label: "Favori Alıntılarım",
    hint: "Kaydettiğin alıntılar",
    route: "/random-shelf/favorites",
    icon: "heart",
  },
  { label: "Sesli Raf", hint: "Sesli içerikler", route: "/audio", icon: "headset" },
];

function openRoute(route: string) {
  router.push(route as never);
}

export default function MenuScreen() {
  const [query, setQuery] = useState("");

  function submitSearch() {
    const cleanQuery = query.trim();
    if (cleanQuery) {
      router.push({ pathname: "/explore", params: { q: cleanQuery } } as never);
      return;
    }

    router.push("/explore" as never);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppHero
        eyebrow="Hızlı Menü"
        title="En sık kullandığın yollar tek ekranda."
        description="Önce günlük işler, sonra sosyal alanlar ve kitap-takas işlemleri. Daha az karmaşa, daha hızlı erişim."
      >
        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color={AppColors.green} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Kitap, yazar veya ISBN ara"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            onSubmitEditing={submitSearch}
            style={styles.searchInput}
          />
          <PressableScale style={styles.searchButton} onPress={submitSearch}>
            <Text style={styles.searchButtonText}>Ara</Text>
          </PressableScale>
        </View>
      </AppHero>

      <AnimatedAppear delay={80} style={styles.primaryGrid}>
        {primaryItems.map((item) => (
          <PressableScale
            key={item.route}
            style={[styles.primaryCard, item.tone === "amber" && styles.primaryAmber]}
            onPress={() => openRoute(item.route)}
          >
            <View style={styles.primaryIconBox}>
              <Ionicons
                name={item.icon}
                size={23}
                color={item.tone === "amber" ? AppColors.amber : AppColors.green}
              />
            </View>
            <Text style={styles.primaryTitle}>{item.label}</Text>
            <Text style={styles.primaryHint}>{item.hint}</Text>
          </PressableScale>
        ))}
      </AnimatedAppear>

      <MenuSection
        title="Sosyal"
        description="Akış, topluluk, mesaj ve profil."
        items={socialItems}
      />
      <MenuSection
        title="Kitap ve Takas"
        description="Rafını büyüt, taleplerini ve eşleşmelerini yönet."
        items={bookItems}
        twoColumn
        showTip
      />
      <MenuSection
        title="Keşif"
        description="Alıntı, kelime ve sesli raf içerikleri."
        items={discoveryItems}
        twoColumn
      />
    </ScrollView>
  );
}

function MenuSection({
  title,
  description,
  items,
  twoColumn = false,
  showTip = false,
}: {
  title: string;
  description?: string;
  items: MenuItem[];
  twoColumn?: boolean;
  showTip?: boolean;
}) {
  return (
    <AnimatedAppear delay={twoColumn ? 180 : 130} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      </View>
      <View style={twoColumn ? styles.grid : styles.list}>
        {items.map((item) => (
          <PressableScale
            key={item.route}
            style={twoColumn ? styles.gridCard : styles.rowCard}
            onPress={() => openRoute(item.route)}
          >
            <View style={styles.itemIconBox}>
              <Ionicons name={item.icon} size={20} color={AppColors.green} />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.rowTitle}>{item.label}</Text>
              <Text style={styles.rowHint}>{item.hint}</Text>
            </View>
            {!twoColumn ? <Text style={styles.rowArrow}>{">"}</Text> : null}
          </PressableScale>
        ))}
      </View>

      {showTip ? (
        <AppCard tone="amber" style={styles.tipCard}>
          <Text style={styles.tipTitle}>Kısayol ipucu</Text>
          <Text style={styles.tipText}>
            Aradığın kitap yoksa önce Aradıklarım’a talep bırak, sonra Eşleşmeler ekranından
            uygun rafları takip et.
          </Text>
        </AppCard>
      ) : null}
    </AnimatedAppear>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 18, paddingBottom: 120 },
  searchBox: {
    minHeight: 52,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: AppColors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  searchButton: {
    borderRadius: 15,
    backgroundColor: AppColors.amber,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  searchButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  primaryGrid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primaryCard: {
    flexBasis: "47.8%",
    flexGrow: 1,
    minHeight: 126,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    padding: 13,
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryAmber: { backgroundColor: "#FFFBEB" },
  primaryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(46,125,91,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryTitle: { color: AppColors.text, fontSize: 14, fontWeight: "900" },
  primaryHint: { color: AppColors.muted, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  section: { marginTop: 18 },
  sectionHeader: { gap: 4 },
  sectionTitle: { color: AppColors.text, fontSize: 20, fontWeight: "900" },
  sectionDescription: { color: AppColors.muted, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  list: { marginTop: 12, gap: 10 },
  rowCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  itemIconBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(46,125,91,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { flex: 1 },
  rowTitle: { color: AppColors.text, fontSize: 15, fontWeight: "900" },
  rowHint: { marginTop: 4, color: AppColors.muted, fontSize: 12, fontWeight: "700" },
  rowArrow: { color: AppColors.green, fontSize: 20, fontWeight: "900" },
  grid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCard: {
    flexBasis: "47.8%",
    flexGrow: 1,
    minHeight: 112,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 14,
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tipCard: { marginTop: 14 },
  tipTitle: { color: "#92400E", fontSize: 15, fontWeight: "900" },
  tipText: { marginTop: 6, color: "#B45309", fontSize: 12, lineHeight: 18, fontWeight: "700" },
});
