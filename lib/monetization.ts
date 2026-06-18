export type MonetizationPlanType = "free" | "plus" | "premium" | "pro";

export type AdPlacement =
  | "dashboard-inline"
  | "feed-inline"
  | "feed-sidebar"
  | "search-results"
  | "random-quote";

export type PlanMonetizationConfig = {
  label: string;
  showsAds: boolean;
  adExperience: string;
  monetizationFeature: string;
};

export const planMonetizationConfig: Record<
  MonetizationPlanType,
  PlanMonetizationConfig
> = {
  free: {
    label: "Ucretsiz",
    showsAds: true,
    adExperience: "Dengeli sponsor alanlari",
    monetizationFeature:
      "Akis ve kesif sayfalarinda rahatsiz etmeyen sponsor alanlari gosterilir.",
  },
  plus: {
    label: "Plus",
    showsAds: false,
    adExperience: "Reklamsiz",
    monetizationFeature: "Web ve mobil uygulamada reklamsiz kullanim.",
  },
  premium: {
    label: "Premium",
    showsAds: false,
    adExperience: "Reklamsiz",
    monetizationFeature:
      "Reklamsiz kullanim ve daha gelismis eslesme/filtre avantajlari.",
  },
  pro: {
    label: "Pro",
    showsAds: false,
    adExperience: "Reklamsiz",
    monetizationFeature:
      "Topluluk olceginde reklamsiz kullanim ve yuksek limitli deneyim.",
  },
};

export function normalizeMonetizationPlan(
  planType?: string | null
): MonetizationPlanType {
  if (planType === "plus" || planType === "premium" || planType === "pro") {
    return planType;
  }

  return "free";
}

export function getPlanMonetizationConfig(planType?: string | null) {
  return planMonetizationConfig[normalizeMonetizationPlan(planType)];
}

export function shouldShowAdsForPlan(planType?: string | null) {
  return getPlanMonetizationConfig(planType).showsAds;
}

export function hasAdFreeAccess(planType?: string | null) {
  return !shouldShowAdsForPlan(planType);
}

