"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveAccount } from "@/lib/account-status";

const AUDIO_BUCKET = "audio-raf";

const allowedAudioTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "video/webm",
]);

function getSafeSourceType(value: string) {
  if (value === "own_work") return "own_work";
  if (value === "permission_granted") return "permission_granted";
  if (value === "short_review") return "short_review";
  return "public_domain";
}

function getSafeStatus(value: string) {
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  if (value === "hidden") return "hidden";
  return "pending";
}

function getAudioFileExtension(file: File) {
  const fileExtension = file.name.split(".").pop()?.toLowerCase();

  if (fileExtension && ["mp3", "m4a", "wav", "webm", "mp4"].includes(fileExtension)) {
    return fileExtension;
  }

  if (file.type === "audio/wav" || file.type === "audio/x-wav") return "wav";
  if (file.type === "audio/webm" || file.type === "video/webm") return "webm";
  if (file.type === "audio/mp4" || file.type === "audio/x-m4a") return "m4a";

  return "mp3";
}

function isValidAudioFile(file: File) {
  return allowedAudioTypes.has(file.type);
}

function getPlanAudioChapterLimit(planType?: string | null) {
  if (planType === "pro") return 100;
  if (planType === "premium") return 30;
  if (planType === "plus") return 10;
  return 2;
}

function getThisMonthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

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

function redirectWithUploadError(message: string): never {
  redirect(`/sesli-raf/yukle?error=${encodeURIComponent(message)}`);
}

