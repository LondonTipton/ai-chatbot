import type { Metadata } from "next";
import { siteMetadata } from "./metadata";

/**
 * Page-specific metadata templates for DeepCounsel
 * Use these in individual page.tsx files to maintain consistent SEO
 */

export const pageMetadata = {
  home: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    keywords: siteMetadata.keywords.slice(0, 20), // Top 20 keywords
  },

  features: {
    title: "Features - AI Legal Tools for Zimbabwean Law | DeepCounsel",
    description:
      "Explore DeepCounsel's powerful AI legal features: Zimbabwean caselaw analysis, legal drafting, contract review, regulatory compliance, and litigation support powered by Jacana framework.",
    keywords: [
      "legal AI features",
      "Zimbabwean caselaw analysis",
      "AI legal drafting",
      "contract analysis AI",
      "legal research tools",
      "litigation support AI",
      "regulatory compliance AI",
      "Jacana framework features",
      "legal document automation",
      "AI-powered legal research",
    ],
  },

  about: {
    title: "About DeepCounsel - Leading AI Legal Technology for Africa",
    description:
      "DeepCounsel brings 35+ years of legal expertise to AI technology. Built by legal professionals for legal professionals, powered by the proprietary Jacana framework with 40%+ performance advantage.",
    keywords: [
      "DeepCounsel company",
      "legal AI technology Africa",
      "Jacana framework",
      "African legal technology",
      "legal AI innovation",
      "Zimbabwe legal tech",
      "AI legal expertise",
      "legal technology company",
    ],
  },

  pricing: {
    title: "Pricing Plans - DeepCounsel AI Legal Assistant",
    description:
      "DeepCounsel pricing for legal professionals. Currently in public preview with upcoming paid plans. State-of-the-art AI legal assistance for Zimbabwean law firms and practitioners.",
    keywords: [
      "legal AI pricing",
      "DeepCounsel cost",
      "legal AI subscription",
      "law firm AI pricing",
      "legal technology pricing",
      "AI legal assistant cost",
      "Zimbabwe legal AI pricing",
    ],
  },

  contact: {
    title: "Contact DeepCounsel - Get Started with AI Legal Assistant",
    description:
      "Contact DeepCounsel for demos, consultations, or support. Discover how our Jacana-powered AI can transform your legal practice in Zimbabwe and across Africa.",
    keywords: [
      "contact DeepCounsel",
      "legal AI demo",
      "AI legal consultation",
      "DeepCounsel support",
      "legal AI inquiry",
      "law firm AI demo",
    ],
  },

  resources: {
    title: "Legal Resources & Insights - DeepCounsel Blog",
    description:
      "Expert insights on AI in legal practice, Zimbabwean law updates, legal technology trends, and best practices for African legal professionals.",
    keywords: [
      "legal AI resources",
      "Zimbabwe law insights",
      "legal technology blog",
      "AI legal practice",
      "African legal tech",
      "legal AI guides",
      "law firm technology",
    ],
  },

  useCases: {
    title: "Use Cases - How Legal Professionals Use DeepCounsel AI",
    description:
      "Real-world applications of DeepCounsel AI: litigation support, contract management, regulatory compliance, corporate law, and tax advisory for Zimbabwean legal professionals.",
    keywords: [
      "legal AI use cases",
      "litigation support AI",
      "contract management AI",
      "legal compliance AI",
      "corporate law AI",
      "legal AI applications",
      "law firm AI solutions",
    ],
  },

  research: {
    title: "Legal Research - AI-Powered Zimbabwean Caselaw Analysis",
    description:
      "Advanced AI legal research for Zimbabwean law. Search precedents, analyze cases, and find relevant statutes with DeepCounsel's Jacana-powered research tools.",
    keywords: [
      "AI legal research",
      "Zimbabwe caselaw search",
      "legal precedent analysis",
      "AI case law research",
      "Zimbabwean legal research",
      "legal research AI tool",
      "case law analysis AI",
    ],
  },

  drafting: {
    title: "Legal Drafting - AI Document Generation for Zimbabwe Law",
    description:
      "Professional legal document drafting with AI. Generate contracts, pleadings, opinions, and legal correspondence tailored to Zimbabwean jurisdiction with superior accuracy.",
    keywords: [
      "AI legal drafting",
      "legal document generation",
      "contract drafting AI",
      "Zimbabwe legal documents",
      "AI legal writing",
      "automated legal drafting",
      "legal document AI",
    ],
  },

  compliance: {
    title: "Regulatory Compliance - AI Monitoring for African Jurisdictions",
    description:
      "Stay compliant with evolving regulations. DeepCounsel's AI monitors Zimbabwean and African regulatory changes, providing proactive compliance insights and risk analysis.",
    keywords: [
      "regulatory compliance AI",
      "Zimbabwe compliance monitoring",
      "legal compliance AI",
      "regulatory risk AI",
      "African compliance AI",
      "compliance automation",
    ],
  },

  litigation: {
    title: "Litigation Support - AI-Powered Case Analysis & Strategy",
    description:
      "Enhance litigation practice with AI. Analyze case precedents, develop legal strategies, and prepare comprehensive briefs for Zimbabwean courts with DeepCounsel.",
    keywords: [
      "litigation support AI",
      "AI case analysis",
      "legal strategy AI",
      "Zimbabwe litigation AI",
      "court case AI",
      "litigation technology",
    ],
  },
};

