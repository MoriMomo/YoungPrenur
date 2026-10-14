"use client";

import React, { useState } from "react";
import { useDashboard } from "../layout";
import { KNOWLEDGE_DOCS } from "@/lib/mock-data";
import { KnowledgeDoc } from "@/types";
import { FileText, ChevronRight, X, BookOpen, Bookmark } from "lucide-react";

export default function KnowledgePage() {
  const { showToast } = useDashboard();
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);

  const handleOpenDoc = (doc: KnowledgeDoc) => {
    setSelectedDoc(doc);
    showToast(`Loaded indexed clauses for ${doc.code}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="text-[11px] font-bold text-[#2563eb] uppercase tracking-widest mb-1">
          RAG Knowledge Store & Retrieval Grounding
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#101e30] tracking-tight">
          Manufacturing Knowledge Base & SOPs
        </h1>
        <p className="text-xs sm:text-sm text-[#536780]">
          Standard operating procedures and machine specifications indexed for verified RAG Copilot grounding.
        </p>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KNOWLEDGE_DOCS.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-[#e2eaf3] p-5 shadow-[0_2px_8px_rgba(12,26,45,0.04)] hover:shadow-[0_4px_16px_rgba(12,26,45,0.06)] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
                  {doc.category}
                </span>
                <span className="font-mono-numbers text-xs font-bold text-[#64748b]">
                  {doc.code}
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#101e30] tracking-tight mb-2">
                {doc.title}
              </h3>

              <p className="text-xs text-[#475569] leading-relaxed mb-4">
                {doc.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between">
              <span className="text-[11px] text-[#64748b]">
                {doc.sections.length} indexed clauses
              </span>
              <button
                onClick={() => handleOpenDoc(doc)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
              >
                <span>Inspect Clauses</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Clauses Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-[#0c1a2d]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#e2eaf3] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#e2eaf3] flex items-start justify-between gap-4 bg-[#f8fafc]">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] inline-block mb-1">
                  {selectedDoc.code}
                </span>
                <h2 className="text-base font-bold text-[#101e30] tracking-tight">
                  {selectedDoc.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 text-[#64748b] hover:text-[#101e30] hover:bg-[#e2e8f0] rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-xs text-[#536780]">
                {selectedDoc.summary}
              </div>

              <div className="space-y-3 pt-2">
                {selectedDoc.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2eaf3] space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2563eb]">
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{sec.clause}</span>
                    </div>
                    <p className="text-xs text-[#334155] leading-relaxed">
                      {sec.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#f8fafc] border-t border-[#e2eaf3] flex items-center justify-between text-xs text-[#64748b]">
              <span>Indexed for Semantic RAG Grounding</span>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-[#2563eb] text-white rounded-xl font-semibold hover:bg-[#1d4ed8] transition cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
