"use client";

import React, { useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FileDrop } from "@/components/ui/FileDrop";
import { extractSopFile, type SopDraft } from "@/lib/api";
import { useDashboard } from "@/features/workspace/dashboard-context";
import { useT } from "@/lib/i18n";

const MAX_BYTES = 4 * 1024 * 1024;
const field = "w-full rounded-md border border-rule-strong bg-white px-3 py-2 text-sm text-ink";

/** Upload an SOP file, review the clauses MDIP read from it, then save them for Copilot to cite. */
export function SopUpload() {
  const { saveSopClauses, showToast } = useDashboard();
  const t = useT();
  const [draft, setDraft] = useState<SopDraft | null>(null);
  const [keywords, setKeywords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const next = await extractSopFile(file);
      setDraft(next);
      setKeywords(next.keywords.join(", "));
    } catch (e) {
      setError(e instanceof Error ? e.message : t(`Could not read ${file.name}.`, `Tidak dapat membaca ${file.name}.`));
    } finally {
      setBusy(false);
    }
  };

  const update = (patch: Partial<SopDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setSection = (i: number, patch: Partial<SopDraft["sections"][number]>) =>
    update({ sections: draft!.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const save = async () => {
    if (!draft) return;
    const code = draft.doc_code.trim().toUpperCase();
    const title = draft.title.trim();
    const rows = draft.sections
      .filter((s) => s.clause.trim() && s.content.trim())
      .map((s) => ({
        doc_code: code,
        title,
        clause: s.clause.trim(),
        keywords: keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 20),
        excerpt: s.content.trim().slice(0, 4000),
      }));
    if (!code || !title || rows.length === 0) {
      setError(t("Give the SOP a code, a title and at least one clause with text.", "Beri SOP sebuah kode, judul, dan minimal satu klausul berisi teks."));
      return;
    }
    setBusy(true);
    try {
      if (!(await saveSopClauses(rows))) throw new Error();
      showToast(t(`Saved ${rows.length} clauses of ${code}; Copilot can cite them now`, `${rows.length} klausul ${code} tersimpan; Copilot kini bisa mengutipnya`));
      setDraft(null);
    } catch {
      setError(t("Could not save the clauses. Check your connection and try again.", "Klausul tidak dapat disimpan. Periksa koneksi Anda lalu coba lagi."));
    } finally {
      setBusy(false);
    }
  };

  if (!draft) {
    return (
      <FileDrop accept=".pdf,.docx,.rtf,.txt,.md" maxBytes={MAX_BYTES} disabled={busy} onFile={read} onReject={setError}>
        {(open) => (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-rule-strong bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-ink">{t("Upload an SOP document", "Unggah dokumen SOP")}</p>
                <p className="text-xs text-ink-3">
                  {t(
                    "Drop a PDF, Word, RTF or text file here (up to 4 MB). You review every clause before it is saved.",
                    "Letakkan file PDF, Word, RTF, atau teks di sini (maks. 4 MB). Anda meninjau setiap klausul sebelum disimpan."
                  )}
                </p>
                {error && <p role="alert" className="mt-1.5 text-xs text-hold">{error}</p>}
              </div>
            </div>
            <Button onClick={open} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" strokeWidth={1.75} />}
              {busy ? t("Reading…", "Membaca…") : t("Choose file", "Pilih file")}
            </Button>
          </div>
        )}
      </FileDrop>
    );
  }

  return (
    <section aria-label={t("Review uploaded SOP", "Tinjau SOP yang diunggah")} className="space-y-3 rounded-xl border border-stamp-line bg-white p-5">
      <p className="text-xs text-ink-3">
        {t(`Read ${draft.sections.length} clauses from`, `Terbaca ${draft.sections.length} klausul dari`)}{" "}
        <span className="font-medium text-ink-2">{draft.filename}</span>.{" "}
        {t("Check them, fix anything that was read wrong, then save.", "Periksa, perbaiki yang salah terbaca, lalu simpan.")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs text-ink-2">
          {t("SOP code", "Kode SOP")}
          <input className={`${field} mt-1 font-mono-numbers`} value={draft.doc_code} onChange={(e) => update({ doc_code: e.target.value })} />
        </label>
        <label className="text-xs text-ink-2 sm:col-span-2">
          {t("Title", "Judul")}
          <input className={`${field} mt-1`} value={draft.title} onChange={(e) => update({ title: e.target.value })} />
        </label>
      </div>
      <label className="block text-xs text-ink-2">
        {t("Keywords (comma-separated)", "Kata kunci (pisahkan dengan koma)")}
        <input className={`${field} mt-1`} value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      </label>
      <ol className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {draft.sections.map((s, i) => (
          <li key={i} className="space-y-1.5 rounded-lg border border-rule bg-sheet p-3">
            <div className="flex items-center gap-2">
              <input
                aria-label={t(`Clause ${i + 1} name`, `Nama klausul ${i + 1}`)}
                className={`${field} py-1.5 text-xs font-medium`}
                value={s.clause}
                onChange={(e) => setSection(i, { clause: e.target.value })}
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label={t(`Remove ${s.clause}`, `Hapus ${s.clause}`)}
                onClick={() => update({ sections: draft.sections.filter((_, j) => j !== i) })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <textarea
              aria-label={t(`Clause ${i + 1} text`, `Teks klausul ${i + 1}`)}
              rows={3}
              className={`${field} text-xs`}
              value={s.content}
              onChange={(e) => setSection(i, { content: e.target.value })}
            />
          </li>
        ))}
      </ol>
      {error && <p role="alert" className="text-xs text-hold">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t(`Save ${draft.sections.length} clauses`, `Simpan ${draft.sections.length} klausul`)}
        </Button>
        <Button variant="secondary" onClick={() => { setDraft(null); setError(null); }} disabled={busy}>
          {t("Discard", "Buang")}
        </Button>
      </div>
    </section>
  );
}
