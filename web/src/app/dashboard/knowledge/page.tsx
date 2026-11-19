"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "../layout";
import { KNOWLEDGE_DOCS } from "@/lib/mock-data";
import { fetchKnowledgeDocs, ingestKnowledgeDoc } from "@/lib/api";
import { KnowledgeDoc } from "@/types";
import { ChevronRight, X, Bookmark, Plus } from "lucide-react";

function findMatchingDoc(docs: KnowledgeDoc[], docCode: string | null): KnowledgeDoc | null {
  if (!docCode) return null;
  const upper = docCode.toUpperCase();
  return (
    docs.find(
      (d) => d.code.toUpperCase() === upper || upper.includes(d.code.toUpperCase())
    ) || null
  );
}

function KnowledgeContent({ initialDocCode }: { initialDocCode: string | null }) {
  const { showToast } = useDashboard();
  const [docs, setDocs] = useState<KnowledgeDoc[]>(KNOWLEDGE_DOCS);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(() =>
    findMatchingDoc(KNOWLEDGE_DOCS, initialDocCode)
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [docCode, setDocCode] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docClause, setDocClause] = useState("");
  const [docKeywords, setDocKeywords] = useState("");
  const [docExcerpt, setDocExcerpt] = useState("");

  useEffect(() => {
    let active = true;
    fetchKnowledgeDocs().then((loaded) => {
      if (!active || loaded.length === 0) return;
      setDocs(loaded);
      if (initialDocCode) {
        const matched = findMatchingDoc(loaded, initialDocCode);
        if (matched) setSelectedDoc(matched);
      }
    });
    return () => {
      active = false;
    };
  }, [initialDocCode]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedDoc) {
        setSelectedDoc(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedDoc]);

  const handleOpenDoc = (doc: KnowledgeDoc) => {
    setSelectedDoc(doc);
    showToast(`Loaded indexed clauses for ${doc.code}`);
  };

  const handleAddSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docCode.trim() || !docTitle.trim() || !docExcerpt.trim()) return;
    const keywords = docKeywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const clause = docClause.trim() || "Clause 1.0: Standard Control";
    const code = docCode.trim().toUpperCase();
    await ingestKnowledgeDoc({
      doc_code: code,
      title: docTitle.trim(),
      clause,
      keywords,
      excerpt: docExcerpt.trim(),
    });
    const refreshed = await fetchKnowledgeDocs();
    if (refreshed.length > 0) {
      setDocs(refreshed);
    } else {
      const localDoc: KnowledgeDoc = {
        id: `sop-${code.toLowerCase()}`,
        title: docTitle.trim(),
        code,
        category: "Plant SOP",
        keywords,
        summary: docExcerpt.trim(),
        sections: [{ clause, content: docExcerpt.trim() }],
      };
      setDocs((prev) => [localDoc, ...prev.filter((d) => d.code !== code)]);
    }
    setDocCode("");
    setDocTitle("");
    setDocClause("");
    setDocKeywords("");
    setDocExcerpt("");
    setShowAddForm(false);
    showToast(`Indexed ${code} into SOP RAG knowledge base.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-[#2563eb] mb-1">
            RAG Knowledge Store &amp; Clause Traceability
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#101e30] tracking-tight">
            Manufacturing Knowledge Base &amp; SOPs
          </h1>
          <p className="text-xs sm:text-sm text-[#536780]">
            Standard operating procedures indexed for verified Copilot citations and human-in-the-loop audit checks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0c1a2d] hover:bg-[#1a3354] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{showAddForm ? "Cancel" : "Add SOP Clause"}</span>
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSop}
          className="bg-white rounded-xl border border-[#e2eaf3] p-5 space-y-3"
        >
          <div className="text-xs font-semibold text-[#101e30]">
            Index New SOP Document (Live Copilot RAG)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={docCode}
              onChange={(e) => setDocCode(e.target.value)}
              placeholder="SOP Code (e.g. SOP-QA-15)"
              className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-xs"
            />
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Title (e.g. NDT Inspection Protocol)"
              className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-xs"
            />
            <input
              type="text"
              value={docClause}
              onChange={(e) => setDocClause(e.target.value)}
              placeholder="Clause (e.g. Clause 2.1: Rejection)"
              className="px-3 py-2 border border-[#cbd5e1] rounded-lg text-xs"
            />
          </div>
          <input
            type="text"
            value={docKeywords}
            onChange={(e) => setDocKeywords(e.target.value)}
            placeholder="Keywords (comma-separated, e.g. ultrasonic, porosity, casting)"
            className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-xs"
          />
          <textarea
            required
            rows={2}
            value={docExcerpt}
            onChange={(e) => setDocExcerpt(e.target.value)}
            placeholder="Procedure text cited by Copilot..."
            className="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg text-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Save &amp; Index SOP
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-[#e2eaf3] p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
                  {doc.category}
                </span>
                <span className="font-mono-numbers text-xs font-medium text-[#64748b]">
                  {doc.code}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[#101e30] mb-2">
                {doc.title}
              </h3>

              <p className="text-xs text-[#475569] leading-relaxed mb-4">{doc.summary}</p>
            </div>

            <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between">
              <span className="text-[11px] text-[#64748b] font-mono-numbers">
                {doc.sections.length} indexed clauses
              </span>
              <button
                type="button"
                onClick={() => handleOpenDoc(doc)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
              >
                <span>Inspect Clauses</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedDoc && (
        <div
          className="fixed inset-0 bg-[#0c1a2d]/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDoc(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sop-modal-title"
        >
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#e2eaf3] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#e2eaf3] flex items-start justify-between gap-4 bg-[#f8fafc]">
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] inline-block mb-1 font-mono-numbers">
                  {selectedDoc.code}
                </span>
                <h2 id="sop-modal-title" className="text-base font-semibold text-[#111827]">
                  {selectedDoc.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 text-[#64748b] hover:text-[#101e30] hover:bg-[#e2e8f0] rounded-lg transition-colors cursor-pointer"
                aria-label="Close SOP modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-xs text-[#536780]">{selectedDoc.summary}</div>

              <div className="space-y-3 pt-2">
                {selectedDoc.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2eaf3] space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#2563eb]">
                      <Bookmark className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>{sec.clause}</span>
                    </div>
                    <p className="text-xs text-[#334155] leading-relaxed">{sec.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#f8fafc] border-t border-[#e2eaf3] flex items-center justify-between text-xs text-[#64748b]">
              <span>Indexed for Grounded RAG Traceability</span>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-[#0c1a2d] text-white rounded-xl font-semibold hover:bg-[#1a3354] transition-colors cursor-pointer"
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

function KnowledgePageWithParams() {
  const searchParams = useSearchParams();
  const docParam = searchParams.get("doc");
  return <KnowledgeContent key={docParam || "all"} initialDocCode={docParam} />;
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={null}>
      <KnowledgePageWithParams />
    </Suspense>
  );
}
