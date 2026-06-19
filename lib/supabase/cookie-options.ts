import type { CookieOptionsWithName } from "@supabase/ssr";

export const rememberedSessionMaxAgeSeconds = 400 * 24 * 60 * 60;

export const supabaseCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: rememberedSessionMaxAgeSeconds,
};
