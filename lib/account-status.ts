import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountStatus = "active" | "suspended" | "banned";

export async function getCurrentAccountStatus() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .single();

  const accountStatus = (profile?.account_status || "active") as AccountStatus;

  return {
    supabase,
    user,
    accountStatus,
  };
}

export async function redirectIfBanned() {
  const result = await getCurrentAccountStatus();

  if (result.accountStatus === "banned") {
    redirect("/hesap-kisitlandi");
  }

  return result;
}

export async function requireActiveAccount(redirectTo = "/dashboard") {
  const result = await getCurrentAccountStatus();

  if (result.accountStatus === "banned") {
    redirect("/hesap-kisitlandi");
  }

  if (result.accountStatus === "suspended") {
    redirect(
      `${redirectTo}?error=${encodeURIComponent(
        "Hesabın geçici olarak askıya alındığı için bu işlemi yapamazsın."
      )}`
    );
  }

  return result;
}