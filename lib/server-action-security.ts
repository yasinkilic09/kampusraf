import "server-only";

import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";

type EnforceActionRateLimitInput = {
  userId: string;
  action: string;
  limit: number;
  windowMs: number;
  redirectTo: string;
};

export function enforceActionRateLimit({
  userId,
  action,
  limit,
  windowMs,
  redirectTo,
}: EnforceActionRateLimitInput) {
  const result = checkRateLimit(`action:${action}:${userId}`, {
    limit,
    windowMs,
  });

  if (result.allowed) return;

  const separator = redirectTo.includes("?") ? "&" : "?";
  const message = `Çok hızlı işlem yapıyorsun. Lütfen ${result.retryAfterSeconds} saniye sonra tekrar dene.`;

  redirect(`${redirectTo}${separator}error=${encodeURIComponent(message)}`);
}
