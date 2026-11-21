import type { Metadata } from "next";
import { Public_Sans, Red_Hat_Mono, Sofia_Sans_Condensed } from "next/font/google";
import "./globals.css";

// Body: an institutional workhorse face, like the print on an inspection certificate.
const publicSans = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

// Measured values: tabular mono with a slashed zero.
const redHatMono = Red_Hat_Mono({
  variable: "--font-data",
  subsets: ["latin"],
});

const sofiaCondensed = Sofia_Sans_Condensed({
  variable: "--font-sofia-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const APP_DESCRIPTION =
  "MDIP predicts which WBS tasks will slip before a work cell stalls, explains why, and routes the fix to a human for approval. Critical-path scheduling, XGBoost delay-risk scoring and a cited SOP copilot for project-based manufacturers.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mdip-ecru.vercel.app"),
  title: "MDIP: Manufacturing Decision Intelligence",
  description: APP_DESCRIPTION,
  openGraph: {
    title: "MDIP: Manufacturing Decision Intelligence",
    description: APP_DESCRIPTION,
    type: "website",
    siteName: "MDIP",
  },
  twitter: {
    card: "summary_large_image",
    title: "MDIP: Manufacturing Decision Intelligence",
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${redHatMono.variable} ${sofiaCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
