export type MonetizationPlanType = "free" | "plus" | "premium" | "pro";

export function normalizeMonetizationPlan(planType?: string | null): MonetizationPlanType {
  if (planType === "plus" || planType === "premium" || planType === "pro") {
    return planType;
  }

  return "free";
}

export function shouldShowAdsForPlan(planType?: string | null) {
  return normalizeMonetizationPlan(planType) === "free";
}

export function getAdExperienceLabel(planType?: string | null) {
  return shouldShowAdsForPlan(planType) ? "Dengeli sponsor alanlari" : "Reklamsiz kullanim";
}

