import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [type, token] = authorization.split(" ");

  if (type?.toLocaleLowerCase("tr-TR") !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

export async function createBearerSupabaseClient(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      supabase: null,
      user: null,
      error: "Oturum bulunamadi.",
    };
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      supabase: null,
      user: null,
      error: error?.message || "Oturum dogrulanamadi.",
    };
  }

  return { supabase, user, error: null };
}
