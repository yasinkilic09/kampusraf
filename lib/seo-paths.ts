export const noIndexRobotsHeaderValue = "noindex, nofollow, nosnippet";

const noIndexRoutePrefixes = [
  "/admin",
  "/auth",
  "/dashboard",
  "/akis",
  "/bildirimler",
  "/mesajlar",
  "/profilim",
  "/kitaplarim",
  "/kitap-ekle",
  "/kitap-ara",
  "/kitaplar",
  "/aradigim-kitaplar",
  "/favori-alintilarim",
  "/paylas",
  "/arkadaslar",
  "/takaslar",
  "/eslesmeler",
  "/harita",
  "/topluluklar",
  "/rastgele-raf",
  "/sesli-raf",
  "/ogrenci-dogrulama",
  "/hesap-kisitlandi",
  "/paketler",
  "/gonderi",
  "/profil",
];

export const noIndexHeaderSources = noIndexRoutePrefixes.map(
  (path) => `${path}/:path*`
);

export const robotsDisallowPaths = [
  "/api/",
  ...noIndexRoutePrefixes,
];
