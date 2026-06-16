"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null, maxLength = 240) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getCommunityErrorMessage(error?: { code?: string; message?: string } | null) {
  if (!error) return "İşlem tamamlanamadı.";

  if (error.code === "42883" || error.code === "42P01" || error.message?.includes("communities")) {
    return "Topluluk altyapısı hazır değil. supabase-communities.sql dosyasını Supabase SQL Editor içinde çalıştırmalısın.";
  }

  return error.message || "İşlem tamamlanamadı.";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return { supabase, user };
}

export async function createCommunityAction(formData: FormData) {
  const name = cleanText(formData.get("name"), 80);
  const description = cleanText(formData.get("description"), 360);
  const category = cleanText(formData.get("category"), 40) || "okuma_grubu";
  const university = cleanText(formData.get("university"), 120);
  const city = cleanText(formData.get("city"), 80);
  const visibility = cleanText(formData.get("visibility"), 20) || "public";

  if (name.length < 3) {
    redirect(`/topluluklar?error=${encodeURIComponent("Topluluk adı en az 3 karakter olmalı.")}`);
  }

  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("create_community", {
    p_name: name,
    p_description: description || null,
    p_category: category,
    p_university: university || null,
    p_city: city || null,
    p_visibility: visibility,
  });

  if (error) {
    redirect(`/topluluklar?error=${encodeURIComponent(getCommunityErrorMessage(error))}`);
  }

  revalidatePath("/topluluklar");
  revalidatePath("/akis");
  redirect("/topluluklar?success=created");
}

export async function joinCommunityAction(formData: FormData) {
  const communityId = cleanText(formData.get("communityId"), 80);

  if (!communityId) {
    redirect("/topluluklar?error=Topluluk%20bulunamad%C4%B1.");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("join_community", {
    p_community_id: communityId,
  });

  if (error) {
    redirect(`/topluluklar?error=${encodeURIComponent(getCommunityErrorMessage(error))}`);
  }

  revalidatePath("/topluluklar");
  redirect("/topluluklar?success=joined");
}

export async function leaveCommunityAction(formData: FormData) {
  const communityId = cleanText(formData.get("communityId"), 80);

  if (!communityId) {
    redirect("/topluluklar?error=Topluluk%20bulunamad%C4%B1.");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("leave_community", {
    p_community_id: communityId,
  });

  if (error) {
    redirect(`/topluluklar?error=${encodeURIComponent(getCommunityErrorMessage(error))}`);
  }

  revalidatePath("/topluluklar");
  redirect("/topluluklar?success=left");
}
