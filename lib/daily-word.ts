import { createClient } from "@/lib/supabase/server";

export type DailyWord = {
  id: string;
  word: string;
  meaning: string;
  example_sentence: string | null;
  category: string | null;
  source_note: string | null;
  created_at: string | null;
};

export type DailyWordSelection = DailyWord & {
  dateKey: string;
  dateLabel: string;
};

function getTurkeyDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTurkeyDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export async function getDailyWordForUser(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_words")
    .select("id, word, meaning, example_sentence, category, source_note, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    console.warn("DAILY_WORD_FETCH_ERROR", error.message);
    return null;
  }

  const words = (data || []) as DailyWord[];

  if (words.length === 0) {
    return null;
  }

  const dateKey = getTurkeyDateKey();
  const selectedIndex = hashString(`${dateKey}:${userId}`) % words.length;

  return {
    ...words[selectedIndex],
    dateKey,
    dateLabel: getTurkeyDateLabel(),
  } satisfies DailyWordSelection;
}
