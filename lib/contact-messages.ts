import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTextInput } from "@/lib/validation";

export type ContactMessageInput = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  source?: unknown;
  userId?: string | null;
  userAgent?: string | null;
};

export type ContactMessageResult =
  | { ok: true }
  | { ok: false; message: string; status?: number; needsMigration?: boolean };

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value: unknown) {
  return normalizeTextInput(value, { maxLength: 160 }).toLocaleLowerCase("tr-TR");
}

function normalizeSource(value: unknown) {
  const source = normalizeTextInput(value, { maxLength: 40 }).toLocaleLowerCase("tr-TR");

  if (["web", "mobile", "support", "marketing"].includes(source)) {
    return source;
  }

  return "web";
}

function isContactMigrationError(error?: { code?: string; message?: string } | null) {
  if (!error) return false;

  const message = error.message?.toLocaleLowerCase("tr-TR") || "";

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("contact_messages")
  );
}

export async function insertContactMessage(
  supabase: SupabaseClient,
  input: ContactMessageInput
): Promise<ContactMessageResult> {
  const name = normalizeTextInput(input.name, { maxLength: 120 });
  const email = normalizeEmail(input.email);
  const subject = normalizeTextInput(input.subject, { maxLength: 140 });
  const message = normalizeTextInput(input.message, {
    maxLength: 2000,
    preserveLineBreaks: true,
  });
  const source = normalizeSource(input.source);
  const userAgent = normalizeTextInput(input.userAgent, { maxLength: 300 }) || null;

  if (!name || !email || !subject || !message) {
    return {
      ok: false,
      status: 400,
      message: "Ad, e-posta, konu ve mesaj alanlarini doldurmalisin.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      ok: false,
      status: 400,
      message: "Lutfen gecerli bir e-posta adresi gir.",
    };
  }

  const { error } = await supabase.from("contact_messages").insert({
    user_id: input.userId || null,
    name,
    email,
    subject,
    message,
    source,
    user_agent: userAgent,
  });

  if (error && isContactMigrationError(error)) {
    return {
      ok: false,
      status: 409,
      needsMigration: true,
      message:
        "Supabase SQL Editor icinde supabase-student-verification-contact.sql dosyasini calistirmalisin.",
    };
  }

  if (error) {
    return {
      ok: false,
      status: 500,
      message: error.message || "Mesaj gonderilemedi.",
    };
  }

  return { ok: true };
}
