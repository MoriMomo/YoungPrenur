import React from "react";
import Link from "next/link";
import { T } from "@/lib/i18n";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-paper px-4 py-12 flex items-center justify-center">
      <div className="cert-frame max-w-lg w-full bg-sheet p-8 space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-3">
          404 · <T en="Record not found" id="Catatan tidak ditemukan" />
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-tight text-ink">
          <T en="This page is not on the certificate" id="Halaman ini tidak ada di sertifikat" />
        </h1>
        <p className="text-sm text-ink-2 leading-relaxed">
          <T
            en="The requested inspection route does not exist or has moved. Return to the main certificate or open your dashboard."
            id="Rute inspeksi yang diminta tidak ada atau sudah dipindahkan. Kembali ke sertifikat utama atau buka dasbor Anda."
          />
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <Link
            href="/"
            className="bg-stamp hover:bg-stamp-deep text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <T en="Go to home" id="Ke beranda" />
          </Link>
          <Link
            href="/dashboard"
            className="border border-rule-strong bg-paper hover:bg-sheet-sunk text-ink px-4 py-2 text-sm font-medium transition-colors"
          >
            <T en="Open dashboard" id="Buka dasbor" />
          </Link>
        </div>
      </div>
    </div>
  );
}
