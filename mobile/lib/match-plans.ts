export type PlanType = "free" | "plus" | "premium" | "pro";

export type MatchDistanceConfig = {
  label: string;
  defaultRadiusKm: number;
  maxRadiusKm: number;
  maxMatches: number;
  mapResultLimit: number;
  scoreBoostCap: number;
  customizable: boolean;
  boostLabel: string;
  upgradeHint: string;
};

export const distanceRadiusOptions = [5, 10, 15, 25, 50] as const;

const configs: Record<PlanType, MatchDistanceConfig> = {
  free: {
    label: "Ucretsiz",
    defaultRadiusKm: 10,
    maxRadiusKm: 10,
    maxMatches: 10,
    mapResultLimit: 40,
    scoreBoostCap: 8,
    customizable: false,
    boostLabel: "Temel yakinlik sinyali",
    upgradeHint: "Daha genis harita ve ayarlanabilir yakinlik icin Plus pakete gecebilirsin.",
  },
  plus: {
    label: "Plus",
    defaultRadiusKm: 15,
    maxRadiusKm: 25,
    maxMatches: 25,
    mapResultLimit: 80,
    scoreBoostCap: 14,
    customizable: true,
    boostLabel: "Guclu yakinlik onceligi",
    upgradeHint: "50 km'ye kadar guclu yakinlik onceligi icin Premium pakete gecebilirsin.",
  },
  premium: {
    label: "Premium",
    defaultRadiusKm: 25,
    maxRadiusKm: 50,
    maxMatches: 50,
    mapResultLimit: 120,
    scoreBoostCap: 20,
    customizable: true,
    boostLabel: "Akilli yakinlik onceligi",
    upgradeHint: "Topluluk ve kulup olceginde daha yuksek limitler icin Pro paketi kullanabilirsin.",
  },
  pro: {
    label: "Pro",
    defaultRadiusKm: 35,
    maxRadiusKm: 50,
    maxMatches: 50,
    mapResultLimit: 120,
    scoreBoostCap: 24,
    customizable: true,
    boostLabel: "Topluluk yakinlik onceligi",
    upgradeHint: "En genis harita ve eslesme onceligi bu pakette aktif.",
  },
};

export function normalizePlanType(plan?: string | null): PlanType {
  if (plan === "plus" || plan === "premium" || plan === "pro") return plan;
  return "free";
}

export function getMatchDistanceConfig(plan?: string | null) {
  return configs[normalizePlanType(plan)];
}

export function normalizeDistanceRadiusForPlan(radius: number | null | undefined, plan?: string | null) {
  const config = getMatchDistanceConfig(plan);
  const value = Number(radius || config.defaultRadiusKm);

  if (!Number.isFinite(value)) return config.defaultRadiusKm;
  return Math.max(1, Math.min(Math.round(value), config.maxRadiusKm));
}

export function getDistanceRadiusOptionsForPlan(plan?: string | null) {
  const config = getMatchDistanceConfig(plan);

  return distanceRadiusOptions.filter((radius) => radius <= config.maxRadiusKm);
}
