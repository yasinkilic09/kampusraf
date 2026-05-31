"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanUsername(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

export async function updateProfileAction(formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();
  const usernameInput = String(formData.get("username") || "").trim();
  const university = String(formData.get("university") || "").trim();
  const department = String(formData.get("department") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const bio = String(formData.get("bio") || "").trim();

  const username = usernameInput ? cleanUsername(usernameInput) : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName || null,
      username,
      university: university || null,
      department: department || null,
      city: city || null,
      bio: bio || null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    const message =
      error.code === "23505"
        ? "Bu kullanıcı adı başka biri tarafından kullanılıyor."
        : error.message;

    redirect(`/profilim?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/profilim");
  revalidatePath("/dashboard");

  redirect("/profilim?success=1");
}

export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/auth/login");
}