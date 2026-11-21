import React from "react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-paper px-4 py-12 flex items-center justify-center">
      <div className="cert-frame max-w-lg w-full bg-sheet p-8 space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-3">
          404 · Record not found
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-tight text-ink">
          This page is not on the certificate
        </h1>
        <p className="text-sm text-ink-2 leading-relaxed">
          The requested inspection route does not exist or has moved. Return to the main certificate or open your dashboard.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <Link
            href="/"
            className="bg-stamp hover:bg-stamp-deep text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            Go to home
          </Link>
          <Link
            href="/dashboard"
            className="border border-rule-strong bg-paper hover:bg-sheet-sunk text-ink px-4 py-2 text-sm font-medium transition-colors"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
