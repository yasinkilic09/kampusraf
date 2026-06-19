import type { MetadataRoute } from "next";
import { absoluteUrl, publicSeoRoutes, seoLastModified } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicSeoRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date(route.lastModified || seoLastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    images: route.path === "/" ? [absoluteUrl("/logo.png")] : undefined,
  }));
}
