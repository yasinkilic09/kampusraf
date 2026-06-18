import type { MetadataRoute } from "next";
import { siteDescription, siteName, siteShortName } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteShortName,
    description: siteDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF7F0",
    theme_color: "#2E7D5B",
    lang: "tr",
    icons: [
      {
        src: "/logo-symbol.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-symbol.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.png",
        sizes: "1200x1200",
        type: "image/png",
      },
    ],
  };
}
