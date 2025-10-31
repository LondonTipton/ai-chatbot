import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Comprehensive metadata configuration for DeepCounsel
 * Optimized for SEO and search rankings
 */
export const siteMetadata = {
  name: "DeepCounsel",
  title:
    "DeepCounsel - AI Legal Assistant for Zimbabwean Law | Jacana Framework",
  description:
    "State-of-the-art AI legal assistant powered by Jacana framework. Specialized in Zimbabwean jurisdiction with 40%+ performance advantage. Expert caselaw analysis, legal drafting, and research for African legal professionals.",
  url: siteUrl,
  ogImage: `${siteUrl}/og-image.png`,
  keywords: [
    // Primary Keywords
    "DeepCounsel",
    "AI legal assistant Zimbabwe",
    "Jacana framework",
    "Zimbabwean legal AI",
    "African legal technology",
    "legal AI Zimbabwe",

    // Feature-specific Keywords
    "Zimbabwe caselaw analysis",
    "AI legal drafting Zimbabwe",
    "legal research AI Africa",
    "Zimbabwean law AI assistant",
    "African legal automation",
    "legal document automation Zimbabwe",

    // Technology Keywords
    "Jacana AI framework",
    "legal AI technology",
    "state-of-the-art legal AI",
    "SOTA legal assistant",
    "AI-powered legal research",

    // Practice Area Keywords
    "litigation support AI Zimbabwe",
    "contract management AI",
    "regulatory compliance AI Africa",
    "corporate law AI Zimbabwe",
    "tax law AI assistant",
    "legal precedent analysis",

    // Long-tail Keywords
    "AI legal assistant for Zimbabwean law",
    "automated legal research Zimbabwe",
    "AI-powered caselaw analysis Africa",
    "legal drafting automation Zimbabwe",
    "Zimbabwean legal precedent search",
    "African jurisdiction legal AI",
    "Zimbabwe Supreme Court case analysis",
    "legal document generation Zimbabwe",

    // Competitive Keywords
    "best legal AI Zimbabwe",
    "top legal technology Africa",
    "advanced legal AI assistant",
    "professional legal AI tool",
    "enterprise legal AI solution",
  ],
  authors: [
    {
      name: "DeepCounsel",
      url: "https://deep-counsel.org",
    },
  ],
  creator: "DeepCounsel by Nyamaropa Technologies",
  publisher: "DeepCounsel",
  category: "Legal Technology",
  classification: "Legal AI Software",
};

/**
 * Enhanced metadata for the root layout
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteMetadata.title,
    template: "%s | DeepCounsel - AI Legal Assistant",
  },
  description: siteMetadata.description,
  keywords: siteMetadata.keywords,
  authors: siteMetadata.authors,
  creator: siteMetadata.creator,
  publisher: siteMetadata.publisher,
  category: siteMetadata.category,
  classification: siteMetadata.classification,

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_ZW", // Zimbabwe English
    alternateLocale: ["en_US", "en_GB", "en_ZA"], // US, UK, South Africa
    url: siteUrl,
    siteName: siteMetadata.name,
    title: siteMetadata.title,
    description: siteMetadata.description,
    images: [
      {
        url: siteMetadata.ogImage,
        width: 1200,
        height: 630,
        alt: "DeepCounsel - AI Legal Assistant for Zimbabwean Law",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: siteMetadata.title,
    description: siteMetadata.description,
    images: [siteMetadata.ogImage],
    creator: "@deepcounsel",
    site: "@deepcounsel",
  },

  robots:
    process.env.NEXT_PUBLIC_NO_INDEX === "true"
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : {
          index: true,
          follow: true,
          nocache: false,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#000000",
      },
    ],
  },

  manifest: "/site.webmanifest",

  applicationName: siteMetadata.name,

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DeepCounsel",
  },

  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },

  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "",
    },
  },

  other: {
    "application-name": siteMetadata.name,
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "DeepCounsel",
    "format-detection": "telephone=no",
    "msapplication-TileColor": "#000000",
    "msapplication-tap-highlight": "no",
    "theme-color": "#000000",
  },
};

/**
 * JSON-LD structured data for enhanced SEO
 */
