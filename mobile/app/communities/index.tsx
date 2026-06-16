import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressableScale } from "@/components/animated-primitives";
import {
  AppButton,
  AppCard,
  AppColors,
  AppHero,
  EmptyState,
  ErrorCard,
  LoadingState,
} from "@/components/app-ui";
import { supabase } from "@/lib/supabase";

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  university: string | null;
  city: string | null;
  visibility: string;
  member_count: number | null;
  book_count: number | null;
  owner_id: string;
  created_at: string;
};

type Membership = {
  community_id: string;
  role: string;
  status: string;
};

type Profile = {
  university: string | null;
  city: string | null;
};

const categories = [
  { value: "all", label: "Tumu" },
  { value: "okuma_grubu", label: "Okuma" },
  { value: "universite", label: "Universite" },
  { value: "kulup", label: "Kulup" },
  { value: "ders", label: "Ders" },
  { value: "kampus", label: "Kampus" },
  { value: "takas", label: "Takas" },
];

function getCategoryLabel(value?: string | null) {
  return categories.find((item) => item.value === value)?.label || "Topluluk";
}

function isMigrationError(message?: string | null) {
  const lower = message?.toLocaleLowerCase("tr-TR") || "";
  return lower.includes("communities") || lower.includes("community_members") || lower.includes("create_community");
}

