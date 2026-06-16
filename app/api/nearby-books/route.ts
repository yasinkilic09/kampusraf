import { NextResponse } from "next/server";
import {
  DEFAULT_NEARBY_RADIUS_KM,
  isValidCoordinatePair,
  normalizeRadius,
} from "@/lib/location";
import {
  getMatchDistanceConfig,
  normalizeDistanceRadiusForPlan,
  normalizePlanType,
} from "@/lib/match-plans";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isMigrationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;

  return (
    error.code === "42883" ||
    error.code === "42703" ||
    error.message
      ?.toLocaleLowerCase("tr-TR")
      .includes("nearby_exchange_books")
  );
}

function isDistancePreferenceColumnError(
  error: { code?: string; message?: string } | null
) {
  if (!error) return false;

  const message = error.message?.toLocaleLowerCase("tr-TR") || "";

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("match_distance_")
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const requestedRadius = normalizeRadius(
    Number(searchParams.get("radius") || DEFAULT_NEARBY_RADIUS_KM)
  );

  if (!isValidCoordinatePair(lat, lng)) {
    return NextResponse.json(
      { error: "Harita için geçerli bir konum gerekli." },
      { status: 400 }
    );
  }

  const profileResult = await supabase
    .from("profiles")
    .select("plan_type, match_distance_radius_km, match_distance_preference_enabled")
    .eq("id", user.id)
    .maybeSingle();

  let profile = profileResult.data;

  if (isDistancePreferenceColumnError(profileResult.error)) {
    const fallbackResult = await supabase
      .from("profiles")
      .select("plan_type")
      .eq("id", user.id)
      .maybeSingle();

    profile = fallbackResult.data as typeof profile;
  } else if (profileResult.error) {
    return NextResponse.json(
      { books: [], error: profileResult.error.message, needsMigration: false },
      { status: 500 }
    );
  }

  const profilePlanType = normalizePlanType(profile?.plan_type);
  const distanceConfig = getMatchDistanceConfig(profilePlanType);
  const preferredRadius =
    typeof profile?.match_distance_radius_km === "number"
      ? profile.match_distance_radius_km
      : distanceConfig.radiusKm;
  const effectiveRadius = normalizeDistanceRadiusForPlan(
    searchParams.has("radius") ? requestedRadius : preferredRadius,
    profilePlanType
  );

  const { data, error } = await supabase.rpc("nearby_exchange_books", {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: effectiveRadius,
    p_limit: distanceConfig.mapResultLimit,
  });

  if (error) {
    return NextResponse.json(
      {
        books: [],
        error: isMigrationError(error)
          ? "Yakındaki kitaplar altyapısı hazır değil. supabase-location-map.sql dosyasını Supabase SQL Editor içinde çalıştırmalısın."
          : error.message,
        needsMigration: isMigrationError(error),
      },
      { status: isMigrationError(error) ? 409 : 500 }
    );
  }

  return NextResponse.json({
    books: data || [],
    radiusKm: effectiveRadius,
    requestedRadiusKm: requestedRadius,
    wasRadiusCapped: requestedRadius > effectiveRadius,
    plan: {
      type: profilePlanType,
      label: distanceConfig.label,
      maxRadiusKm: distanceConfig.maxRadiusKm,
      defaultRadiusKm: distanceConfig.radiusKm,
      mapResultLimit: distanceConfig.mapResultLimit,
      scoreBoostCap: distanceConfig.scoreBoostCap,
      canCustomize: distanceConfig.canCustomize,
      matchDistancePreferenceEnabled:
        profile?.match_distance_preference_enabled ?? true,
      boostLabel: distanceConfig.boostLabel,
      description: distanceConfig.description,
      upgradeHint: distanceConfig.upgradeHint,
    },
    needsMigration: false,
  });
}
