export type PlanType = "free" | "plus" | "premium" | "pro";

export type MatchDistancePlanConfig = {
  label: string;
  radiusKm: number;
  maxRadiusKm: number;
  mapResultLimit: number;
  scoreBoostCap: number;
  boostLabel: string;
  canCustomize: boolean;
  description: string;
  upgradeHint: string;
};

export const matchDistancePlanConfig: Record<PlanType, MatchDistancePlanConfig> =
  {
    free: {
      label: "Ücretsiz",
      radiusKm: 10,
      maxRadiusKm: 10,
      mapResultLimit: 40,
      scoreBoostCap: 8,
      boostLabel: "Temel yakınlık sinyali",
      canCustomize: false,
      description:
        "Konum açıksa 10 km içindeki kitaplar eşleşme puanında hafif avantaj alır.",
      upgradeHint:
        "Daha geniş harita ve ayarlanabilir yakınlık için Plus pakete geçebilirsin.",
    },
    plus: {
      label: "Plus",
      radiusKm: 15,
      maxRadiusKm: 25,
      mapResultLimit: 80,
      scoreBoostCap: 14,
      boostLabel: "Ayarlanabilir yakınlık",
      canCustomize: true,
      description:
        "Yakınlık tercihini 25 km’ye kadar ayarlayabilir ve yakın raflara daha fazla ağırlık verebilirsin.",
      upgradeHint:
        "50 km’ye kadar güçlü yakınlık önceliği için Premium pakete geçebilirsin.",
    },
    premium: {
      label: "Premium",
      radiusKm: 25,
      maxRadiusKm: 50,
      mapResultLimit: 120,
      scoreBoostCap: 20,
      boostLabel: "Güçlü yakınlık önceliği",
      canCustomize: true,
      description:
        "50 km’ye kadar geniş arama alanı ve daha güçlü mesafe puanı kullanılır.",
      upgradeHint:
        "Topluluk ve kulüp ölçeğinde daha yüksek limitler için Pro paketi kullanabilirsin.",
    },
    pro: {
      label: "Pro",
      radiusKm: 35,
      maxRadiusKm: 50,
      mapResultLimit: 120,
      scoreBoostCap: 24,
      boostLabel: "Topluluk yakınlık önceliği",
      canCustomize: true,
      description:
        "Topluluk ve kampüs ağı kullanımları için 50 km’ye kadar yakınlık tercihi yönetilir.",
      upgradeHint:
        "En geniş harita ve eşleşme önceliği bu pakette aktif.",
    },
  };

export const distanceRadiusOptions = [5, 10, 15, 25, 50] as const;

export function normalizePlanType(value?: string | null): PlanType {
  if (value === "plus") return "plus";
  if (value === "premium") return "premium";
  if (value === "pro") return "pro";

  return "free";
}

export function getMatchDistanceConfig(planType?: string | null) {
  return matchDistancePlanConfig[normalizePlanType(planType)];
}

export function canCustomizeDistanceMatching(planType?: string | null) {
  return getMatchDistanceConfig(planType).canCustomize;
}

export function normalizeDistanceRadiusForPlan(
  value: number,
  planType?: string | null
) {
  const config = getMatchDistanceConfig(planType);

  if (!Number.isFinite(value)) return config.radiusKm;

  return Math.min(Math.max(Math.round(value), 1), config.maxRadiusKm);
}

export function getDistanceRadiusOptionsForPlan(planType?: string | null) {
  const config = getMatchDistanceConfig(planType);

  return distanceRadiusOptions.filter((radius) => radius <= config.maxRadiusKm);
}

export function getLockedDistanceRadiusOptions(planType?: string | null) {
  const config = getMatchDistanceConfig(planType);

  return distanceRadiusOptions.filter((radius) => radius > config.maxRadiusKm);
}

export function getPlanDistanceSummary(planType?: string | null) {
  const config = getMatchDistanceConfig(planType);

  return {
    label: config.label,
    defaultRadius: `${config.radiusKm} km`,
    maxRadius: `${config.maxRadiusKm} km`,
    mapResultLimit: config.mapResultLimit,
    scoreBoostCap: config.scoreBoostCap,
    canCustomize: config.canCustomize,
    boostLabel: config.boostLabel,
    description: config.description,
    upgradeHint: config.upgradeHint,
  };
}
