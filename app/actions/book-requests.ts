"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage-limits";
import { requireActiveAccount } from "@/lib/account-status";
import { enforceActionRateLimit } from "@/lib/server-action-security";
import { normalizeTextInput, normalizeUuid } from "@/lib/validation";

export async function createBookRequestAction(formData: FormData) {
  const title = normalizeTextInput(formData.get("title"), { maxLength: 160 });
  const author = normalizeTextInput(formData.get("author"), { maxLength: 120 });
  const category = normalizeTextInput(formData.get("category"), {
    maxLength: 80,
  });
  const city = normalizeTextInput(formData.get("city"), { maxLength: 80 });
  const university = normalizeTextInput(formData.get("university"), {
    maxLength: 120,
  });
  const note = normalizeTextInput(formData.get("note"), {
    maxLength: 500,
    preserveLineBreaks: true,
  });

  if (!title) {
    redirect("/aradigim-kitaplar");
  }

  const { supabase, user } = await requireActiveAccount("/aradigim-kitaplar");

enforceActionRateLimit({
  userId: user.id,
  action: "create-book-request",
  limit: 12,
  windowMs: 60_000,
  redirectTo: "/aradigim-kitaplar",
});

const limitCheck = await checkUsageLimit(supabase, user.id, "requests");

if (!limitCheck.allowed) {
  redirect(
    `/aradigim-kitaplar?error=${encodeURIComponent(
      limitCheck.message || "Aylık arama kaydı limitine ulaştın."
    )}`
  );
}

  const { data: request, error: requestError } = await supabase
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

if (requestError) {
  redirect(
    `/aradigim-kitaplar?error=${encodeURIComponent(
      requestError.message || "Arama kaydı oluşturulamadı."
    )}`
  );
}

if (request?.id) {
  await supabase.rpc("create_matches_for_request", {
    p_request_id: request.id,
  });

}

  revalidatePath("/aradigim-kitaplar");
  revalidatePath("/dashboard");
  revalidatePath("/eslesmeler");

  redirect("/aradigim-kitaplar?success=request-created");
}

export async function closeBookRequestAction(formData: FormData) {
  const requestId = normalizeUuid(formData.get("requestId"));

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
  const requestId = normalizeUuid(formData.get("requestId"));

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
  const requestId = normalizeUuid(formData.get("requestId"));

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
