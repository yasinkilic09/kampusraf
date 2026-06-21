import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  supabaseCookieOptions,
  withSupabaseCookieOptions,
} from "@/lib/supabase/cookie-options";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(
                name,
                value,
                withSupabaseCookieOptions(options)
              );
            });
          } catch {
            // Server Component içinde cookie yazılamadığı durumlar için güvenli geçiş.
          }
        },
      },
    }
  );
}
