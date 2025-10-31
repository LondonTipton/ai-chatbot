import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose a DeepCounsel plan that fits your legal assistance needs: Free, Basic, Pro, Pro+, Ultra, and Enterprise.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "DeepCounsel Pricing",
    description:
      "Compare DeepCounsel plans for individuals, professionals, and enterprises.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DeepCounsel Pricing",
    description:
      "Compare DeepCounsel plans for individuals, professionals, and enterprises.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
