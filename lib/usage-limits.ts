import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type UsageLimitType = "books" | "requests" | "messages" | "matches";

type ProfileLimitRow = {
  plan_type: string | null;
  monthly_book_limit: number | null;
  monthly_request_limit: number | null;
  monthly_message_limit: number | null;
  monthly_match_limit: number | null;
};

function getCurrentMonthStart() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  ).toISOString();
}

function getLimitValue(profile: ProfileLimitRow | null, type: UsageLimitType) {
  if (type === "books") return profile?.monthly_book_limit ?? 10;
  if (type === "requests") return profile?.monthly_request_limit ?? 10;
  if (type === "messages") return profile?.monthly_message_limit ?? 30;
  if (type === "matches") return profile?.monthly_match_limit ?? 10;

  return 0;
}

function getLimitLabel(type: UsageLimitType) {
  if (type === "books") return "kitap ekleme";
  if (type === "requests") return "arama kaydı";
  if (type === "messages") return "mesaj gönderme";
  if (type === "matches") return "eşleşme";

  return "kullanım";
}

async function getMonthlyUsageCount(
  supabase: SupabaseServerClient,
  userId: string,
  type: UsageLimitType
) {
  const monthStart = getCurrentMonthStart();

  if (type === "books") {
    const { count } = await supabase
      .from("user_books")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart);

    return count ?? 0;
  }

  if (type === "requests") {
    const { count } = await supabase
      .from("book_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart);

    return count ?? 0;
  }

  if (type === "messages") {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", userId)
      .gte("created_at", monthStart);

    return count ?? 0;
  }

  if (type === "matches") {
    const { count } = await supabase
      .from("book_matches")
      .select("*", { count: "exact", head: true })
      .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
      .gte("created_at", monthStart);

    return count ?? 0;
  }

  return 0;
}

export async function checkUsageLimit(
  supabase: SupabaseServerClient,
  userId: string,
  type: UsageLimitType
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
      plan_type,
      monthly_book_limit,
      monthly_request_limit,
      monthly_message_limit,
      monthly_match_limit
    `
    )
    .eq("id", userId)
    .single();

  const currentUsage = await getMonthlyUsageCount(supabase, userId, type);
  const limit = getLimitValue(profile as ProfileLimitRow | null, type);
  const remaining = Math.max(limit - currentUsage, 0);
  const label = getLimitLabel(type);

  const allowed = currentUsage < limit;

  return {
    allowed,
    type,
    label,
    currentUsage,
    limit,
    remaining,
    message: allowed
      ? null
      : `Aylık ${label} limitine ulaştın. Mevcut limitin: ${limit}/ay.`,
  };
}