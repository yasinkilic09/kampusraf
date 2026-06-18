import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/auth/",
        "/dashboard",
        "/bildirimler",
        "/mesajlar",
        "/profilim",
        "/kitaplarim",
        "/kitap-ekle",
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
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl().origin,
  };
}
