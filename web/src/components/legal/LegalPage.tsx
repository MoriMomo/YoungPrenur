"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MdipLogo } from "@/components/ui/MdipLogo";
import { LangSwitch, useT } from "@/lib/i18n";

/** Shared shell for the security, privacy and terms pages: the certificate frame with one readable column. */
export function LegalPage({
  title,
  intro,
  updated,
  draft = false,
  en,
  id,
}: {
  title: [string, string];
  intro: [string, string];
  updated: [string, string];
  /** Marks text that has not been reviewed by a lawyer yet. */
  draft?: boolean;
  /** The page body in English and in Bahasa Indonesia. */
  en: React.ReactNode;
  id: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="drafting-grid min-h-screen px-3 py-4 sm:px-6 sm:py-8">
      <div className="cert-frame mx-auto max-w-[880px] bg-sheet">
        <header className="guilloche flex items-center justify-between gap-3 border-b border-rule-strong px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label={t("MDIP home", "Beranda MDIP")}>
            <MdipLogo variant="color" size={28} />
            <span className="font-display text-xl font-extrabold text-ink">MDIP</span>
          </Link>
          <div className="flex items-center gap-3">
            <LangSwitch />
            <Link href="/" className="inline-flex items-center gap-1.5 py-2 text-sm font-medium text-ink-2 hover:text-ink">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">{t("Back to MDIP", "Kembali ke MDIP")}</span>
            </Link>
          </div>
        </header>

        <main className="px-5 py-10 sm:px-8">
          {draft && (
            <p role="note" className="mb-6 border border-warn-line bg-warn-wash px-4 py-3 text-sm text-warn">
              {t(
                "Draft pending legal review. This text describes how MDIP works today but is not yet a binding agreement.",
                "Draf menunggu tinjauan hukum. Teks ini menjelaskan cara kerja MDIP saat ini, tetapi belum menjadi perjanjian yang mengikat."
              )}
            </p>
          )}
          <h1 className="font-display text-[40px] font-extrabold uppercase leading-none text-ink">{t(...title)}</h1>
          <p className="mt-3 max-w-[36rem] text-base leading-relaxed text-ink-2">{t(...intro)}</p>
          <p className="mt-2 font-mono-numbers text-xs text-ink-3">
            {t("Last updated", "Terakhir diperbarui")} {t(...updated)}
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
            {t(en, id)}
          </div>
        </main>

        <footer className="flex flex-col gap-2 border-t border-rule-strong px-5 py-4 text-xs text-ink-3 sm:flex-row sm:justify-between sm:px-8">
          <span>© 2026 MDIP · {t("Manufacturing Decision Intelligence Platform", "Platform Intelijen Keputusan Manufaktur")}</span>
          <nav aria-label={t("Legal", "Hukum")} className="flex gap-4 [&>a]:py-1">
            <Link href="/security" className="hover:text-ink hover:underline">{t("Security & data", "Keamanan & data")}</Link>
            <Link href="/privacy" className="hover:text-ink hover:underline">{t("Privacy", "Privasi")}</Link>
            <Link href="/terms" className="hover:text-ink hover:underline">{t("Terms", "Ketentuan")}</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
