"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeTextInput,
  normalizeUuid,
} from "@/lib/validation";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return { supabase, user };
}

function redirectAdminWords(params: Record<string, string>): never {
  const search = new URLSearchParams(params);
  redirect(`/admin/kelimeler?${search.toString()}`);
}

function readWordForm(formData: FormData) {
  return {
    word: normalizeTextInput(formData.get("word"), { maxLength: 80 }),
    meaning: normalizeTextInput(formData.get("meaning"), {
      maxLength: 700,
      preserveLineBreaks: true,
    }),
    example_sentence:
      normalizeTextInput(formData.get("exampleSentence"), {
        maxLength: 260,
      }) || null,
    category:
      normalizeTextInput(formData.get("category"), {
        maxLength: 80,
      }) || null,
    source_note:
      normalizeTextInput(formData.get("sourceNote"), {
        maxLength: 180,
      }) || null,
  };
}

export async function createDailyWordAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const payload = readWordForm(formData);

  if (payload.word.length < 2 || payload.meaning.length < 3) {
    redirectAdminWords({
      error: "Kelime ve anlam alanları zorunludur.",
    });
  }

  const { error } = await supabase.from("daily_words").insert({
    ...payload,
    created_by: user.id,
    is_active: true,
  });

  if (error) {
    console.error("CREATE_DAILY_WORD_ERROR", error.message);
    redirectAdminWords({
      error:
        "Kelime eklenemedi. Supabase SQL dosyasını çalıştırdığından emin ol.",
    });
  }

  revalidatePath("/admin/kelimeler");
  revalidatePath("/kelime-sozlugu");
  revalidatePath("/dashboard");

  redirectAdminWords({ success: "created" });
}

export async function updateDailyWordAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const wordId = normalizeUuid(formData.get("wordId"));
  const payload = readWordForm(formData);

  if (!wordId) {
    redirectAdminWords({ error: "Kelime kaydı bulunamadı." });
  }

  if (payload.word.length < 2 || payload.meaning.length < 3) {
    redirectAdminWords({
      error: "Kelime ve anlam alanları zorunludur.",
    });
  }

  const { error } = await supabase
    .from("daily_words")
    .update(payload)
    .eq("id", wordId);

  if (error) {
    console.error("UPDATE_DAILY_WORD_ERROR", error.message);
    redirectAdminWords({ error: "Kelime güncellenemedi." });
  }

  revalidatePath("/admin/kelimeler");
  revalidatePath("/kelime-sozlugu");
  revalidatePath("/dashboard");

  redirectAdminWords({ success: "updated" });
}

export async function updateDailyWordStatusAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const wordId = normalizeUuid(formData.get("wordId"));
  const nextActive = formData.get("isActive") === "true";

  if (!wordId) {
    redirectAdminWords({ error: "Kelime kaydı bulunamadı." });
  }

  const { error } = await supabase
    .from("daily_words")
    .update({ is_active: nextActive })
    .eq("id", wordId);

  if (error) {
    console.error("UPDATE_DAILY_WORD_STATUS_ERROR", error.message);
    redirectAdminWords({ error: "Kelime durumu güncellenemedi." });
  }

  revalidatePath("/admin/kelimeler");
  revalidatePath("/kelime-sozlugu");
  revalidatePath("/dashboard");

  redirectAdminWords({ success: nextActive ? "activated" : "hidden" });
}

export async function deleteDailyWordAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const wordId = normalizeUuid(formData.get("wordId"));

  if (!wordId) {
    redirectAdminWords({ error: "Kelime kaydı bulunamadı." });
  }

  const { error } = await supabase.from("daily_words").delete().eq("id", wordId);

  if (error) {
    console.error("DELETE_DAILY_WORD_ERROR", error.message);
    redirectAdminWords({ error: "Kelime silinemedi." });
  }

  revalidatePath("/admin/kelimeler");
  revalidatePath("/kelime-sozlugu");
  revalidatePath("/dashboard");

  redirectAdminWords({ success: "deleted" });
}
