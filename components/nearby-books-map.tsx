"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isValidCoordinatePair,
  normalizeRadius,
  type Coordinates,
} from "@/lib/location";
import {
  distanceRadiusOptions,
  getMatchDistanceConfig,
  getLockedDistanceRadiusOptions,
  normalizeDistanceRadiusForPlan,
  type PlanType,
} from "@/lib/match-plans";

type SavedLocation = {
  location_lat: number | null;
  location_lng: number | null;
  location_accuracy_m: number | null;
  location_sharing_enabled: boolean | null;
  location_updated_at: string | null;
};

type NearbyBook = {
  user_book_id: string;
  book_id: string | null;
  title: string;
  author: string;
  cover_url: string | null;
  exchange_type: string | null;
  condition: string | null;
  note: string | null;
  city: string | null;
  university: string | null;
  owner_id: string;
  owner_name: string | null;
  owner_username: string | null;
  owner_avatar_url: string | null;
  owner_university: string | null;
  owner_city: string | null;
  location_lat: number | null;
  location_lng: number | null;
  distance_km: number;
};

type ApiErrorPayload = {
  error?: string;
  needsMigration?: boolean;
};

type NearbyBooksPayload = ApiErrorPayload & {
  books?: NearbyBook[];
  radiusKm?: number;
  requestedRadiusKm?: number;
  wasRadiusCapped?: boolean;
  plan?: DistancePlanPayload;
};

type LocationPayload = ApiErrorPayload & {
  location?: SavedLocation | null;
};

type DistancePlanPayload = {
  type: PlanType;
  label: string;
  maxRadiusKm: number;
  defaultRadiusKm: number;
  mapResultLimit: number;
  scoreBoostCap: number;
  canCustomize: boolean;
  matchDistancePreferenceEnabled: boolean;
  boostLabel: string;
  description: string;
  upgradeHint: string;
};

type NearbyBooksMapProps = {
  initialDistanceSettings?: {
    planType: PlanType;
    radiusKm: number;
    matchDistancePreferenceEnabled: boolean;
  };
};

const exchangeTypeLabels: Record<string, string> = {
  takas: "Takas",
  odunc: "Ödünç",
  satis: "Satış",
  bagis: "Bağış",
  lend: "Ödünç",
  sell: "Satış",
  donation: "Bağış",
};

function getLocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Konum izni kapalı. Yakındaki kitapları görebilmek için tarayıcıdan konum iznini açmalısın.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Konum bilgisi alınamadı. Birazdan tekrar dene veya cihaz konum servislerini kontrol et.";
  }

  if (error.code === error.TIMEOUT) {
    return "Konum isteği zaman aşımına uğradı. Daha iyi bağlantıda tekrar deneyebilirsin.";
  }

  return "Konum alınırken beklenmeyen bir sorun oluştu.";
}

function formatDistance(value: number) {
  if (!Number.isFinite(value)) return "Mesafe yok";
  if (value < 1) return `${Math.max(Math.round(value * 1000), 50)} m`;

  return `${value.toFixed(value < 10 ? 1 : 0)} km`;
}

