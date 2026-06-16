import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import { PressableScale } from "@/components/animated-primitives";
import { AppButton, AppCard, AppColors, AppHero } from "@/components/app-ui";
import {
  calculateDistanceKm,
  isValidCoordinatePair,
  normalizeRadius,
  roundCoordinate,
  type Coordinates,
} from "@/lib/location";
import {
  distanceRadiusOptions,
  getDistanceRadiusOptionsForPlan,
  getMatchDistanceConfig,
  normalizeDistanceRadiusForPlan,
  normalizePlanType,
  type PlanType,
} from "@/lib/match-plans";
import { supabase } from "@/lib/supabase";

type SavedLocation = {
  location_lat: number | null;
  location_lng: number | null;
  location_accuracy_m: number | null;
  location_sharing_enabled: boolean | null;
  location_updated_at: string | null;
  plan_type?: string | null;
  match_distance_radius_km?: number | null;
  match_distance_preference_enabled?: boolean | null;
};

type NearbyBook = {
  user_book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  exchange_type: string | null;
  city: string | null;
  university: string | null;
  owner_name: string | null;
  owner_username: string | null;
  owner_university: string | null;
  location_lat: number | null;
  location_lng: number | null;
  distance_km: number;
};

const exchangeLabels: Record<string, string> = {
  takas: "Takas",
  odunc: "Ödünç",
  satis: "Satış",
  bagis: "Bağış",
  lend: "Ödünç",
  sell: "Satış",
  donation: "Bağış",
};

