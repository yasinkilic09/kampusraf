"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNotificationAction } from "@/app/actions/notifications";
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
      post_type: "image",
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

  const postId = String(formData.get("postId") || "").trim();
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
    const { error: unlikeError } = await supabase
      .from("post_likes")
      .delete()
      .eq("id", existingLike.id);

    if (unlikeError) {
      console.error("POST_UNLIKE_DELETE_ERROR", unlikeError.message);
    }
  } else {
    const { data: postForNotification, error: postFetchError } = await supabase
      .from("social_posts")
      .select("id, user_id, post_type")
      .eq("id", postId)
      .maybeSingle();

    if (postFetchError) {
      console.error("SOCIAL_LIKE_POST_FETCH_ERROR", postFetchError.message);
    }

    const { error: likeError } = await supabase.from("post_likes").insert({
      post_id: postId,
      user_id: user.id,
    });

    if (likeError) {
      console.error("POST_LIKE_INSERT_ERROR", likeError.message);
    }

    if (
      !likeError &&
      postForNotification &&
      postForNotification.user_id !== user.id
    ) {
      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .maybeSingle();

      const actorName =
        actorProfile?.full_name ||
        actorProfile?.username ||
        "Bir KampüsRaf kullanıcısı";

      const isQuotePost = postForNotification.post_type === "quote";

      const notificationResult = await createNotificationAction({
        userId: postForNotification.user_id,
        type: "social_like",
        title: isQuotePost
          ? "Alıntı paylaşımın beğenildi"
          : "Gönderin beğenildi",
        message: `${actorName} paylaşımını beğendi.`,
        linkUrl: `/gonderi/${postId}`,
        targetUrl: `/gonderi/${postId}`,
      });

      if (!notificationResult.success) {
        console.error(
          "SOCIAL_LIKE_NOTIFICATION_ERROR",
          notificationResult.error
        );
      }
    }
  }

  revalidatePath("/akis");
  revalidatePath("/bildirimler");
  revalidatePath("/dashboard");

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

  const postId = String(formData.get("postId") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const redirectTo = String(formData.get("redirectTo") || "/akis");

  if (!postId || !content) {
    return;
  }

  const { data: postForNotification, error: postFetchError } = await supabase
    .from("social_posts")
    .select("id, user_id, post_type")
    .eq("id", postId)
    .maybeSingle();

  if (postFetchError) {
    console.error("SOCIAL_COMMENT_POST_FETCH_ERROR", postFetchError.message);
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

  if (postForNotification && postForNotification.user_id !== user.id) {
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();

    const actorName =
      actorProfile?.full_name ||
      actorProfile?.username ||
      "Bir KampüsRaf kullanıcısı";

    const isQuotePost = postForNotification.post_type === "quote";

    const notificationResult = await createNotificationAction({
      userId: postForNotification.user_id,
      type: "social_comment",
      title: isQuotePost
        ? "Alıntı paylaşımına yorum geldi"
        : "Gönderine yorum geldi",
      message: `${actorName} paylaşımına yorum yaptı: "${content.slice(0, 80)}${
        content.length > 80 ? "..." : ""
      }"`,
      linkUrl: `/gonderi/${postId}`,
      targetUrl: `/gonderi/${postId}`,
    });

    if (!notificationResult.success) {
      console.error(
        "SOCIAL_COMMENT_NOTIFICATION_ERROR",
        notificationResult.error
      );
    }
  }

  revalidatePath("/akis");
  revalidatePath("/bildirimler");
  revalidatePath("/dashboard");
  revalidatePath(`/gonderi/${postId}`);

  if (redirectTo.startsWith("/")) {
    revalidatePath(redirectTo);
    redirect(redirectTo);
  }
}

export async function deleteSocialPostAction(formData: FormData) {
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

  const { data: post, error: postError } = await supabase
    .from("social_posts")
    .select("id, user_id, image_url")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post) {
    console.error("deleteSocialPostAction post error:", postError?.message);
    redirect("/akis");
  }

  if (post.user_id !== user.id) {
    console.error("deleteSocialPostAction unauthorized attempt");
    redirect("/akis");
  }

  const imageUrl = String(post.image_url || "");
  const marker = "/post-images/";
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex !== -1) {
    const storagePath = decodeURIComponent(
      imageUrl.slice(markerIndex + marker.length).split("?")[0]
    );

    if (storagePath.startsWith(`${user.id}/`)) {
      await supabase.storage.from("post-images").remove([storagePath]);
    }
  }

  const { error: deleteError } = await supabase
    .from("social_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("deleteSocialPostAction delete error:", deleteError.message);
    redirect(`/gonderi/${postId}`);
  }

  revalidatePath("/akis");
  revalidatePath("/paylas");
  revalidatePath("/profilim");
  revalidatePath(`/gonderi/${postId}`);

  if (
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith(`/gonderi/${postId}`)
  ) {
    redirect(redirectTo);
  }

  redirect("/akis");
}

export async function createQuoteSocialPostAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const quoteId = String(formData.get("quoteId") || "").trim();
  const visibility = getSafePostVisibility(
    String(formData.get("visibility") || "public")
  );
  const redirectTo = String(formData.get("redirectTo") || "/favori-alintilarim");

  if (!quoteId) {
    redirect(`${redirectTo}?error=quote-not-found`);
  }

  const { data: favorite } = await supabase
    .from("quote_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (!favorite) {
    redirect(`${redirectTo}?error=quote-not-favorited`);
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quote_items")
    .select(
      `
      id,
      quote_text,
      quote_text_tr,
      original_language,
      status,
      is_active,
      quote_books (
        title,
        author
      )
    `
    )
    .eq("id", quoteId)
    .maybeSingle();

  if (quoteError || !quote || quote.status !== "approved" || !quote.is_active) {
    redirect(`${redirectTo}?error=quote-not-active`);
  }

  const book = Array.isArray(quote.quote_books)
    ? quote.quote_books[0] || null
    : quote.quote_books;

  const displayQuote = quote.quote_text_tr || quote.quote_text;
  const bookTitle = book?.title || "Kitap bilgisi yok";
  const bookAuthor = book?.author || null;

  const caption = `“${displayQuote}”

${bookAuthor ? `${bookTitle} — ${bookAuthor}` : bookTitle}

#KampüsRaf #RastgeleRaf`;

  const { error } = await supabase.from("social_posts").insert({
    user_id: user.id,
    post_type: "quote",
    quote_id: quoteId,
    image_url: null,
    caption,
    visibility,
    related_book_id: null,
  });

  if (error) {
    console.error("createQuoteSocialPostAction error:", error.message);
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/akis");
  revalidatePath("/favori-alintilarim");
  revalidatePath("/profilim");

  redirect("/akis?success=quote-post-created");
}
