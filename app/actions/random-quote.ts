"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type RollRandomQuoteRow = {
  roll_id: string;
  quote_id: string;
  quote_text: string;
  quote_text_tr: string | null;
  original_language: string;
  book_title: string;
  book_author: string | null;
  mood: string | null;
  topic: string | null;
  estimated_read_seconds: number;
  source_name: string | null;
  source_url: string | null;
  rolls_used: number;
  rolls_limit: number;
};

function getFriendlyRollError(message?: string) {
  if (!message) {
    return "Rastgele alıntı getirilemedi.";
  }

  if (message.includes("DAILY_LIMIT_REACHED")) {
    return "Bugünkü Rastgele Raf hakkını kullandın. Yarın tekrar zar atabilirsin.";
  }

  if (message.includes("NO_QUOTES_AVAILABLE")) {
    return "Şu anda gösterilecek aktif alıntı bulunamadı.";
  }

  if (message.includes("AUTH_REQUIRED")) {
    return "Bu özelliği kullanmak için giriş yapmalısın.";
  }

  return message;
}

export async function rollRandomQuoteAction(): Promise<{
  ok: boolean;
  message: string;
  quote: RollRandomQuoteRow | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase.rpc("roll_random_quote");

  if (error) {
    return {
      ok: false,
      message: getFriendlyRollError(error.message),
      quote: null,
    };
  }

  const quote = Array.isArray(data)
    ? ((data[0] || null) as RollRandomQuoteRow | null)
    : ((data || null) as RollRandomQuoteRow | null);

  if (!quote) {
    return {
      ok: false,
      message: "Rastgele alıntı getirilemedi.",
      quote: null,
    };
  }

  revalidatePath("/rastgele-raf");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: "Rastgele Raf alıntın hazır.",
    quote,
  };
}

export async function addQuoteFavoriteAction(quoteId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (!quoteId) {
    return {
      ok: false,
      message: "Alıntı bulunamadı.",
    };
  }

  const { data: quote } = await supabase
    .from("quote_items")
    .select("id, status, is_active")
    .eq("id", quoteId)
    .maybeSingle();

  if (!quote || quote.status !== "approved" || !quote.is_active) {
    return {
      ok: false,
      message: "Bu alıntı şu anda favorilere eklenemez.",
    };
  }

  const { error } = await supabase.from("quote_favorites").upsert(
    {
      user_id: user.id,
      quote_id: quoteId,
    },
    {
      onConflict: "user_id,quote_id",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    console.error("ADD_QUOTE_FAVORITE_ERROR", error);

    return {
      ok: false,
      message: "Favoriye eklenirken bir sorun oluştu.",
    };
  }

  revalidatePath("/rastgele-raf");
  revalidatePath("/favori-alintilarim");

  return {
    ok: true,
    message: "Alıntı favorilerine eklendi.",
  };
}

export async function removeQuoteFavoriteAction(quoteId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (!quoteId) {
    return {
      ok: false,
      message: "Alıntı bulunamadı.",
    };
  }

  const { error } = await supabase
    .from("quote_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("quote_id", quoteId);

  if (error) {
    console.error("REMOVE_QUOTE_FAVORITE_ERROR", error);

    return {
      ok: false,
      message: "Favoriden kaldırılırken bir sorun oluştu.",
    };
  }

  revalidatePath("/rastgele-raf");
  revalidatePath("/favori-alintilarim");

  return {
    ok: true,
    message: "Alıntı favorilerinden kaldırıldı.",
  };
}