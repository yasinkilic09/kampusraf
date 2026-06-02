"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getSafePostVisibility(value: string) {
  if (value === "public") return "public";
  return "friends";
}

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension;
  }

  return "jpg";
}

function isValidImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

async function uploadPostImage({
  file,
  userId,
}: {
  file: File;
  userId: string;
}) {
  const supabase = await createClient();

  if (!file || file.size <= 0) {
    throw new Error("Paylaşım için görsel seçmelisin.");
  }

  if (!isValidImage(file)) {
    throw new Error("Sadece JPG, PNG veya WEBP görsel yükleyebilirsin.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Paylaşım görseli en fazla 10 MB olabilir.");
  }

  const extension = getFileExtension(file);
  const filePath = `${userId}/post-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("post-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("post-images").getPublicUrl(filePath);

  return publicUrl;
}

export async function createSocialPostAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const imageFile = formData.get("image") as File | null;
  const caption = String(formData.get("caption") || "").trim();
  const visibility = getSafePostVisibility(
    String(formData.get("visibility") || "friends")
  );
  const relatedBookId = String(formData.get("relatedBookId") || "").trim();

  try {
    if (!imageFile) {
      redirect("/paylas?error=Görsel seçmelisin");
    }

    const imageUrl = await uploadPostImage({
      file: imageFile,
      userId: user.id,
    });

    const { error } = await supabase.from("social_posts").insert({
      user_id: user.id,
      image_url: imageUrl,
      caption: caption || null,
      visibility,
      related_book_id: relatedBookId || null,
    });

    if (error) {
      console.error("createSocialPostAction insert error:", error.message);
      redirect(`/paylas?error=${encodeURIComponent(error.message)}`);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Paylaşım oluşturulamadı.";

    console.error("createSocialPostAction error:", message);
    redirect(`/paylas?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/akis");
  revalidatePath("/paylas");
  revalidatePath("/profilim");

  redirect("/akis?success=post-created");
}

export async function togglePostLikeAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const postId = String(formData.get("postId") || "");
  const redirectTo = String(formData.get("redirectTo") || "/akis");

  if (!postId) {
    return;
  }

  const { data: existingLike } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLike) {
    await supabase.from("post_likes").delete().eq("id", existingLike.id);
  } else {
    await supabase.from("post_likes").insert({
      post_id: postId,
      user_id: user.id,
    });
  }

  revalidatePath("/akis");

  if (redirectTo.startsWith("/")) {
    revalidatePath(redirectTo);
    redirect(redirectTo);
  }
}

export async function createPostCommentAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const postId = String(formData.get("postId") || "");
  const content = String(formData.get("content") || "").trim();
  const redirectTo = String(formData.get("redirectTo") || "/akis");

  if (!postId || !content) {
    return;
  }

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    user_id: user.id,
    content,
  });

  if (error) {
    console.error("createPostCommentAction error:", error.message);
    return;
  }

  revalidatePath("/akis");
  revalidatePath(`/gonderi/${postId}`);

  if (redirectTo.startsWith("/")) {
    revalidatePath(redirectTo);
    redirect(redirectTo);
  }
}