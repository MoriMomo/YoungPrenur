import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MDIP: AI Manufacturing Copilot | Decision Intelligence",
  description: "Next.js AI Manufacturing Copilot TRL 4 prototype featuring role-based cockpits, CPM heuristic delay-risk scoring, grounded RAG SOP retrieval, and IRoom integration scope.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f4f7fb] text-[#101e30] antialiased">
        {children}
      </body>
    </html>
  );
}