export async function createAudioBookAction(formData: FormData) {
  const { supabase, user } = await requireActiveAccount("/sesli-raf/yukle");

  const title = String(formData.get("title") || "").trim();
  const author = String(formData.get("author") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const language = String(formData.get("language") || "tr").trim() || "tr";
  const sourceType = getSafeSourceType(String(formData.get("sourceType") || ""));
  const copyrightNote = String(formData.get("copyrightNote") || "").trim();
  const copyrightConfirmed = formData.get("copyrightConfirmed") === "on";

  if (title.length < 2) {
    redirectWithUploadError("Sesli içerik başlığı en az 2 karakter olmalı.");
  }

  if (!copyrightConfirmed) {
    redirectWithUploadError("Devam etmek için telif ve yayın hakkı onayını işaretlemelisin.");
  }

  const { data, error } = await supabase
    .from("audio_books")
    .insert({
      user_id: user.id,
      title,
      author: author || null,
      description: description || null,
      category: category || null,
      language,
      source_type: sourceType,
      copyright_note: copyrightNote || null,
      status: "pending",
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("CREATE_AUDIO_BOOK_ERROR", error?.message);
    redirectWithUploadError(error?.message || "Sesli içerik oluşturulamadı.");
  }

  revalidatePath("/sesli-raf");
  revalidatePath("/sesli-raf/yukle");
  revalidatePath("/admin/sesli-raf");

  redirect(`/sesli-raf/yukle?success=audio-book-created&audioBookId=${data.id}`);
}

export async function addAudioChapterAction(formData: FormData) {
  const { supabase, user } = await requireActiveAccount("/sesli-raf/yukle");

  const audioBookId = String(formData.get("audioBookId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const chapterNumber = Number(formData.get("chapterNumber") || 1);
  const audioFile = formData.get("audioFile") as File | null;

  if (!audioBookId) {
    redirectWithUploadError("Bölüm eklenecek sesli içerik bulunamadı.");
  }

  if (title.length < 2) {
    redirectWithUploadError("Bölüm başlığı en az 2 karakter olmalı.");
  }

  if (!audioFile || audioFile.size <= 0) {
    redirectWithUploadError("Bölüm için ses dosyası seçmelisin.");
  }

  if (!isValidAudioFile(audioFile)) {
    redirectWithUploadError("Sadece MP3, M4A, WAV veya WEBM ses dosyası yükleyebilirsin.");
  }

  if (audioFile.size > 100 * 1024 * 1024) {
    redirectWithUploadError("Ses dosyası en fazla 100 MB olabilir.");
  }

  const { data: audioBook } = await supabase
    .from("audio_books")
    .select("id, user_id")
    .eq("id", audioBookId)
    .maybeSingle();

  if (!audioBook || audioBook.user_id !== user.id) {
    redirectWithUploadError("Bu sesli içeriğe bölüm ekleme yetkin yok.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("id", user.id)
    .maybeSingle();

  const monthlyLimit = getPlanAudioChapterLimit(profile?.plan_type);
  const { count: monthlyChapterCount } = await supabase
    .from("audio_chapters")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", getThisMonthStartIso());

  if ((monthlyChapterCount || 0) >= monthlyLimit) {
    redirectWithUploadError(
      `Bu ayki Sesli Raf bölüm yükleme hakkını kullandın. Paket limitin: ${monthlyLimit}.`
    );
  }

  const extension = getAudioFileExtension(audioFile);
  const storagePath = `${user.id}/${audioBookId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(storagePath, audioFile, {
      contentType: audioFile.type || "audio/mpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("AUDIO_UPLOAD_ERROR", uploadError.message);
    redirectWithUploadError(uploadError.message || "Ses dosyası yüklenemedi.");
  }

  const { error: insertError } = await supabase.from("audio_chapters").insert({
    audio_book_id: audioBookId,
    user_id: user.id,
    title,
    chapter_number: Number.isFinite(chapterNumber) && chapterNumber > 0 ? chapterNumber : 1,
    storage_path: storagePath,
    file_name: audioFile.name || null,
    mime_type: audioFile.type || null,
    file_size_bytes: audioFile.size,
    status: "pending",
  });

  if (insertError) {
    await supabase.storage.from(AUDIO_BUCKET).remove([storagePath]);
    console.error("AUDIO_CHAPTER_INSERT_ERROR", insertError.message);
    redirectWithUploadError(insertError.message || "Ses bölümü kaydedilemedi.");
  }

  revalidatePath("/sesli-raf");
  revalidatePath("/sesli-raf/yukle");
  revalidatePath(`/sesli-raf/${audioBookId}`);
  revalidatePath("/admin/sesli-raf");

  redirect(`/sesli-raf/yukle?success=chapter-uploaded&audioBookId=${audioBookId}`);
}


export async function createAudioBookWithFirstChapterAction(formData: FormData) {
  const { supabase, user } = await requireActiveAccount("/sesli-raf/yukle");

  const title = String(formData.get("title") || "").trim();
  const author = String(formData.get("author") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const language = String(formData.get("language") || "tr").trim() || "tr";
  const sourceType = getSafeSourceType(String(formData.get("sourceType") || ""));
  const copyrightNote = String(formData.get("copyrightNote") || "").trim();
  const copyrightConfirmed = formData.get("copyrightConfirmed") === "on";

  const chapterTitle = String(formData.get("chapterTitle") || "").trim();
  const chapterNumber = Number(formData.get("chapterNumber") || 1);
  const audioFile = formData.get("audioFile") as File | null;

  if (title.length < 2) {
    redirectWithUploadError("Sesli içerik başlığı en az 2 karakter olmalı.");
  }

  if (!copyrightConfirmed) {
    redirectWithUploadError("Devam etmek için telif ve yayın hakkı onayını işaretlemelisin.");
  }

  if (chapterTitle.length < 2) {
    redirectWithUploadError("Bölüm başlığı en az 2 karakter olmalı.");
  }

  if (!audioFile || audioFile.size <= 0) {
    redirectWithUploadError("Onaya göndermek için bir ses dosyası seçmelisin.");
  }

  if (!isValidAudioFile(audioFile)) {
    redirectWithUploadError("Sadece MP3, M4A, WAV veya WEBM ses dosyası yükleyebilirsin.");
  }

  if (audioFile.size > 100 * 1024 * 1024) {
    redirectWithUploadError("Ses dosyası en fazla 100 MB olabilir.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type")
    .eq("id", user.id)
    .maybeSingle();

  const monthlyLimit = getPlanAudioChapterLimit(profile?.plan_type);
  const { count: monthlyChapterCount } = await supabase
    .from("audio_chapters")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", getThisMonthStartIso());

  if ((monthlyChapterCount || 0) >= monthlyLimit) {
    redirectWithUploadError(
      `Bu ayki Sesli Raf bölüm yükleme hakkını kullandın. Paket limitin: ${monthlyLimit}.`
    );
  }

  const { data: audioBook, error: bookError } = await supabase
    .from("audio_books")
    .insert({
      user_id: user.id,
      title,
      author: author || null,
      description: description || null,
      category: category || null,
      language,
      source_type: sourceType,
      copyright_note: copyrightNote || null,
      status: "pending",
      is_active: true,
    })
    .select("id")
    .single();

  if (bookError || !audioBook) {
    console.error("CREATE_AUDIO_BOOK_WITH_CHAPTER_BOOK_ERROR", bookError?.message);
    redirectWithUploadError(bookError?.message || "Sesli içerik oluşturulamadı.");
  }

  const audioBookId = audioBook.id as string;
  const extension = getAudioFileExtension(audioFile);
  const storagePath = `${user.id}/${audioBookId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(storagePath, audioFile, {
      contentType: audioFile.type || "audio/mpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    await supabase.from("audio_books").delete().eq("id", audioBookId).eq("user_id", user.id);
    console.error("AUDIO_SUBMISSION_UPLOAD_ERROR", uploadError.message);
    redirectWithUploadError(uploadError.message || "Ses dosyası yüklenemedi.");
  }

  const { error: chapterError } = await supabase.from("audio_chapters").insert({
    audio_book_id: audioBookId,
    user_id: user.id,
    title: chapterTitle,
    chapter_number: Number.isFinite(chapterNumber) && chapterNumber > 0 ? chapterNumber : 1,
    storage_path: storagePath,
    file_name: audioFile.name || null,
    mime_type: audioFile.type || null,
    file_size_bytes: audioFile.size,
    status: "pending",
  });

  if (chapterError) {
    await supabase.storage.from(AUDIO_BUCKET).remove([storagePath]);
    await supabase.from("audio_books").delete().eq("id", audioBookId).eq("user_id", user.id);
    console.error("AUDIO_SUBMISSION_CHAPTER_ERROR", chapterError.message);
    redirectWithUploadError(chapterError.message || "Ses bölümü kaydedilemedi.");
  }

  revalidatePath("/sesli-raf");
  revalidatePath("/sesli-raf/yukle");
  revalidatePath(`/sesli-raf/${audioBookId}`);
  revalidatePath("/admin/sesli-raf");

  redirect(`/sesli-raf/yukle?success=audio-submission-created&audioBookId=${audioBookId}`);
}

export async function updateAudioSubmissionStatusAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const audioBookId = String(formData.get("audioBookId") || "").trim();
  const status = getSafeStatus(String(formData.get("status") || "pending"));
  const rejectionReason = String(formData.get("rejectionReason") || "").trim();

  if (!audioBookId) {
    redirect("/admin/sesli-raf?error=audio-book-not-found");
  }

  const finalRejectionReason =
    status === "rejected" ? rejectionReason || "Admin tarafından reddedildi." : null;

  const { error: bookError } = await supabase
    .from("audio_books")
    .update({
      status,
      rejection_reason: finalRejectionReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", audioBookId);

  if (bookError) {
    redirect(`/admin/sesli-raf?error=${encodeURIComponent(bookError.message)}`);
  }

  const { error: chapterError } = await supabase
    .from("audio_chapters")
    .update({
      status,
      rejection_reason: finalRejectionReason,
      updated_at: new Date().toISOString(),
    })
    .eq("audio_book_id", audioBookId);

  if (chapterError) {
    redirect(`/admin/sesli-raf?error=${encodeURIComponent(chapterError.message)}`);
  }

  revalidatePath("/sesli-raf");
  revalidatePath(`/sesli-raf/${audioBookId}`);
  revalidatePath("/admin/sesli-raf");

  redirect("/admin/sesli-raf?success=audio-submission-updated");
}

export async function toggleAudioFavoriteAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const audioBookId = String(formData.get("audioBookId") || "").trim();
  const redirectTo = String(formData.get("redirectTo") || `/sesli-raf/${audioBookId}`);

  if (!audioBookId) {
    return;
  }

  const { data: existingFavorite } = await supabase
    .from("audio_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("audio_book_id", audioBookId)
    .maybeSingle();

  if (existingFavorite) {
    await supabase
      .from("audio_favorites")
      .delete()
      .eq("id", existingFavorite.id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("audio_favorites").insert({
      user_id: user.id,
      audio_book_id: audioBookId,
    });
  }

  revalidatePath("/sesli-raf");
  revalidatePath(`/sesli-raf/${audioBookId}`);

  if (redirectTo.startsWith("/")) {
    redirect(redirectTo);
  }
}

export async function reportAudioContentAction(formData: FormData) {
  const { supabase, user } = await requireActiveAccount("/sesli-raf");

  const audioBookId = String(formData.get("audioBookId") || "").trim() || null;
  const audioChapterId = String(formData.get("audioChapterId") || "").trim() || null;
  const reason = String(formData.get("reason") || "copyright").trim() || "copyright";
  const note = String(formData.get("note") || "").trim();
  const redirectTo = String(formData.get("redirectTo") || "/sesli-raf");

  if (!audioBookId && !audioChapterId) {
    return;
  }

  const { error } = await supabase.from("audio_reports").insert({
    reporter_id: user.id,
    audio_book_id: audioBookId,
    audio_chapter_id: audioChapterId,
    reason,
    note: note || null,
    status: "pending",
  });

  if (error) {
    console.error("AUDIO_REPORT_ERROR", error.message);
  }

  revalidatePath("/admin/sesli-raf");

  if (redirectTo.startsWith("/")) {
    redirect(`${redirectTo}?success=audio-report-created`);
  }
}

export async function updateAudioBookStatusAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const audioBookId = String(formData.get("audioBookId") || "").trim();
  const status = getSafeStatus(String(formData.get("status") || "pending"));
  const rejectionReason = String(formData.get("rejectionReason") || "").trim();

  if (!audioBookId) {
    redirect("/admin/sesli-raf?error=audio-book-not-found");
  }

  const { error } = await supabase
    .from("audio_books")
    .update({
      status,
      rejection_reason: status === "rejected" ? rejectionReason || "Admin tarafından reddedildi." : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", audioBookId);

  if (error) {
    redirect(`/admin/sesli-raf?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/sesli-raf");
  revalidatePath(`/sesli-raf/${audioBookId}`);
  revalidatePath("/admin/sesli-raf");

  redirect("/admin/sesli-raf?success=audio-book-updated");
}

export async function updateAudioChapterStatusAction(formData: FormData) {
  const { supabase } = await requireAdmin();

  const audioChapterId = String(formData.get("audioChapterId") || "").trim();
  const audioBookId = String(formData.get("audioBookId") || "").trim();
  const status = getSafeStatus(String(formData.get("status") || "pending"));
  const rejectionReason = String(formData.get("rejectionReason") || "").trim();

  if (!audioChapterId) {
    redirect("/admin/sesli-raf?error=audio-chapter-not-found");
  }

  const { error } = await supabase
    .from("audio_chapters")
    .update({
      status,
      rejection_reason: status === "rejected" ? rejectionReason || "Admin tarafından reddedildi." : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", audioChapterId);

  if (error) {
    redirect(`/admin/sesli-raf?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/sesli-raf");
  if (audioBookId) revalidatePath(`/sesli-raf/${audioBookId}`);
  revalidatePath("/admin/sesli-raf");

  redirect("/admin/sesli-raf?success=audio-chapter-updated");
}
