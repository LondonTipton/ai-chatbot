import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s | DeepCounsel", default: "DeepCounsel" },
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