function cleanText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export default function CommunitiesScreen() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createCategory, setCreateCategory] = useState("okuma_grubu");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const membershipByCommunity = useMemo(
    () => new Map(memberships.map((membership) => [membership.community_id, membership])),
    [memberships]
  );
  const filteredCommunities = useMemo(
    () =>
      selectedCategory === "all"
        ? communities
        : communities.filter((community) => community.category === selectedCategory),
    [communities, selectedCategory]
  );
  const myCommunityCount = useMemo(
    () => communities.filter((community) => membershipByCommunity.has(community.id)).length,
    [communities, membershipByCommunity]
  );

  const loadCommunities = useCallback(async () => {
    setErrorMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const [{ data: profileData }, { data, error }] = await Promise.all([
      supabase.from("profiles").select("university, city").eq("id", user.id).maybeSingle(),
      supabase
        .from("communities")
        .select("id, slug, name, description, category, university, city, visibility, member_count, book_count, owner_id, created_at")
        .eq("is_active", true)
        .order("member_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

    setProfile((profileData || null) as Profile | null);

    if (error) {
      setCommunities([]);
      setMemberships([]);
      setErrorMessage(
        isMigrationError(error.message)
          ? "Topluluk altyapisi icin supabase-communities.sql dosyasini calistirmalisin."
          : error.message
      );
      return;
    }

    const nextCommunities = (data || []) as Community[];
    setCommunities(nextCommunities);

    const communityIds = nextCommunities.map((community) => community.id);
    if (communityIds.length === 0) {
      setMemberships([]);
      return;
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from("community_members")
      .select("community_id, role, status")
      .eq("user_id", user.id)
      .in("community_id", communityIds);

    if (membershipError) {
      setMemberships([]);
      return;
    }

    setMemberships((membershipData || []) as Membership[]);
  }, []);

  useEffect(() => {
    loadCommunities().finally(() => setLoading(false));
  }, [loadCommunities]);

  async function onRefresh() {
    setRefreshing(true);
    await loadCommunities();
    setRefreshing(false);
  }

  async function joinCommunity(communityId: string) {
    if (busyId) return;

    setBusyId(communityId);
    const { error } = await supabase.rpc("join_community", {
      p_community_id: communityId,
    });
    setBusyId(null);

    if (error) {
      Alert.alert("Topluluga katilinamadi", error.message);
      return;
    }

    setNotice("Topluluga katildin.");
    await loadCommunities();
  }

  async function leaveCommunity(community: Community) {
    const membership = membershipByCommunity.get(community.id);

    if (membership?.role === "owner") {
      Alert.alert("Kurucusun", "Tek kurucu topluluktan ayrilamaz.");
      return;
    }

    if (busyId) return;

    setBusyId(community.id);
    const { error } = await supabase.rpc("leave_community", {
      p_community_id: community.id,
    });
    setBusyId(null);

    if (error) {
      Alert.alert("Topluluktan ayrilinmadi", error.message);
      return;
    }

    setNotice("Topluluktan ayrildin.");
    await loadCommunities();
  }

  async function createCommunity() {
    if (creating) return;

    const safeName = cleanText(name, 80);
    const safeDescription = cleanText(description, 360);

    if (safeName.length < 3) {
      Alert.alert("Topluluk adi kisa", "Topluluk adi en az 3 karakter olmali.");
      return;
    }

    setCreating(true);
    const { error } = await supabase.rpc("create_community", {
      p_name: safeName,
      p_description: safeDescription || null,
      p_category: createCategory,
      p_university: profile?.university || null,
      p_city: profile?.city || null,
      p_visibility: "public",
    });
    setCreating(false);

    if (error) {
      Alert.alert(
        "Topluluk olusturulamadi",
        isMigrationError(error.message)
          ? "supabase-communities.sql dosyasini Supabase SQL Editor icinde calistirmalisin."
          : error.message
      );
      return;
    }

    setName("");
    setDescription("");
    setCreateCategory("okuma_grubu");
    setNotice("Topluluk olusturuldu.");
    await loadCommunities();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <LoadingState label="Topluluklar yukleniyor..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.green} />}
      >
        <AppHero
          eyebrow="Topluluklar"
          title="Okuma gruplari ve kampus raflari."
          description="Universitene, derslerine veya ilgi alanlarina gore topluluklara katil; ortak kitap cevrende kal."
          onBack={() => router.back()}
        >
          <View style={styles.heroStats}>
            <HeroStat value={communities.length} label="Topluluk" />
            <HeroStat value={myCommunityCount} label="Benim" />
            <HeroStat
              value={communities.reduce((total, community) => total + (community.member_count || 0), 0)}
              label="Uye"
            />
          </View>
        </AppHero>

        {notice ? (
          <AppCard tone="soft">
            <Text style={styles.noticeText}>{notice}</Text>
          </AppCard>
        ) : null}

        {errorMessage ? (
          <ErrorCard title="Topluluklar yuklenemedi" message={errorMessage} />
        ) : null}

        {!errorMessage ? (
          <>
            <AppCard>
              <Text style={styles.sectionTitle}>Yeni Topluluk</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Orn. ADU Edebiyat Rafi"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Amac, ilgi alani veya okuma duzeni..."
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.categoryRow}>
                {categories.filter((item) => item.value !== "all").map((category) => (
                  <PressableScale
                    key={category.value}
                    style={[
                      styles.categoryChip,
                      createCategory === category.value && styles.categoryChipActive,
                    ]}
                    onPress={() => setCreateCategory(category.value)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        createCategory === category.value && styles.categoryChipTextActive,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </PressableScale>
                ))}
              </View>
              <AppButton
                label={creating ? "Olusturuluyor..." : "Toplulugu Olustur"}
                onPress={createCommunity}
                loading={creating}
              />
            </AppCard>

            <View style={styles.filterRow}>
              {categories.map((category) => (
                <PressableScale
                  key={category.value}
                  style={[
                    styles.filterChip,
                    selectedCategory === category.value && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === category.value && styles.filterChipTextActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </PressableScale>
              ))}
            </View>

            {filteredCommunities.length === 0 ? (
              <EmptyState
                title="Topluluk yok"
                description="Bu kategoride henuz topluluk olusmamis. Ilk toplulugu sen baslatabilirsin."
              />
            ) : null}

            <View style={styles.list}>
              {filteredCommunities.map((community) => {
                const membership = membershipByCommunity.get(community.id);
                const isMember = Boolean(membership);
                const isBusy = busyId === community.id;

                return (
                  <AppCard key={community.id} style={styles.communityCard}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.symbol}>
                        <Text style={styles.symbolText}>{community.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</Text>
                      </View>
                      <View style={styles.cardMain}>
                        <View style={styles.badgeRow}>
                          <Text style={styles.categoryBadge}>{getCategoryLabel(community.category)}</Text>
                          <Text style={styles.visibilityBadge}>{community.visibility === "private" ? "Onayli" : "Acik"}</Text>
                        </View>
                        <Text style={styles.cardTitle} numberOfLines={2}>{community.name}</Text>
                        <Text style={styles.cardDescription} numberOfLines={3}>
                          {community.description || "Bu topluluk icin henuz aciklama eklenmemis."}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.metaPill}>{community.member_count || 0} uye</Text>
                      {community.university ? <Text style={styles.metaPill} numberOfLines={1}>{community.university}</Text> : null}
                      {community.city ? <Text style={styles.metaPill}>{community.city}</Text> : null}
                    </View>

                    <Pressable
                      style={[styles.joinButton, isMember && styles.leaveButton]}
                      onPress={() => (isMember ? leaveCommunity(community) : joinCommunity(community.id))}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <ActivityIndicator color={isMember ? AppColors.green : "#FFFFFF"} />
                      ) : (
                        <Text style={[styles.joinButtonText, isMember && styles.leaveButtonText]}>
                          {isMember ? (membership?.role === "owner" ? "Kurucusun" : "Ayril") : "Katil"}
                        </Text>
                      )}
                    </Pressable>
                  </AppCard>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.heroStatBox}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.background },
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 18, paddingBottom: 120 },
  heroStats: { flexDirection: "row", gap: 8 },
  heroStatBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 12,
    alignItems: "center",
  },
  heroStatValue: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  heroStatLabel: { marginTop: 3, color: "rgba(255,255,255,0.68)", fontSize: 10, fontWeight: "900" },
  noticeText: { color: AppColors.green, fontSize: 13, fontWeight: "900" },
  sectionTitle: { color: AppColors.text, fontSize: 19, fontWeight: "900" },
  input: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: AppColors.background,
    paddingHorizontal: 14,
    color: AppColors.text,
    fontSize: 14,
    fontWeight: "800",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.08)",
  },
  textArea: { minHeight: 98, paddingTop: 14, lineHeight: 20 },
  categoryRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    borderRadius: 999,
    backgroundColor: AppColors.background,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.1)",
  },
  categoryChipActive: { backgroundColor: AppColors.green, borderColor: AppColors.green },
  categoryChipText: { color: AppColors.green, fontSize: 11, fontWeight: "900" },
  categoryChipTextActive: { color: "#FFFFFF" },
  filterRow: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.1)",
  },
  filterChipActive: { backgroundColor: AppColors.green, borderColor: AppColors.green },
  filterChipText: { color: AppColors.green, fontSize: 12, fontWeight: "900" },
  filterChipTextActive: { color: "#FFFFFF" },
  list: { marginTop: 12 },
  communityCard: { padding: 16 },
  cardTopRow: { flexDirection: "row", gap: 12 },
  symbol: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: "rgba(46,125,91,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  symbolText: { color: AppColors.green, fontSize: 23, fontWeight: "900" },
  cardMain: { flex: 1, minWidth: 0 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  categoryBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#B45309",
    fontSize: 10,
    fontWeight: "900",
  },
  visibilityBadge: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: AppColors.green,
    fontSize: 10,
    fontWeight: "900",
  },
  cardTitle: { marginTop: 9, color: AppColors.text, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  cardDescription: { marginTop: 6, color: AppColors.muted, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  metaRow: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: {
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: AppColors.background,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: AppColors.muted,
    fontSize: 11,
    fontWeight: "900",
  },
  joinButton: {
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: AppColors.green,
    paddingVertical: 13,
    alignItems: "center",
  },
  leaveButton: {
    backgroundColor: "rgba(46,125,91,0.08)",
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.12)",
  },
  joinButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  leaveButtonText: { color: AppColors.green },
});