/**
 * Generate metadata for a specific page
 * @param page - Page identifier from pageMetadata
 * @param customOverrides - Optional custom metadata overrides
 */
export function generatePageMetadata(
  page: keyof typeof pageMetadata,
  customOverrides?: Partial<Metadata>
): Metadata {
  const pageData = pageMetadata[page];

  return {
    title: pageData.title,
    description: pageData.description,
    keywords: pageData.keywords,
    openGraph: {
      title: pageData.title,
      description: pageData.description,
      type: "website",
      locale: "en_ZW",
      siteName: siteMetadata.name,
    },
    twitter: {
      card: "summary_large_image",
      title: pageData.title,
      description: pageData.description,
    },
    ...customOverrides,
  };
}

/**
 * Generate metadata for blog posts or dynamic content
 */
export function generateArticleMetadata({
  title,
  description,
  author = "DeepCounsel",
  publishedTime,
  modifiedTime,
  tags = [],
  image,
}: {
  title: string;
  description: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  image?: string;
}): Metadata {
  return {
    title: `${title} | DeepCounsel`,
    description,
    keywords: [...tags, ...siteMetadata.keywords.slice(0, 10)],
    authors: [{ name: author }],
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime,
      modifiedTime,
      authors: [author],
      tags,
      images: image ? [{ url: image }] : undefined,
      locale: "en_ZW",
      siteName: siteMetadata.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * Generate metadata for legal case studies
 */
export function generateCaseStudyMetadata({
  title,
  client,
  industry,
  challenge,
  results,
  image,
}: {
  title: string;
  client: string;
  industry: string;
  challenge: string;
  results: string;
  image?: string;
}): Metadata {
  const description = `${client} case study: ${challenge} ${results}`;

  return {
    title: `${title} - Case Study | DeepCounsel`,
    description,
    keywords: [
      "legal AI case study",
      `${industry} legal AI`,
      "DeepCounsel success story",
      "legal technology results",
      "AI legal transformation",
      ...siteMetadata.keywords.slice(0, 5),
    ],
    openGraph: {
      type: "article",
      title: `${title} - Case Study`,
      description,
      images: image ? [{ url: image }] : undefined,
      locale: "en_ZW",
      siteName: siteMetadata.name,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - Case Study`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * Generate metadata for feature pages
 */
export function generateFeatureMetadata({
  featureName,
  description,
  benefits,
  useCases,
}: {
  featureName: string;
  description: string;
  benefits: string[];
  useCases: string[];
}): Metadata {
  const fullDescription = `${description} ${benefits.join(". ")}`;

  return {
    title: `${featureName} - AI Legal Feature | DeepCounsel`,
    description: fullDescription,
    keywords: [
      featureName.toLowerCase(),
      `${featureName} AI`,
      `legal ${featureName}`,
      ...useCases.map((uc) => uc.toLowerCase()),
      ...siteMetadata.keywords.slice(0, 5),
    ],
    openGraph: {
      type: "website",
      title: `${featureName} - AI Legal Feature`,
      description: fullDescription,
      locale: "en_ZW",
      siteName: siteMetadata.name,
    },
    twitter: {
      card: "summary_large_image",
      title: `${featureName} - AI Legal Feature`,
      description: fullDescription,
    },
  };
}
