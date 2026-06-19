"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const NotificationBell = dynamic(
  () =>
    import("@/components/notification-bell").then((mod) => mod.NotificationBell),
  {
    ssr: false,
  }
);

const MobileBottomNav = dynamic(
  () =>
    import("@/components/mobile-bottom-nav").then((mod) => mod.MobileBottomNav),
  {
    ssr: false,
  }
);

const appRoutePrefixes = [
  "/admin",
  "/akis",
  "/aradigim-kitaplar",
  "/arkadaslar",
  "/bildirimler",
  "/dashboard",
  "/eslesmeler",
  "/favori-alintilarim",
  "/gonderi",
  "/harita",
  "/kitap-ara",
  "/kitap-ekle",
  "/kitaplar",
  "/kitaplarim",
  "/mesajlar",
  "/ogrenci-dogrulama",
  "/paketler",
  "/paylas",
  "/profil/",
  "/profilim",
  "/rastgele-raf",
  "/sesli-raf",
  "/takaslar",
  "/topluluklar",
];

function isAppRoute(pathname: string) {
  return appRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

function subscribeToMobileViewport(onStoreChange: () => void) {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", onStoreChange);

  return () => {
    media.removeEventListener("change", onStoreChange);
  };
}

function getMobileViewportSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function getServerMobileViewportSnapshot() {
  return false;
}

export function AppChrome() {
  const pathname = usePathname();
  const shouldShowAppChrome = isAppRoute(pathname);
  const isMobileViewport = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    getServerMobileViewportSnapshot
  );

  if (!shouldShowAppChrome) {
    return null;
  }

  return (
    <>
      <NotificationBell />
      <div aria-hidden="true" className="h-24 md:hidden" />
      {isMobileViewport ? <MobileBottomNav /> : null}
    </>
  );
}
