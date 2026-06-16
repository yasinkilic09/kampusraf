import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  isValidCoordinatePair,
  roundCoordinate,
} from "@/lib/location";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isMigrationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.toLocaleLowerCase("tr-TR").includes("location_")
  );
}

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "location_lat, location_lng, location_accuracy_m, location_sharing_enabled, location_updated_at"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: isMigrationError(error)
          ? "Konum altyapısı için supabase-location-map.sql dosyasını Supabase SQL Editor içinde çalıştırmalısın."
          : error.message,
        needsMigration: isMigrationError(error),
      },
      { status: isMigrationError(error) ? 409 : 500 }
    );
  }

  if (
    data?.location_sharing_enabled &&
    typeof data.location_lat === "number" &&
    typeof data.location_lng === "number"
  ) {
    await supabase.rpc("refresh_user_book_locations", {
      p_user_id: user.id,
    });
  }

  return NextResponse.json({
    location: data || null,
    needsMigration: false,
  });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    lat?: unknown;
    lng?: unknown;
    accuracy?: unknown;
  } | null;

  const lat = Number(payload?.lat);
  const lng = Number(payload?.lng);
  const accuracy = Number(payload?.accuracy);

  if (!isValidCoordinatePair(lat, lng)) {
    return NextResponse.json(
      { error: "Geçerli bir konum alınamadı." },
      { status: 400 }
    );
  }

  const safeLat = roundCoordinate(lat);
  const safeLng = roundCoordinate(lng);
  const safeAccuracy = Number.isFinite(accuracy)
    ? Math.max(Math.round(accuracy), 0)
    : null;
  const now = new Date().toISOString();

  const profilePayload = {
    id: user.id,
    email: user.email,
    location_lat: safeLat,
    location_lng: safeLng,
    location_accuracy_m: safeAccuracy,
    location_sharing_enabled: true,
    location_updated_at: now,
    updated_at: now,
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (profileError) {
    return NextResponse.json(
      {
        error: isMigrationError(profileError)
          ? "Konum altyapısı için supabase-location-map.sql dosyasını Supabase SQL Editor içinde çalıştırmalısın."
          : profileError.message,
        needsMigration: isMigrationError(profileError),
      },
      { status: isMigrationError(profileError) ? 409 : 500 }
    );
  }

  const { error: booksError } = await supabase
    .from("user_books")
    .update({
      location_lat: safeLat,
      location_lng: safeLng,
      location_source: "profile",
      location_shared_at: now,
      updated_at: now,
    })
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("status", ["mevcut", "available"])
    .in("exchange_type", [
      "takas",
      "odunc",
      "satis",
      "bagis",
      "lend",
      "sell",
      "donation",
    ]);

  if (booksError && !isMigrationError(booksError)) {
    return NextResponse.json({ error: booksError.message }, { status: 500 });
  }

  await supabase.rpc("refresh_user_book_locations", {
    p_user_id: user.id,
  });

  revalidatePath("/harita");
  revalidatePath("/kitaplarim");
  revalidatePath("/kitap-ara");
  revalidatePath("/profilim");

  return NextResponse.json({
    location: {
      location_lat: safeLat,
      location_lng: safeLng,
      location_accuracy_m: safeAccuracy,
      location_sharing_enabled: true,
      location_updated_at: now,
    },
    needsMigration: false,
  });
}

export async function DELETE() {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  const now = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      location_lat: null,
      location_lng: null,
      location_accuracy_m: null,
      location_sharing_enabled: false,
      location_updated_at: now,
      updated_at: now,
    })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json(
      {
        error: isMigrationError(profileError)
          ? "Konum altyapısı için supabase-location-map.sql dosyasını Supabase SQL Editor içinde çalıştırmalısın."
          : profileError.message,
        needsMigration: isMigrationError(profileError),
      },
      { status: isMigrationError(profileError) ? 409 : 500 }
    );
  }

  const { error: booksError } = await supabase
    .from("user_books")
    .update({
      location_lat: null,
      location_lng: null,
      location_source: null,
      location_shared_at: null,
      updated_at: now,
    })
    .eq("user_id", user.id);

  if (booksError && !isMigrationError(booksError)) {
    return NextResponse.json({ error: booksError.message }, { status: 500 });
  }

  revalidatePath("/harita");
  revalidatePath("/kitaplarim");
  revalidatePath("/profilim");

  return NextResponse.json({
    location: null,
    needsMigration: false,
  });
}
