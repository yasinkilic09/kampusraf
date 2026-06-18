import type { Metadata, MetadataRoute } from "next";
import { bookSeoPages } from "@/lib/book-seo-content";

export const defaultSiteUrl = "https://www.kampusraf.com";
export const siteName = "KampüsRaf";
export const siteShortName = "KampüsRaf";

export const siteDescription =
  "Öğrenciler için kitap paylaşımı, takas, ödünç alma, yakın konumda kitap bulma ve sosyal okuma platformu.";

export const socialDescription =
  "Kitaplar paylaşılır, fikirler büyür. Kampüs içi kitap paylaşımı, takas ve sosyal okuma ağı.";

export const seoKeywords = [
  "kampüs kitap paylaşımı",
  "kitap takas",
  "öğrenci kitap platformu",
  "ikinci el kitap",
  "kitap ödünç alma",
  "üniversite kitap takası",
  "yakınımdaki kitaplar",
  "KampüsRaf",
];

type PublicSeoRoute = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

export const publicSeoRoutes: PublicSeoRoute[] = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/kitap-takas",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/kampusraf-nedir",
    changeFrequency: "monthly",
    priority: 0.95,
  },
  {
    path: "/kampus-kitap-paylasimi",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/ogrenci-kitap-platformu",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/kitap-rehberi",
    changeFrequency: "weekly",
    priority: 0.92,
  },
  ...bookSeoPages.map((page) => ({
    path: `/kitap-rehberi/${page.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.82,
  })),
];

type PageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
};

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  const rawUrl =
    configuredUrl ||
    (process.env.VERCEL_ENV === "preview"
      ? process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL
      : undefined) ||
    defaultSiteUrl;

  const url = rawUrl.trim();

  return new URL(url.startsWith("http") ? url : `https://${url}`);
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  image = "/logo.png",
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  return {
    title,
    description,
    keywords: [...seoKeywords, ...keywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 1200,
          alt: `${siteName} logo`,
        },
      ],
      locale: "tr_TR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export function createJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
