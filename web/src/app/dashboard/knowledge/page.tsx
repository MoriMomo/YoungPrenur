"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/features/workspace/dashboard-context";
import { KnowledgeDoc } from "@/types";
import { ChevronRight, X, Bookmark, Plus, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { SopUpload } from "@/features/knowledge/SopUpload";
import { useT } from "@/lib/i18n";

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
  const { knowledgeDocs, addKnowledgeDoc, askCopilotWithPrompt, showToast } = useDashboard();
  const t = useT();
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [dismissedUrlCode, setDismissedUrlCode] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [docCode, setDocCode] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docClause, setDocClause] = useState("");
  const [docKeywords, setDocKeywords] = useState("");
  const [docExcerpt, setDocExcerpt] = useState("");

  const activeDoc =
    selectedDoc
      ? knowledgeDocs.find((d) => d.code === selectedDoc.code) || selectedDoc
      : dismissedUrlCode !== initialDocCode
        ? findMatchingDoc(knowledgeDocs, initialDocCode)
        : null;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeDoc) {
        setSelectedDoc(null);
        setDismissedUrlCode(initialDocCode);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activeDoc, initialDocCode]);

  const handleCloseModal = () => {
    setSelectedDoc(null);
    setDismissedUrlCode(initialDocCode);
  };

  const handleOpenDoc = (doc: KnowledgeDoc) => {
    setSelectedDoc(doc);
    showToast(t(`Loaded indexed clauses for ${doc.code}`, `Klausul terindeks untuk ${doc.code} dimuat`));
  };

  const handleAskCopilot = (doc: KnowledgeDoc) => {
    setSelectedDoc(null);
    setDismissedUrlCode(initialDocCode);
    void askCopilotWithPrompt(
      t(
        `Summarize ${doc.code} (${doc.title}) and its required compliance checks`,
        `Ringkas ${doc.code} (${doc.title}) dan pemeriksaan kepatuhan yang diwajibkannya. Jawab dalam bahasa Indonesia.`
      )
    );
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
    const { syncedToBackend } = await addKnowledgeDoc({
      doc_code: code,
      title: docTitle.trim(),
      clause,
      keywords,
      excerpt: docExcerpt.trim(),
    });
    setDocCode("");
    setDocTitle("");
    setDocClause("");
    setDocKeywords("");
    setDocExcerpt("");
    setShowAddForm(false);
    showToast(
      syncedToBackend
        ? t(`Indexed ${code} into live Copilot RAG knowledge base`, `${code} diindeks ke basis pengetahuan RAG Copilot`)
        : t(`Indexed ${code} into local Copilot SOP index (backend offline)`, `${code} diindeks ke indeks SOP lokal Copilot (backend offline)`)
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("SOP knowledge", "Pengetahuan SOP")}
        description={t(
          "Standard operating procedures the copilot cites, clause by clause, and supervisors check before they sign off",
          "Prosedur operasi standar yang dikutip copilot klausul demi klausul, dan diperiksa supervisor sebelum mengesahkan"
        )}
        actions={
          <Button variant={showAddForm ? "secondary" : "primary"} onClick={() => setShowAddForm((prev) => !prev)}>
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? t("Cancel", "Batal") : t("Add SOP clause", "Tambah klausul SOP")}
          </Button>
        }
      />

      <SopUpload />

      {showAddForm && (
        <form
          onSubmit={handleAddSop}
          className="bg-white rounded-xl border border-rule p-5 space-y-3"
        >
          <div className="text-xs font-semibold text-ink">
            {t("Index New SOP Document (Live Copilot RAG)", "Indeks Dokumen SOP Baru (RAG Copilot)")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={docCode}
              onChange={(e) => setDocCode(e.target.value)}
              placeholder={t("SOP Code (e.g. SOP-QA-15)", "Kode SOP (mis. SOP-QA-15)")}
              className="px-3 py-2 border border-rule-strong rounded-lg text-xs"
            />
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder={t("Title (e.g. NDT Inspection Protocol)", "Judul (mis. Protokol Inspeksi NDT)")}
              className="px-3 py-2 border border-rule-strong rounded-lg text-xs"
            />
            <input
              type="text"
              value={docClause}
              onChange={(e) => setDocClause(e.target.value)}
              placeholder={t("Clause (e.g. Clause 2.1: Rejection)", "Klausul (mis. Klausul 2.1: Penolakan)")}
              className="px-3 py-2 border border-rule-strong rounded-lg text-xs"
            />
          </div>
          <input
            type="text"
            value={docKeywords}
            onChange={(e) => setDocKeywords(e.target.value)}
            placeholder={t("Keywords (comma-separated, e.g. ultrasonic, porosity, casting)", "Kata kunci (pisahkan dengan koma, mis. ultrasonik, porositas, cor)")}
            className="w-full px-3 py-2 border border-rule-strong rounded-lg text-xs"
          />
          <textarea
            required
            rows={2}
            value={docExcerpt}
            onChange={(e) => setDocExcerpt(e.target.value)}
            placeholder={t("Procedure text cited by Copilot...", "Teks prosedur yang dikutip Copilot...")}
            className="w-full px-3 py-2 border border-rule-strong rounded-lg text-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-stamp hover:bg-stamp-deep text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            {t("Save & Index SOP", "Simpan & Indeks SOP")}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {knowledgeDocs.map((doc) => (
          <div
            key={doc.id}

            className="bg-white rounded-xl border border-rule p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-stamp-wash text-stamp border border-stamp-line">
                  {t(doc.category)}
                </span>
                <span className="font-mono-numbers text-xs font-medium text-ink-3">
                  {doc.code}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-ink mb-2">
                {doc.title}
              </h3>

              <p className="text-xs text-ink-2 leading-relaxed mb-4">{doc.summary}</p>
            </div>

            <div className="pt-3 border-t border-rule-soft flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-xs text-ink-3">
                {t(`${doc.sections.length} indexed clauses`, `${doc.sections.length} klausul terindeks`)}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAskCopilot(doc)}
                  className="inline-flex items-center gap-1 whitespace-nowrap py-2 text-xs font-medium text-ink-2 hover:text-stamp cursor-pointer"
                >
                  <MessageSquareText className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>{t("Ask Copilot", "Tanya Copilot")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenDoc(doc)}
                  className="inline-flex items-center gap-1 whitespace-nowrap py-2 text-xs font-semibold text-stamp hover:text-stamp-deep hover:underline cursor-pointer"
                >
                  <span>{t("Inspect Clauses", "Periksa Klausul")}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeDoc && (
        <div
          className="fixed inset-0 bg-paper/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sop-modal-title"
        >
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-rule overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-rule flex items-start justify-between gap-4 bg-paper">
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-stamp-wash text-stamp border border-stamp-line inline-block mb-1 font-mono-numbers">
                  {activeDoc.code}
                </span>
                <h2 id="sop-modal-title" className="text-base font-semibold text-ink">
                  {activeDoc.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-ink-3 hover:text-ink hover:bg-rule rounded-lg transition-colors cursor-pointer"
                aria-label={t("Close SOP modal", "Tutup jendela SOP")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="text-xs text-ink-2">{activeDoc.summary}</div>

              <div className="space-y-3 pt-2">
                {activeDoc.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-paper border border-rule space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-stamp">
                      <Bookmark className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>{sec.clause}</span>
                    </div>
                    <p className="text-xs text-ink-2 leading-relaxed">{sec.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-paper border-t border-rule flex flex-wrap items-center justify-between gap-3 text-xs text-ink-3">
              <span>{t("Indexed for Grounded RAG Traceability", "Diindeks untuk penelusuran RAG berbasis sumber")}</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => handleAskCopilot(activeDoc)}>
                  <MessageSquareText className="h-3.5 w-3.5" strokeWidth={1.6} />
                  {t("Ask Copilot", "Tanya Copilot")}
                </Button>
                <Button onClick={handleCloseModal}>
                  {t("Close Inspection", "Tutup Inspeksi")}
                </Button>
              </div>
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
