import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const noIndex = process.env.NEXT_PUBLIC_NO_INDEX === "true";

  // Disallow indexing for preview/dev by setting NEXT_PUBLIC_NO_INDEX=true
  if (noIndex) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: `${siteUrl}/sitemap.xml`,
      host: siteUrl,
    };
  }

  // In production, allow most pages except auth, chat detail, and API routes
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/debug/",
          "/login",
          "/register",
          "/verify",
          "/verify-pending",
          "/checkout",
          "/payment/",
          "/chat/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
