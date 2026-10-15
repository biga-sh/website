import type { MetadataRoute } from "next";

import { source } from "@/lib/source";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Only the stable, indexable surfaces. Sessions are ephemeral and noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/brand`, changeFrequency: "monthly", priority: 0.4 },
    ...source.getPages().map((page) => ({
      url: `${siteUrl}${page.url}`,
      changeFrequency: "weekly" as const,
      priority: page.url === "/docs" ? 0.8 : 0.6,
    })),
  ];
}
