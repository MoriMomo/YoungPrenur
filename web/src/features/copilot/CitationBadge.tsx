"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CitationItem } from "@/types";
import { Bookmark, ExternalLink } from "lucide-react";

interface CitationBadgeProps {
  citation: CitationItem;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({ citation }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative inline-block max-w-full"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Link
        href={`/dashboard/knowledge?doc=${encodeURIComponent(citation.doc_code)}`}
        className="inline-flex max-w-full flex-wrap items-center gap-1.5 px-2 py-0.5 rounded-md bg-stamp-wash hover:bg-stamp-wash text-stamp-deep border border-stamp-line text-xs font-mono-numbers font-medium transition-colors"
        title={`Open ${citation.doc_code} in Knowledge Base`}
      >
        <Bookmark className="w-3 h-3 text-stamp shrink-0" />
        <span className="whitespace-nowrap shrink-0">{citation.doc_code}</span>
        {citation.clause && (
          <span className="min-w-0 break-words text-stamp">· {citation.clause}</span>
        )}
        <ExternalLink className="w-2.5 h-2.5 text-stamp shrink-0" />
      </Link>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 bg-paper text-ink-2 text-xs rounded-xl shadow-sm border border-rule pointer-events-none">
          <div className="font-medium text-ink text-xs mb-1 flex items-center justify-between">
            <span>{citation.title || citation.doc_code}</span>
            <span className="text-xs text-stamp font-mono-numbers">Grounded</span>
          </div>
          <div className="text-xs text-ink-2 font-mono-numbers mb-1.5">
            {citation.clause}
          </div>
          {citation.excerpt && (
            <p className="text-xs text-ink-2 leading-tight">
              &quot;{citation.excerpt}&quot;
            </p>
          )}
        </div>
      )}
    </div>
  );
};
