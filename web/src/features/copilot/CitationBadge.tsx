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
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Link
        href={`/dashboard/knowledge?doc=${encodeURIComponent(citation.doc_code)}`}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] text-[11px] font-mono-numbers font-medium transition-colors"
        title={`Open ${citation.doc_code} in Knowledge Base`}
      >
        <Bookmark className="w-3 h-3 text-[#2563eb]" />
        <span>{citation.doc_code}</span>
        {citation.clause && (
          <span className="text-[#3b82f6]">· {citation.clause}</span>
        )}
        <ExternalLink className="w-2.5 h-2.5 text-[#3b82f6]" />
      </Link>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 bg-[#0c1a2d] text-[#cad8e8] text-xs rounded-xl shadow-xl border border-[#1e3450] pointer-events-none">
          <div className="font-medium text-white text-[11px] mb-1 flex items-center justify-between">
            <span>{citation.title || citation.doc_code}</span>
            <span className="text-[10px] text-[#60a5fa] font-mono-numbers">Grounded</span>
          </div>
          <div className="text-[10px] text-[#8ca4be] font-mono-numbers mb-1.5">
            {citation.clause}
          </div>
          {citation.excerpt && (
            <p className="text-[11px] text-[#cad8e8] leading-tight">
              &quot;{citation.excerpt}&quot;
            </p>
          )}
        </div>
      )}
    </div>
  );
};
