export type TextInputOptions = {
  maxLength?: number;
  preserveLineBreaks?: boolean;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAGS = /<[^>]*>/g;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeTextInput(
  value: unknown,
  { maxLength = 240, preserveLineBreaks = false }: TextInputOptions = {}
) {
  let text = typeof value === "string" ? value : String(value ?? "");

  text = text.replace(CONTROL_CHARS, "").replace(HTML_TAGS, " ");

  if (preserveLineBreaks) {
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    text = text.replace(/\s+/g, " ");
  }

  return text.trim().slice(0, maxLength);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export function normalizeUuid(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";

  return isUuid(text) ? text : null;
}

export function normalizeEnum<T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallback: T[number]
): T[number] {
  return typeof value === "string" && allowedValues.includes(value)
    ? value
    : fallback;
}

export function normalizeInternalPath(value: unknown, fallback = "/") {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text.startsWith("/")) return fallback;
  if (text.startsWith("//")) return fallback;
  if (text.includes("\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(text)) return fallback;

  return text.slice(0, 500);
}

export function normalizeUrlString(value: unknown, maxLength = 500) {
  const text = normalizeTextInput(value, { maxLength });

  if (!text) return "";

  try {
    const url = new URL(text);

    if (url.protocol !== "https:") return "";

    return url.toString().slice(0, maxLength);
  } catch {
    return "";
  }
}

export function isAllowedImageFile(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export function getSafeImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
}
