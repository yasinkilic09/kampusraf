"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBookRequestAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const author = String(formData.get("author") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const university = String(formData.get("university") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!title) {
    redirect("/aradigim-kitaplar");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: request } = await supabase
  .from("book_requests")
  .insert({
    user_id: user.id,
    title,
    author: author || null,
    category: category || null,
    city: city || null,
    university: university || null,
    note: note || null,
    status: "active",
    is_active: true,
  })
  .select("id")
  .single();

if (request?.id) {
  await supabase.rpc("create_matches_for_request", {
    p_request_id: request.id,
  });
}

  revalidatePath("/aradigim-kitaplar");
  revalidatePath("/dashboard");

  redirect("/aradigim-kitaplar");
}

export async function closeBookRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "");

  if (!requestId) {
    redirect("/aradigim-kitaplar");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await supabase
    .from("book_requests")
    .update({
      status: "closed",
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("user_id", user.id);

  revalidatePath("/aradigim-kitaplar");
  revalidatePath("/dashboard");

  redirect("/aradigim-kitaplar");
}

export async function reopenBookRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "");

  if (!requestId) {
    redirect("/aradigim-kitaplar");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await supabase
    .from("book_requests")
    .update({
      status: "active",
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("user_id", user.id);

  revalidatePath("/aradigim-kitaplar");
  revalidatePath("/dashboard");

  redirect("/aradigim-kitaplar");
}

export async function deleteBookRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") || "");

  if (!requestId) {
    redirect("/aradigim-kitaplar");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await supabase
    .from("book_requests")
    .delete()
    .eq("id", requestId)
    .eq("user_id", user.id);

  revalidatePath("/aradigim-kitaplar");
  revalidatePath("/dashboard");

  redirect("/aradigim-kitaplar");
}