export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: "DeepCounsel",
      applicationCategory: "LegalApplication",
      applicationSubCategory: "Legal AI Assistant",
      operatingSystem: "Web Browser",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        priceValidUntil: "2025-12-31",
        description: "Public preview with upcoming paid plans",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "1000",
        bestRating: "5",
        worstRating: "1",
      },
      description:
        "State-of-the-art AI legal assistant powered by Jacana framework, specialized in Zimbabwean jurisdiction with superior caselaw analysis and legal drafting capabilities.",
      featureList: [
        "Zimbabwean Caselaw Analysis",
        "Legal Document Drafting",
        "Legal Research & Precedent Search",
        "Contract Analysis & Review",
        "Regulatory Compliance Monitoring",
        "Litigation Support",
        "Corporate Law Assistance",
        "Tax & Financial Legal Analysis",
      ],
      screenshot: `${siteUrl}/screenshots/main-interface.png`,
      softwareVersion: "3.1.0",
      releaseNotes: "Public preview version with Jacana framework integration",
      author: {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
      },
      provider: {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "DeepCounsel",
      legalName: "DeepCounsel by Nyamaropa Technologies",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
        width: 512,
        height: 512,
      },
      description:
        "Leading AI legal technology company specializing in African legal systems, powered by the proprietary Jacana framework.",
      foundingDate: "2022",
      areaServed: [
        {
          "@type": "Country",
          name: "Zimbabwe",
        },
        {
          "@type": "Country",
          name: "South Africa",
        },
        {
          "@type": "Continent",
          name: "Africa",
        },
      ],
      sameAs: [
        "https://www.linkedin.com/company/deepcounsel",
        "https://twitter.com/deepcounsel",
        "https://www.facebook.com/deepcounsel",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Customer Support",
        availableLanguage: ["English"],
        areaServed: "ZW",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "DeepCounsel",
      description: siteMetadata.description,
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      inLanguage: "en-ZW",
    },
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/#webpage`,
      url: siteUrl,
      name: siteMetadata.title,
      description: siteMetadata.description,
      isPartOf: {
        "@id": `${siteUrl}/#website`,
      },
      about: {
        "@id": `${siteUrl}/#organization`,
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: siteMetadata.ogImage,
      },
      datePublished: "2024-01-01T00:00:00+00:00",
      dateModified: new Date().toISOString(),
      inLanguage: "en-ZW",
    },
    {
      "@type": "Product",
      "@id": `${siteUrl}/#product`,
      name: "Jacana Legal AI Framework",
      description:
        "Proprietary AI framework powering DeepCounsel with state-of-the-art performance in legal analysis, outperforming competitors by over 40%.",
      brand: {
        "@type": "Brand",
        name: "DeepCounsel",
      },
      manufacturer: {
        "@id": `${siteUrl}/#organization`,
      },
      category: "Legal AI Technology",
      audience: {
        "@type": "Audience",
        audienceType: "Legal Professionals",
        geographicArea: {
          "@type": "Country",
          name: "Zimbabwe",
        },
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: [
        {
          "@type": "Question",
          name: "What is DeepCounsel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "DeepCounsel is a state-of-the-art AI legal assistant powered by the Jacana framework, specialized in Zimbabwean jurisdiction with superior performance in caselaw analysis and legal drafting.",
          },
        },
        {
          "@type": "Question",
          name: "What is the Jacana framework?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Jacana is DeepCounsel's proprietary AI framework designed specifically for legal applications, delivering state-of-the-art performance that outclasses competitors by over 40% in legal analysis and drafting tasks.",
          },
        },
        {
          "@type": "Question",
          name: "Which jurisdictions does DeepCounsel support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "DeepCounsel specializes in Zimbabwean law with deep expertise in local caselaw, statutes, and legal precedents. Support for additional African jurisdictions including South Africa is available.",
          },
        },
        {
          "@type": "Question",
          name: "Is DeepCounsel free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "DeepCounsel is currently in public preview. Paid subscription plans will be introduced as the platform continues to evolve with rapid improvements planned over the coming weeks.",
          },
        },
      ],
    },
  ],
};
