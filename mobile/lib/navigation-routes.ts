export function getMobileRouteFromUrl(value?: string | null) {
  const url = (value || "").trim();
  if (!url) return null;

  if (url.startsWith("/mesajlar/kullanici/")) {
    const userId = url.split("/").filter(Boolean).pop();
    return userId ? `/messages/${userId}` : "/messages";
  }

  if (url.startsWith("/messages/")) return url;
  if (url.startsWith("/mesajlar") || url.startsWith("/messages")) return "/messages";
  if (url.startsWith("/bildirimler") || url.startsWith("/notifications")) return "/notifications";
  if (url.startsWith("/sesli-raf") || url.startsWith("/audio")) return "/audio";
  if (url.startsWith("/akis") || url.startsWith("/feed")) return "/feed";
  if (url.startsWith("/topluluklar") || url.startsWith("/communities")) return "/communities";
  if (url.startsWith("/paylas") || url.startsWith("/share")) return "/share";
  if (url.startsWith("/gonderi/")) {
    const postId = url.split("/").filter(Boolean).pop();
    return postId ? `/posts/${postId}` : "/feed";
  }
  if (url.startsWith("/kitaplar/")) {
    const userBookId = url.split("/").filter(Boolean).pop();
    return userBookId ? `/books/${userBookId}` : "/explore";
  }
  if (url.startsWith("/aradigim-kitaplar")) return "/requests";
  if (url.startsWith("/kitap-ekle")) return "/books/add";
  if (url.startsWith("/kitaplarim")) return "/my-books";
  if (url.startsWith("/harita") || url.startsWith("/map")) return "/map";
  if (url.startsWith("/eslesmeler")) return "/matches";
  if (url.startsWith("/takaslar") || url.startsWith("/exchanges")) return "/exchanges";
  if (url.startsWith("/arkadaslar") || url.startsWith("/friends")) return "/friends";
  if (url.startsWith("/kitap-ara") || url.startsWith("/explore")) return "/explore";
  if (url.startsWith("/profilim") || url.startsWith("/profile")) return "/profile";
  if (url.startsWith("/ogrenci-dogrulama")) return "/student-verification";
  if (url.startsWith("/hakkimizda")) return "/about";
  if (url.startsWith("/bize-ulasin")) return "/contact";
  if (url.startsWith("/paketler")) return "/profile";
  if (url.startsWith("/rastgele-raf")) return "/random-shelf";
  if (url.startsWith("/kelime-sozlugu") || url.startsWith("/daily-word")) return "/daily-word";
  if (url.startsWith("/favori-alintilarim")) return "/random-shelf/favorites";

  return null;
}