function getExchangeLabel(value?: string | null) {
  if (!value) return "Paylaşıma açık";

  return exchangeTypeLabels[value] || value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMapBounds(center: Coordinates, radiusKm: number) {
  const safeRadius = Math.max(radiusKm, 1);
  const latDelta = clamp((safeRadius / 111.32) * 1.25, 0.01, 1.2);
  const lngBase = 111.32 * Math.cos((center.lat * Math.PI) / 180);
  const lngDelta = clamp((safeRadius / Math.max(lngBase, 1)) * 1.25, 0.01, 1.2);

  return {
    north: clamp(center.lat + latDelta, -90, 90),
    south: clamp(center.lat - latDelta, -90, 90),
    east: clamp(center.lng + lngDelta, -180, 180),
    west: clamp(center.lng - lngDelta, -180, 180),
  };
}

function getOsmEmbedUrl(center: Coordinates, radiusKm: number) {
  const bounds = getMapBounds(center, radiusKm);
  const params = new URLSearchParams({
    bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
    layer: "mapnik",
    marker: `${center.lat},${center.lng}`,
  });

  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

function getOpenMapUrl(center: Coordinates) {
  return `https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lng}#map=14/${center.lat}/${center.lng}`;
}

function getBookMapPosition(
  book: NearbyBook,
  center: Coordinates,
  radiusKm: number
) {
  if (
    typeof book.location_lat !== "number" ||
    typeof book.location_lng !== "number" ||
    !isValidCoordinatePair(book.location_lat, book.location_lng)
  ) {
    return null;
  }

  const bounds = getMapBounds(center, radiusKm);
  const x =
    ((book.location_lng - bounds.west) / (bounds.east - bounds.west)) * 100;
  const y =
    ((bounds.north - book.location_lat) / (bounds.north - bounds.south)) * 100;

  return {
    x: clamp(x, 5, 95),
    y: clamp(y, 5, 95),
  };
}

function buildDistancePlanPayload(
  planType: PlanType,
  matchDistancePreferenceEnabled: boolean
): DistancePlanPayload {
  const config = getMatchDistanceConfig(planType);

  return {
    type: planType,
    label: config.label,
    maxRadiusKm: config.maxRadiusKm,
    defaultRadiusKm: config.radiusKm,
    mapResultLimit: config.mapResultLimit,
    scoreBoostCap: config.scoreBoostCap,
    canCustomize: config.canCustomize,
    matchDistancePreferenceEnabled,
    boostLabel: config.boostLabel,
    description: config.description,
    upgradeHint: config.upgradeHint,
  };
}

export function NearbyBooksMap({
  initialDistanceSettings,
}: NearbyBooksMapProps) {
  const initialPlanType = initialDistanceSettings?.planType || "free";
  const initialPlanConfig = getMatchDistanceConfig(initialPlanType);
  const initialRadius = normalizeDistanceRadiusForPlan(
    initialDistanceSettings?.radiusKm || initialPlanConfig.radiusKm,
    initialPlanType
  );
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(
    null
  );
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(
    null
  );
  const [radiusKm, setRadiusKm] = useState(initialRadius);
  const [distancePlan, setDistancePlan] = useState<DistancePlanPayload>(() =>
    buildDistancePlanPayload(
      initialPlanType,
      initialDistanceSettings?.matchDistancePreferenceEnabled ?? true
    )
  );
  const [books, setBooks] = useState<NearbyBook[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [message, setMessage] = useState("");
  const [needsMigration, setNeedsMigration] = useState(false);

  const sortedBooks = useMemo(
    () =>
      [...books].sort(
        (first, second) => (first.distance_km || 0) - (second.distance_km || 0)
      ),
    [books]
  );
  const availableRadiusOptions = useMemo(
    () => distanceRadiusOptions.filter((option) => option <= distancePlan.maxRadiusKm),
    [distancePlan.maxRadiusKm]
  );
  const lockedRadiusOptions = useMemo(
    () => getLockedDistanceRadiusOptions(distancePlan.type),
    [distancePlan.type]
  );

  const fetchNearbyBooks = useCallback(
    async (coords: Coordinates, nextRadius = radiusKm) => {
      setIsLoadingBooks(true);
      setMessage("");

      try {
        const params = new URLSearchParams({
          lat: String(coords.lat),
          lng: String(coords.lng),
          radius: String(normalizeRadius(nextRadius)),
        });
        const response = await fetch(`/api/nearby-books?${params.toString()}`);
        const payload = (await response.json()) as NearbyBooksPayload;

        if (!response.ok) {
          setNeedsMigration(Boolean(payload.needsMigration));
          throw new Error(payload.error || "Yakındaki kitaplar alınamadı.");
        }

        setNeedsMigration(false);
        if (payload.plan) {
          setDistancePlan(payload.plan);
        }
        if (typeof payload.radiusKm === "number") {
          setRadiusKm(payload.radiusKm);
        }
        if (payload.wasRadiusCapped && payload.plan) {
          setMessage(
            `${payload.plan.label} paketinde harita yarıçapı en fazla ${payload.plan.maxRadiusKm} km. ${payload.plan.upgradeHint}`
          );
        }
        setBooks(Array.isArray(payload.books) ? payload.books : []);
      } catch (error) {
        setBooks([]);
        setMessage(
          error instanceof Error
            ? error.message
            : "Yakındaki kitaplar alınamadı."
        );
      } finally {
        setIsLoadingBooks(false);
      }
    },
    [radiusKm]
  );

  const loadSavedLocation = useCallback(async () => {
    try {
      const response = await fetch("/api/location/me");
      const payload = (await response.json()) as LocationPayload;

      if (!response.ok) {
        setNeedsMigration(Boolean(payload.needsMigration));
        setMessage(payload.error || "Konum durumu alınamadı.");
        return;
      }

      const location = payload.location || null;

      setSavedLocation(location);
      setNeedsMigration(false);

      if (
        location?.location_sharing_enabled &&
        typeof location.location_lat === "number" &&
        typeof location.location_lng === "number"
      ) {
        const coords = {
          lat: location.location_lat,
          lng: location.location_lng,
        };

        setCurrentLocation(coords);
        await fetchNearbyBooks(coords);
      }
    } catch {
      setMessage("Konum durumu alınamadı.");
    }
  }, [fetchNearbyBooks]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSavedLocation();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadSavedLocation]);

  async function saveLocation(position: GeolocationPosition) {
    const coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    const response = await fetch("/api/location/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lat: coords.lat,
        lng: coords.lng,
        accuracy: position.coords.accuracy,
      }),
    });
    const payload = (await response.json()) as LocationPayload;

    if (!response.ok) {
      setNeedsMigration(Boolean(payload.needsMigration));
      throw new Error(payload.error || "Konum kaydedilemedi.");
    }

    const nextLocation = payload.location || null;
    const safeCoords =
      nextLocation?.location_lat && nextLocation?.location_lng
        ? {
            lat: nextLocation.location_lat,
            lng: nextLocation.location_lng,
          }
        : coords;

    setSavedLocation(nextLocation);
    setCurrentLocation(safeCoords);
    setNeedsMigration(false);
    await fetchNearbyBooks(safeCoords);
  }

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setMessage("Bu tarayıcı konum özelliğini desteklemiyor.");
      return;
    }

    setIsLocating(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void saveLocation(position)
          .then(() => {
            setMessage(
              "Konum kaydedildi. Takas, ödünç, satış veya bağışa açık kitapların haritada görünebilir."
            );
          })
          .catch((error) => {
            setMessage(
              error instanceof Error ? error.message : "Konum kaydedilemedi."
            );
          })
          .finally(() => {
            setIsLocating(false);
          });
      },
      (error) => {
        setMessage(getLocationErrorMessage(error));
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 1000 * 60 * 15,
      }
    );
  }

  async function disableLocation() {
    setIsDisabling(true);
    setMessage("");

    try {
      const response = await fetch("/api/location/me", {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiErrorPayload;

      if (!response.ok) {
        setNeedsMigration(Boolean(payload.needsMigration));
        throw new Error(payload.error || "Konum kapatılamadı.");
      }

      setSavedLocation(null);
      setCurrentLocation(null);
      setBooks([]);
      setNeedsMigration(false);
      setMessage("Konum paylaşımı kapatıldı. Kitapların haritada görünmeyecek.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Konum kapatılamadı."
      );
    } finally {
      setIsDisabling(false);
    }
  }

  function changeRadius(nextRadius: number) {
    if (nextRadius > distancePlan.maxRadiusKm) {
      setMessage(
        `${distancePlan.label} paketinde ${nextRadius} km harita kapalı. ${distancePlan.upgradeHint}`
      );
      return;
    }

    const normalized = normalizeDistanceRadiusForPlan(
      normalizeRadius(nextRadius),
      distancePlan.type
    );

    setRadiusKm(normalized);

    if (currentLocation) {
      void fetchNearbyBooks(currentLocation, normalized);
    }
  }

  const closestBook = sortedBooks[0] || null;
  const locationIsActive = Boolean(
    savedLocation?.location_sharing_enabled && currentLocation
  );
  const mapEmbedUrl = currentLocation
    ? getOsmEmbedUrl(currentLocation, radiusKm)
    : "";
  const openMapUrl = currentLocation ? getOpenMapUrl(currentLocation) : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:gap-8">
      <section className="overflow-hidden rounded-[1.8rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
        <div className="border-b border-[#2E7D5B]/10 bg-[#F8FBF9] p-5 md:p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Konuma göre keşif
              </p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">
                Yakındaki açık rafları gör
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Konumun yaklaşıklaştırılarak saklanır. Haritada yalnızca takas,
                ödünç, satış veya bağışa açık kitaplar görünür.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={requestLocation}
                disabled={isLocating}
                className="rounded-full bg-[#2E7D5B] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/15 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLocating ? "Konum alınıyor..." : "Konumumu Kullan"}
              </button>

              {locationIsActive ? (
                <button
                  type="button"
                  onClick={disableLocation}
                  disabled={isDisabling}
                  className="rounded-full border border-red-200 px-5 py-3 text-sm font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDisabling ? "Kapatılıyor..." : "Konumu Kapat"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {availableRadiusOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeRadius(option)}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  radiusKm === option
                    ? "bg-[#2E7D5B] text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-100 hover:bg-[#2E7D5B]/5 hover:text-[#2E7D5B]"
                }`}
              >
                {option} km
              </button>
            ))}
            {lockedRadiusOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeRadius(option)}
                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-400 ring-1 ring-slate-200 transition hover:bg-[#FFF7E6] hover:text-[#B45309]"
                title={distancePlan.upgradeHint}
              >
                {option} km kilitli
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#2E7D5B]/10">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                Aktif paket
              </p>
              <p className="mt-2 text-sm font-black text-[#1F2933]">
                {distancePlan.label}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#2E7D5B]/10">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                Harita limiti
              </p>
              <p className="mt-2 text-sm font-black text-[#2E7D5B]">
                {distancePlan.maxRadiusKm} km / {distancePlan.mapResultLimit} sonuç
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#2E7D5B]/10">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                Eşleşme etkisi
              </p>
              <p className="mt-2 text-sm font-black text-[#F59E0B]">
                +{distancePlan.scoreBoostCap} puana kadar
              </p>
            </div>
          </div>

          {message ? (
            <div
              className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold leading-6 ${
                needsMigration
                  ? "bg-[#FFF7E6] text-[#92400E]"
                  : "bg-[#2E7D5B]/10 text-[#2E7D5B]"
              }`}
            >
              {message}
            </div>
          ) : null}
        </div>

        <div className="p-4 md:p-7">
          <div className="relative min-h-[520px] overflow-hidden rounded-[1.6rem] bg-[#EAF5EF] ring-1 ring-[#2E7D5B]/10 md:rounded-[2rem]">
            {locationIsActive && mapEmbedUrl ? (
              <iframe
                title="KampüsRaf yakın kitap haritası"
                src={mapEmbedUrl}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(46,125,91,0.18),transparent_25%),linear-gradient(135deg,rgba(245,158,11,0.18),transparent_40%)]" />
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#1F2933]/10" />

            {locationIsActive ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
                <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2E7D5B]/20 animate-ping" />
                <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2E7D5B]/15" />

                <div className="relative flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-2xl shadow-slate-900/20 ring-4 ring-white/75">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2E7D5B] shadow-lg shadow-[#2E7D5B]/30">
                      <div className="h-2.5 w-2.5 rounded-full bg-white" />
                    </div>
                  </div>

                  <div className="mt-2 rounded-full bg-[#1F2933]/92 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-lg backdrop-blur">
                    Sen
                  </div>
                </div>
              </div>
            ) : null}

            {!locationIsActive ? (
              <div className="absolute inset-x-6 top-1/2 z-20 mx-auto max-w-md -translate-y-1/2 rounded-[1.5rem] bg-white/92 p-5 text-center shadow-xl shadow-slate-900/10 backdrop-blur">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                  Harita hazır
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  Önce konum izni ver
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  İzin verdiğinde yakınındaki paylaşıma açık kitaplar burada
                  görünecek. Kesin adres değil, yaklaşık bölge kullanılır.
                </p>
              </div>
            ) : null}

            {locationIsActive &&
              sortedBooks.map((book, index) => {
                if (!currentLocation) return null;

                const position = getBookMapPosition(book, currentLocation, radiusKm);

                if (!position) return null;

                return (
                  <Link
                    key={book.user_book_id}
                    href={`/kitaplar/${book.user_book_id}`}
                    aria-label={`${book.title} kitabını aç`}
                    className="group absolute z-30 flex -translate-x-1/2 -translate-y-full flex-col items-center outline-none"
                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  >
                    <span className="pointer-events-none mb-2 min-w-40 max-w-56 translate-y-2 rounded-2xl bg-[#1F2933]/94 px-3 py-2 text-left opacity-0 shadow-2xl shadow-slate-900/20 backdrop-blur transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                      <span className="block truncate text-xs font-black text-white">
                        {book.title}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2 text-[10px] font-bold text-white/70">
                        <span className="truncate">
                          {getExchangeLabel(book.exchange_type)}
                        </span>
                        <span className="shrink-0 text-[#FCD34D]">
                          {formatDistance(book.distance_km)}
                        </span>
                      </span>
                    </span>

                    <span className="relative flex flex-col items-center transition duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1">
                      <span className="flex h-12 min-w-12 items-center justify-center rounded-[1.2rem] bg-white p-1 shadow-2xl shadow-slate-900/20 ring-1 ring-[#2E7D5B]/15">
                        <span className="flex h-9 min-w-9 items-center justify-center rounded-[0.9rem] bg-gradient-to-br from-[#2E7D5B] to-[#25684c] px-2 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/25 transition group-hover:from-[#F59E0B] group-hover:to-[#D97706]">
                          {index + 1}
                        </span>
                      </span>

                      <span className="-mt-1 h-3 w-3 rotate-45 rounded-[0.2rem] bg-white shadow-lg ring-1 ring-[#2E7D5B]/10" />
                      <span className="mt-1 h-2.5 w-7 rounded-full bg-slate-900/18 blur-[1px]" />
                    </span>
                  </Link>
                );
              })}

            {locationIsActive && sortedBooks.length === 0 && !isLoadingBooks ? (
              <div className="absolute bottom-4 left-4 right-4 z-20 rounded-[1.4rem] bg-white/94 p-4 shadow-xl shadow-slate-900/10 backdrop-blur md:left-auto md:max-w-md">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                  Bu alanda kitap yok
                </p>
                <h3 className="mt-1 text-xl font-black">
                  Harita yine konumuna göre açık.
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  Yakınında açık raf bulunamadı. Daha geniş bir mesafe seçebilir
                  veya kendi kitabını paylaşarak bölgeyi canlandırabilirsin.
                </p>
              </div>
            ) : null}

            {locationIsActive && openMapUrl ? (
              <div className="absolute right-4 top-4 z-20 flex flex-wrap justify-end gap-2">
                <span className="rounded-full bg-white/94 px-3 py-2 text-xs font-black text-[#1F2933] shadow-sm backdrop-blur">
                  OpenStreetMap
                </span>
                <a
                  href={openMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-[#2E7D5B] px-3 py-2 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5"
                >
                  Büyük Haritada Aç
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
        <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
            Harita Özeti
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-[#FAF7F0] p-3 text-center">
              <p className="text-2xl font-black text-[#2E7D5B]">
                {sortedBooks.length}
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                Kitap
              </p>
            </div>
            <div className="rounded-2xl bg-[#FAF7F0] p-3 text-center">
              <p className="text-2xl font-black text-[#F59E0B]">{radiusKm}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                Km
              </p>
            </div>
            <div className="rounded-2xl bg-[#FAF7F0] p-3 text-center">
              <p className="text-2xl font-black text-[#2E7D5B]">
                {closestBook ? formatDistance(closestBook.distance_km) : "-"}
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                En yakın
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#2E7D5B]/10 bg-[#2E7D5B]/5 p-4">
            <p className="text-sm font-black text-[#1F2933]">
              Paket kuralı
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              {distancePlan.boostLabel}: haritada {distancePlan.maxRadiusKm} km
              ve eşleşme skorunda +{distancePlan.scoreBoostCap} puana kadar
              yakınlık etkisi kullanılır.
            </p>
            {!distancePlan.canCustomize ? (
              <Link
                href="/paketler"
                className="mt-3 inline-flex rounded-full bg-[#F59E0B] px-3 py-2 text-[11px] font-black text-white transition hover:-translate-y-0.5"
              >
                Yakınlığı büyüt
              </Link>
            ) : null}
          </div>

          <div className="mt-3 rounded-2xl border border-[#2E7D5B]/10 bg-[#2E7D5B]/5 p-4">
            <p className="text-sm font-black text-[#1F2933]">
              Gizlilik kuralı
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              Haritada kesin adres paylaşılmaz. Konum yaklaşıklaştırılır ve
              konum paylaşımını kapattığında kitapların haritadan kaldırılır.
            </p>
          </div>
        </section>

        <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Yakındaki Kitaplar
              </p>
              <h2 className="mt-2 text-xl font-black">Mesafeye göre liste</h2>
            </div>
            {isLoadingBooks ? (
              <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-[11px] font-black text-slate-500">
                Yükleniyor
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3">
            {sortedBooks.slice(0, 8).map((book, index) => (
              <Link
                key={book.user_book_id}
                href={`/kitaplar/${book.user_book_id}`}
                className="group rounded-[1.35rem] border border-slate-100 bg-[#FAF7F0] p-3 transition hover:-translate-y-0.5 hover:border-[#2E7D5B]/25 hover:bg-white hover:shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-sm font-black text-[#2E7D5B] shadow-sm">
                    {book.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-black text-[#1F2933]">
                          {book.title}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-500">
                          {book.author}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#2E7D5B]">
                        {formatDistance(book.distance_km)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black">
                      <span className="rounded-full bg-[#2E7D5B]/10 px-2.5 py-1 text-[#2E7D5B]">
                        {getExchangeLabel(book.exchange_type)}
                      </span>
                      {book.university || book.owner_university ? (
                        <span className="rounded-full bg-white px-2.5 py-1 text-slate-500">
                          {book.university || book.owner_university}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-500">
                      {book.owner_name || book.owner_username || "Kitap sahibi"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}

            {locationIsActive && sortedBooks.length === 0 ? (
              <div className="rounded-[1.35rem] bg-[#FAF7F0] p-4 text-sm font-bold leading-6 text-slate-500">
                Seçili mesafede paylaşıma açık kitap bulunamadı.
              </div>
            ) : null}
          </div>

          <Link
            href="/kitap-ekle"
            className="mt-5 block rounded-full bg-[#F59E0B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            Haritada Görünecek Kitap Ekle
          </Link>
        </section>
      </aside>
    </div>
  );
}
