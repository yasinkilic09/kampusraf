"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function getSafeVisibility(value: string) {
  if (value === "public") return "public";
  if (value === "private") return "private";
  return "friends";
}

function getFileExtension(file: File) {
  const fallback = "jpg";
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension) return fallback;

  if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension;
  }

  return fallback;
}

function isValidImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

async function uploadProfileImage({
  file,
  userId,
  type,
}: {
  file: File;
  userId: string;
  type: "avatar" | "cover";
}) {
  const supabase = await createClient();

  if (!file || file.size <= 0) {
    return null;
  }

  if (!isValidImage(file)) {
    throw new Error("Sadece JPG, PNG veya WEBP görsel yükleyebilirsin.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Profil görseli en fazla 5 MB olabilir.");
  }

  const extension = getFileExtension(file);
  const filePath = `${userId}/${type}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("profile-images").getPublicUrl(filePath);

  return publicUrl;
}

export async function updateSocialProfileAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const avatarFile = formData.get("avatar") as File | null;
  const coverFile = formData.get("cover") as File | null;

  const profileVisibility = getSafeVisibility(
    String(formData.get("profileVisibility") || "friends")
  );

  const allowFriendRequests = formData.get("allowFriendRequests") === "on";
  const showBooksOnProfile = formData.get("showBooksOnProfile") === "on";
  const showCityOnProfile = formData.get("showCityOnProfile") === "on";
  const showUniversityOnProfile =
    formData.get("showUniversityOnProfile") === "on";

  let avatarUrl: string | null = null;
  let coverUrl: string | null = null;

  try {
    if (avatarFile && avatarFile.size > 0) {
      avatarUrl = await uploadProfileImage({
        file: avatarFile,
        userId: user.id,
        type: "avatar",
      });
    }

    if (coverFile && coverFile.size > 0) {
      coverUrl = await uploadProfileImage({
        file: coverFile,
        userId: user.id,
        type: "cover",
      });
    }
  } catch (error) {
    console.error("updateSocialProfileAction upload error:", error);
    return;
  }

  const updatePayload: Record<string, unknown> = {
    profile_visibility: profileVisibility,
    allow_friend_requests: allowFriendRequests,
    show_books_on_profile: showBooksOnProfile,
    show_city_on_profile: showCityOnProfile,
    show_university_on_profile: showUniversityOnProfile,
    social_profile_updated_at: new Date().toISOString(),
  };

  if (avatarUrl) {
    updatePayload.avatar_url = avatarUrl;
  }

  if (coverUrl) {
    updatePayload.cover_url = coverUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    console.error("updateSocialProfileAction profile update error:", error.message);
    return;
  }

   revalidatePath("/profilim");
  revalidatePath("/akis");

  redirect("/profilim?success=social");
}