function formatDistance(value: number) {
  if (!Number.isFinite(value)) return "Mesafe yok";
  if (value < 1) return `${Math.max(Math.round(value * 1000), 50)} m`;

  return `${value.toFixed(value < 10 ? 1 : 0)} km`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBookPosition(
  book: NearbyBook,
  center: Coordinates | null,
  radiusKm: number,
  index: number
) {
  if (
    center &&
    typeof book.location_lat === "number" &&
    typeof book.location_lng === "number" &&
    isValidCoordinatePair(book.location_lat, book.location_lng)
  ) {
    const latSign = book.location_lat >= center.lat ? 1 : -1;
    const lngSign = book.location_lng >= center.lng ? 1 : -1;
    const yKm =
      calculateDistanceKm(center, {
        lat: book.location_lat,
        lng: center.lng,
      }) * latSign;
    const xKm =
      calculateDistanceKm(center, {
        lat: center.lat,
        lng: book.location_lng,
      }) * lngSign;
    const scale = 42 / Math.max(radiusKm, 1);

    return {
      x: clamp(50 + xKm * scale, 8, 92),
      y: clamp(50 - yKm * scale, 8, 92),
    };
  }

  const angle = index * 1.9;
  const ring = 18 + (index % 4) * 7;

  return {
    x: clamp(50 + Math.cos(angle) * ring, 8, 92),
    y: clamp(50 + Math.sin(angle) * ring, 8, 92),
  };
}

function isMigrationError(message?: string | null) {
  return Boolean(
    message?.toLocaleLowerCase("tr-TR").includes("location_") ||
      message?.toLocaleLowerCase("tr-TR").includes("nearby_exchange_books")
  );
}

function isDistancePreferenceError(message?: string | null) {
  return Boolean(message?.toLocaleLowerCase("tr-TR").includes("match_distance_"));
}

export default function MobileMapScreen() {
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [books, setBooks] = useState<NearbyBook[]>([]);
  const [planType, setPlanType] = useState<PlanType>("free");
  const [matchDistanceEnabled, setMatchDistanceEnabled] = useState(true);
  const [radiusKm, setRadiusKm] = useState(getMatchDistanceConfig("free").defaultRadiusKm);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locating, setLocating] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sortedBooks = useMemo(
    () =>
      [...books].sort(
        (first, second) => (first.distance_km || 0) - (second.distance_km || 0)
      ),
    [books]
  );
  const distanceConfig = getMatchDistanceConfig(planType);
  const availableRadiusOptions = useMemo(
    () => getDistanceRadiusOptionsForPlan(planType),
    [planType]
  );
  const lockedRadiusOptions = useMemo(
    () => distanceRadiusOptions.filter((option) => option > distanceConfig.maxRadiusKm),
    [distanceConfig.maxRadiusKm]
  );

  const fetchBooks = useCallback(
    async (
      coords: Coordinates,
      nextRadius = radiusKm,
      nextPlanType: PlanType = planType
    ) => {
      setLoadingBooks(true);
      setMessage(null);
      const nextDistanceConfig = getMatchDistanceConfig(nextPlanType);
      const safeRadius = normalizeDistanceRadiusForPlan(
        normalizeRadius(nextRadius),
        nextPlanType
      );

      const { data, error } = await supabase.rpc("nearby_exchange_books", {
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_radius_km: safeRadius,
        p_limit: nextDistanceConfig.mapResultLimit,
      });

      setLoadingBooks(false);

      if (error) {
        setBooks([]);
        setMessage(
          isMigrationError(error.message)
            ? "Yakındaki kitaplar altyapısı için Supabase SQL dosyasını çalıştırmalısın."
            : error.message
        );
        return;
      }

      setRadiusKm(safeRadius);
      setBooks((data || []) as NearbyBook[]);
    },
    [planType, radiusKm]
  );

  const loadLocation = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    let profileResult = await supabase
      .from("profiles")
      .select(
        "location_lat, location_lng, location_accuracy_m, location_sharing_enabled, location_updated_at, plan_type, match_distance_radius_km, match_distance_preference_enabled"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error && isDistancePreferenceError(profileResult.error.message)) {
      profileResult = await supabase
        .from("profiles")
        .select("location_lat, location_lng, location_accuracy_m, location_sharing_enabled, location_updated_at, plan_type")
        .eq("id", user.id)
        .maybeSingle();
    }

    if (profileResult.error) {
      setMessage(
        isMigrationError(profileResult.error.message)
          ? "Konum altyapısı için Supabase SQL dosyasını çalıştırmalısın."
          : profileResult.error.message
      );
      setLoadingLocation(false);
      return;
    }

    const saved = (profileResult.data || null) as SavedLocation | null;
    const nextPlanType = normalizePlanType(saved?.plan_type);
    const nextRadius = normalizeDistanceRadiusForPlan(
      saved?.match_distance_radius_km,
      nextPlanType
    );

    setPlanType(nextPlanType);
    setMatchDistanceEnabled(saved?.match_distance_preference_enabled ?? true);
    setRadiusKm(nextRadius);
    setLocation(saved);

    if (
      saved?.location_sharing_enabled &&
      typeof saved.location_lat === "number" &&
      typeof saved.location_lng === "number"
    ) {
      const coords = { lat: saved.location_lat, lng: saved.location_lng };
      setCurrentCoords(coords);
      await supabase.rpc("refresh_user_book_locations", {
        p_user_id: user.id,
      });
      await fetchBooks(coords, nextRadius, nextPlanType);
    }

    setLoadingLocation(false);
  }, [fetchBooks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLocation();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadLocation]);

  async function requestLocation() {
    setLocating(true);
    setMessage(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setLocating(false);
      router.replace("/auth/login");
      return;
    }

    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      setLocating(false);
      setMessage("Konum izni verilmedi. İzin olmadan yakın kitapları gösteremem.");
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        lat: roundCoordinate(position.coords.latitude),
        lng: roundCoordinate(position.coords.longitude),
      };
      const now = new Date().toISOString();
      const accuracy = Number.isFinite(position.coords.accuracy)
        ? Math.round(position.coords.accuracy || 0)
        : null;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          location_lat: coords.lat,
          location_lng: coords.lng,
          location_accuracy_m: accuracy,
          location_sharing_enabled: true,
          location_updated_at: now,
          updated_at: now,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        throw new Error(
          isMigrationError(profileError.message)
            ? "Konum altyapısı için Supabase SQL dosyasını çalıştırmalısın."
            : profileError.message
        );
      }

      await supabase
        .from("user_books")
        .update({
          location_lat: coords.lat,
          location_lng: coords.lng,
          location_source: "profile",
          location_shared_at: now,
          updated_at: now,
        })
        .eq("user_id", user.id)
        .eq("is_active", true)
        .in("status", ["mevcut", "available"])
        .in("exchange_type", [
          "takas",
          "odunc",
          "satis",
          "bagis",
          "lend",
          "sell",
          "donation",
        ]);

      const savedLocation = {
        location_lat: coords.lat,
        location_lng: coords.lng,
        location_accuracy_m: accuracy,
        location_sharing_enabled: true,
        location_updated_at: now,
      };

      setLocation(savedLocation);
      setCurrentCoords(coords);
      await supabase.rpc("refresh_user_book_locations", {
        p_user_id: user.id,
      });
      await fetchBooks(coords);
      setMessage("Konum kaydedildi. Açık kitapların haritada görünebilir.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Konum kaydedilemedi.");
    } finally {
      setLocating(false);
    }
  }

  async function disableLocation() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        location_lat: null,
        location_lng: null,
        location_accuracy_m: null,
        location_sharing_enabled: false,
        location_updated_at: now,
        updated_at: now,
      })
      .eq("id", user.id);

    if (error) {
      Alert.alert("Konum kapatılamadı", error.message);
      return;
    }

    await supabase
      .from("user_books")
      .update({
        location_lat: null,
        location_lng: null,
        location_source: null,
        location_shared_at: null,
        updated_at: now,
      })
      .eq("user_id", user.id);

    setLocation(null);
    setCurrentCoords(null);
    setBooks([]);
    setMessage("Konum paylaşımı kapatıldı.");
  }

  function changeRadius(nextRadius: number) {
    if (nextRadius > distanceConfig.maxRadiusKm) {
      setMessage(`${distanceConfig.label} paketinde ${nextRadius} km kilitli. ${distanceConfig.upgradeHint}`);
      return;
    }

    const safeRadius = normalizeDistanceRadiusForPlan(
      normalizeRadius(nextRadius),
      planType
    );
    setRadiusKm(safeRadius);

    if (currentCoords) {
      void fetchBooks(currentCoords, safeRadius);
    }
  }

  const locationIsActive = Boolean(
    location?.location_sharing_enabled && currentCoords
  );
  const closestBook = sortedBooks[0] || null;

  if (loadingLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AppColors.green} size="large" />
        <Text style={styles.loadingText}>Harita hazırlanıyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppHero
        eyebrow="Kampüs Haritası"
        title="Yakındaki açık rafları keşfet."
        description="Konumun yaklaşıklaştırılır. Haritada yalnızca takas, ödünç, satış veya bağışa açık kitaplar görünür."
        onBack={() => router.back()}
      >
        <View style={styles.heroActions}>
          <AppButton
            label={locating ? "Konum alınıyor..." : "Konumumu Kullan"}
            onPress={requestLocation}
            loading={locating}
            style={styles.heroButton}
          />
          {locationIsActive ? (
            <AppButton
              label="Konumu Kapat"
              onPress={disableLocation}
              variant="outline"
              style={styles.heroButton}
            />
          ) : null}
        </View>
      </AppHero>

      {message ? (
        <AppCard tone="amber">
          <Text style={styles.messageText}>{message}</Text>
        </AppCard>
      ) : null}

      <View style={styles.radiusRow}>
        {availableRadiusOptions.map((option) => (
          <PressableScale
            key={option}
            style={[
              styles.radiusChip,
              radiusKm === option && styles.activeRadiusChip,
            ]}
            onPress={() => changeRadius(option)}
          >
            <Text
              style={[
                styles.radiusText,
                radiusKm === option && styles.activeRadiusText,
              ]}
            >
              {option} km
            </Text>
          </PressableScale>
        ))}
        {lockedRadiusOptions.map((option) => (
          <PressableScale
            key={option}
            style={[styles.radiusChip, styles.lockedRadiusChip]}
            onPress={() => changeRadius(option)}
          >
            <Text style={styles.lockedRadiusText}>{option} km kilitli</Text>
          </PressableScale>
        ))}
      </View>

      <View style={styles.statsRow}>
        <Stat label="Kitap" value={String(sortedBooks.length)} />
        <Stat label="Yarıçap" value={`${radiusKm} km`} />
        <Stat
          label="En yakın"
          value={closestBook ? formatDistance(closestBook.distance_km) : "-"}
        />
      </View>

      <AppCard tone="soft">
        <Text style={styles.planTitle}>{distanceConfig.label} harita paketi</Text>
        <Text style={styles.planText}>
          {distanceConfig.boostLabel}. Haritada {distanceConfig.maxRadiusKm} km ve{" "}
          {distanceConfig.mapResultLimit} sonuca kadar arama yapar.
          {matchDistanceEnabled
            ? " Yakınlık eşleşme skoruna etki ediyor."
            : " Yakınlık eşleşme skorunda kapalı."}
        </Text>
      </AppCard>

      <AppCard style={styles.mapCard}>
        <View style={styles.mapCanvas}>
          <View style={styles.ringLarge} />
          <View style={styles.ringMedium} />
          <View style={styles.ringSmall} />
          <View style={styles.centerPin}>
            <Ionicons name="person" size={18} color="#FFFFFF" />
            <Text style={styles.centerPinText}>Sen</Text>
          </View>

          {!locationIsActive ? (
            <View style={styles.mapEmpty}>
              <Text style={styles.mapEmptyTitle}>Önce konum izni ver</Text>
              <Text style={styles.mapEmptyText}>
                İzin verdiğinde yakınındaki açık kitaplar burada görünecek.
              </Text>
            </View>
          ) : null}

          {locationIsActive &&
            sortedBooks.map((book, index) => {
              const position = getBookPosition(book, currentCoords, radiusKm, index);

              return (
                <Pressable
                  key={book.user_book_id}
                  style={[
                    styles.bookPin,
                    {
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/books/[userBookId]",
                      params: { userBookId: book.user_book_id },
                    } as never)
                  }
                >
                  <Text style={styles.bookPinText}>{index + 1}</Text>
                </Pressable>
              );
            })}
        </View>
      </AppCard>

      <Text style={styles.sectionTitle}>Yakındaki Kitaplar</Text>

      {loadingBooks ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color={AppColors.green} />
          <Text style={styles.inlineLoadingText}>Kitaplar yükleniyor...</Text>
        </View>
      ) : null}

      {locationIsActive && sortedBooks.length === 0 && !loadingBooks ? (
        <AppCard tone="soft">
          <Text style={styles.emptyTitle}>Bu mesafede kitap yok</Text>
          <Text style={styles.emptyText}>
            Yarıçapı büyütebilir veya kendi kitabını paylaşarak bölgedeki rafı
            canlandırabilirsin.
          </Text>
        </AppCard>
      ) : null}

      {sortedBooks.slice(0, 12).map((book, index) => (
        <PressableScale
          key={book.user_book_id}
          style={styles.bookCard}
          onPress={() =>
            router.push({
              pathname: "/books/[userBookId]",
              params: { userBookId: book.user_book_id },
            } as never)
          }
        >
          <View style={styles.coverBox}>
            {book.cover_url ? (
              <Image
                source={{ uri: book.cover_url }}
                style={styles.coverImage}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.coverFallback}>{index + 1}</Text>
            )}
          </View>

          <View style={styles.bookMain}>
            <View style={styles.bookTopRow}>
              <View style={styles.bookTitleBlock}>
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {book.author}
                </Text>
              </View>
              <Text style={styles.distanceBadge}>
                {formatDistance(book.distance_km)}
              </Text>
            </View>

            <View style={styles.badgeRow}>
              <Text style={styles.exchangeBadge}>
                {exchangeLabels[book.exchange_type || ""] ||
                  book.exchange_type ||
                  "Açık"}
              </Text>
              <Text style={styles.metaBadge} numberOfLines={1}>
                {book.university || book.owner_university || "Üniversite yok"}
              </Text>
            </View>

            <Text style={styles.ownerText} numberOfLines={1}>
              {book.owner_name || book.owner_username || "Kitap sahibi"}
            </Text>
          </View>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 18, paddingBottom: 120 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.background,
  },
  loadingText: {
    marginTop: 10,
    color: AppColors.muted,
    fontWeight: "800",
  },
  heroActions: { gap: 10 },
  heroButton: { marginTop: 0 },
  radiusRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  radiusChip: {
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.12)",
  },
  activeRadiusChip: { backgroundColor: AppColors.green },
  lockedRadiusChip: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  radiusText: { color: AppColors.green, fontSize: 12, fontWeight: "900" },
  activeRadiusText: { color: "#FFFFFF" },
  lockedRadiusText: { color: "#94A3B8", fontSize: 12, fontWeight: "900" },
  statsRow: { marginTop: 14, flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 13,
    alignItems: "center",
  },
  statValue: { color: AppColors.green, fontSize: 18, fontWeight: "900" },
  statLabel: {
    marginTop: 3,
    color: AppColors.muted,
    fontSize: 10,
    fontWeight: "900",
  },
  planTitle: { color: AppColors.text, fontSize: 16, fontWeight: "900" },
  planText: {
    marginTop: 6,
    color: AppColors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  mapCard: { padding: 12 },
  mapCanvas: {
    height: 360,
    borderRadius: 26,
    backgroundColor: "#EAF5EF",
    overflow: "hidden",
  },
  ringLarge: {
    position: "absolute",
    left: "13%",
    top: "13%",
    width: "74%",
    height: "74%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.16)",
  },
  ringMedium: {
    position: "absolute",
    left: "26%",
    top: "26%",
    width: "48%",
    height: "48%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.2)",
  },
  ringSmall: {
    position: "absolute",
    left: "39%",
    top: "39%",
    width: "22%",
    height: "22%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(46,125,91,0.24)",
  },
  centerPin: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 58,
    height: 58,
    marginLeft: -29,
    marginTop: -29,
    borderRadius: 20,
    backgroundColor: AppColors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  centerPinText: { marginTop: 2, color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  mapEmpty: {
    position: "absolute",
    left: 22,
    right: 22,
    top: 118,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: 18,
    alignItems: "center",
  },
  mapEmptyTitle: { color: AppColors.text, fontSize: 20, fontWeight: "900" },
  mapEmptyText: {
    marginTop: 6,
    color: AppColors.muted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  bookPin: {
    position: "absolute",
    width: 38,
    height: 38,
    marginLeft: -19,
    marginTop: -19,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(46,125,91,0.2)",
  },
  bookPinText: { color: AppColors.green, fontSize: 12, fontWeight: "900" },
  sectionTitle: {
    marginTop: 18,
    color: AppColors.text,
    fontSize: 21,
    fontWeight: "900",
  },
  inlineLoading: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineLoadingText: { color: AppColors.muted, fontSize: 12, fontWeight: "800" },
  emptyTitle: { color: AppColors.text, fontSize: 18, fontWeight: "900" },
  emptyText: {
    marginTop: 6,
    color: AppColors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  bookCard: {
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 12,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  coverBox: {
    width: 56,
    height: 78,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: AppColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: { width: "100%", height: "100%" },
  coverFallback: { color: AppColors.green, fontSize: 16, fontWeight: "900" },
  bookMain: { flex: 1, minWidth: 0 },
  bookTopRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bookTitleBlock: { flex: 1, minWidth: 0 },
  bookTitle: { color: AppColors.text, fontSize: 15, fontWeight: "900" },
  bookAuthor: {
    marginTop: 4,
    color: AppColors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  distanceBadge: {
    borderRadius: 999,
    backgroundColor: AppColors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: AppColors.green,
    fontSize: 11,
    fontWeight: "900",
  },
  badgeRow: { marginTop: 10, flexDirection: "row", gap: 6 },
  exchangeBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(46,125,91,0.1)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: AppColors.green,
    fontSize: 10,
    fontWeight: "900",
  },
  metaBadge: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: AppColors.background,
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: AppColors.muted,
    fontSize: 10,
    fontWeight: "900",
  },
  ownerText: {
    marginTop: 8,
    color: AppColors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  messageText: {
    color: "#92400E",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
});
