import type { CookieOptionsWithName } from "@supabase/ssr";

export const rememberedSessionMaxAgeSeconds = 400 * 24 * 60 * 60;

export const supabaseCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: rememberedSessionMaxAgeSeconds,
};

export function withSupabaseCookieOptions(
  options: CookieOptionsWithName = {}
): CookieOptionsWithName {
  const isDeleteCookie = options.maxAge === 0;

  return {
    ...supabaseCookieOptions,
    ...options,
    path: options.path ?? supabaseCookieOptions.path,
    sameSite: options.sameSite ?? supabaseCookieOptions.sameSite,
    secure: options.secure ?? supabaseCookieOptions.secure,
    maxAge: isDeleteCookie
      ? 0
      : options.maxAge ?? supabaseCookieOptions.maxAge,
  };
}
