"use client";

import React from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <div className="min-h-screen bg-paper px-4 py-12 flex items-center justify-center">
      <div className="cert-frame max-w-lg w-full bg-sheet p-8 space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-hold">
          {t("Inspection interrupted", "Inspeksi terhenti")}
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-tight text-ink">
          {t("Unexpected application error", "Terjadi galat aplikasi")}
        </h1>
        <p className="text-sm text-ink-2 leading-relaxed">
          {t(
            "The current view failed to render cleanly. Retry this action or return to the overview certificate.",
            "Tampilan ini gagal dimuat dengan benar. Coba lagi atau kembali ke sertifikat ringkasan."
          )}
        </p>
        {error?.digest && (
          <p className="font-mono-numbers text-xs text-ink-3">
            {t("Reference:", "Referensi:")} {error.digest}
          </p>
        )}
        <div className="pt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer bg-stamp hover:bg-stamp-deep text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            {t("Try again", "Coba lagi")}
          </button>
          <Link
            href="/"
            className="border border-rule-strong bg-paper hover:bg-sheet-sunk text-ink px-4 py-2 text-sm font-medium transition-colors"
          >
            {t("Return to home", "Kembali ke beranda")}
          </Link>
        </div>
      </div>
    </div>
  );
}
