"use client";

import React from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-paper px-4 py-12 flex items-center justify-center">
      <div className="cert-frame max-w-lg w-full bg-sheet p-8 space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-hold">
          Inspection interrupted
        </p>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-tight text-ink">
          Unexpected application error
        </h1>
        <p className="text-sm text-ink-2 leading-relaxed">
          The current view failed to render cleanly. Retry this action or return to the overview certificate.
        </p>
        {error?.digest && (
          <p className="font-mono-numbers text-xs text-ink-3">
            Reference: {error.digest}
          </p>
        )}
        <div className="pt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer bg-stamp hover:bg-stamp-deep text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-rule-strong bg-paper hover:bg-sheet-sunk text-ink px-4 py-2 text-sm font-medium transition-colors"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
}
