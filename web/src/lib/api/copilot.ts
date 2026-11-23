/** Copilot status and chat, and the SOP knowledge base. */

import { ManufacturingRole, KnowledgeDoc, CopilotStatus } from "@/types";
import { API_BASE, apiFetch } from "./client";

function foldSopRows(
  rows: Array<{
    doc_code: string;
    title: string;
    clause: string;
    keywords: string[];
    excerpt: string;
  }>
): KnowledgeDoc[] {
  const docs = new Map<string, KnowledgeDoc>();
  for (const row of rows) {
    const key = row.doc_code.toUpperCase();
    const doc = docs.get(key) ?? {
      id: `sop-${row.doc_code.toLowerCase()}`,
      code: row.doc_code,
      category: "Plant SOP",
      summary: row.excerpt,
      title: row.title || row.doc_code,
      keywords: [],
      sections: [],
    };
    if (row.keywords.length > 0 && doc.keywords.length === 0) {
      doc.keywords = row.keywords;
    }
    const clause = { clause: row.clause, content: row.excerpt };
    const at = doc.sections.findIndex((s) => s.clause.toLowerCase() === row.clause.toLowerCase());
    if (at >= 0) doc.sections[at] = clause;
    else doc.sections.push(clause);
    docs.set(key, doc);
  }
  return [...docs.values()];
}

export async function fetchCopilotStatus(): Promise<CopilotStatus> {
  try {
    const res = await apiFetch(`${API_BASE}/copilot/status`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        llm_configured: Boolean(data?.llm_configured),
        provider: data?.provider === "gemini" || data?.provider === "deepseek" ? data.provider : "retrieval",
        model: typeof data?.model === "string" ? data.model : null,
        indexed_sops: typeof data?.indexed_sops === "number" ? data.indexed_sops : 0,
      };
    }
  } catch {
    // Offline fallback below
  }
  return {
    llm_configured: false,
    provider: "retrieval",
    model: null,
    indexed_sops: 0,
  };
}

/** Scores a knowledge document against lowercase query text and extracted tokens. */
export function scoreSopDocument(
  doc: KnowledgeDoc,
  queryLower: string,
  queryTokens: Iterable<string>
): number {
  let score = 0;
  const qAlnum = queryLower.replace(/[^a-z0-9]/g, "");
  const codeLower = doc.code.toLowerCase();
  const codeAlnum = codeLower.replace(/[^a-z0-9]/g, "");
  if (queryLower.includes(codeLower) || (codeAlnum && qAlnum.includes(codeAlnum))) {
    score += 6;
  }
  if (
    doc.code === "SOP-ENG-02" &&
    (queryLower.includes("dwg-") || queryLower.includes("drawing") || queryLower.includes("blueprint"))
  ) {
    score += 2;
  }
  for (const kw of doc.keywords) {
    if (kw && queryLower.includes(kw.toLowerCase())) score += 2;
  }
  const haystack = `${doc.code} ${doc.title} ${doc.summary} ${doc.sections
    .map((s) => `${s.clause} ${s.content}`)
    .join(" ")}`.toLowerCase();
  for (const tok of queryTokens) {
    if (haystack.includes(tok)) score += 1;
  }
  return score;
}

/**
 * Queries the grounded RAG Copilot with local deterministic retrieval over user-provided SOPs.
 */
export async function askManufacturingCopilot(
  message: string,
  activeRole: ManufacturingRole,
  history: Array<{ role: "user" | "model"; text: string }> = [],
  localDocs: KnowledgeDoc[] = []
) {
  try {
    const res = await apiFetch(`${API_BASE}/copilot/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        active_role: activeRole,
        history: history.slice(-6),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to grounded local SOP lookup
  }

  const qLower = message.toLowerCase();
  const qTokens = Array.from(new Set(qLower.match(/[a-z0-9]{2,}/g) || []));

  const scoredDocs = localDocs
    .map((doc) => ({ doc, score: scoreSopDocument(doc, qLower, qTokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (/\bsop\b/i.test(message) && scoredDocs.length > 0) {
    const { doc } = scoredDocs[0];
    const sectionLines = doc.sections.map((s) => `- **${s.clause}**: ${s.content}`);
    return {
      success: true,
      offline: true,
      reply: `Live schedule data is unavailable. Cached guidance from **${doc.code} (${doc.title})** for ${activeRole}:\n\n${sectionLines.join("\n")}`,
      citations: scoredDocs.slice(0, 3).map(({ doc: d }) => ({
        doc_code: d.code,
        clause: d.sections[0]?.clause || "Clause 1.0",
        title: d.title,
        excerpt: d.sections[0]?.content || d.summary,
      })),
      confidence: 0.92,
      is_grounded: true,
      llm_enhanced: false,
      model: null,
      llm_error: null,
      source_documents_indexed: localDocs.length,
    };
  }

  return {
    reply: "The live Copilot is unavailable. Reconnect and send your question again to check the current schedule.",
    citations: [],
    offline: true,
    llm_enhanced: false,
    model: null,
  };
}

export async function fetchKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  try {
    const res = await apiFetch(`${API_BASE}/knowledge/docs`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return foldSopRows(await res.json());
    }
  } catch {
    // Offline: keep blank and use only user's local custom SOPs
  }
  return [];
}

export async function loadSampleKnowledgeDocs(): Promise<KnowledgeDoc[] | null> {
  try {
    const res = await apiFetch(`${API_BASE}/knowledge/load-sample`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return foldSopRows(Array.isArray(data?.documents) ? data.documents : []);
    }
  } catch {
    // Handled by caller when backend is offline
  }
  return null;
}

export async function clearKnowledgeDocsApi(): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_BASE}/knowledge/docs`, {
      method: "DELETE",
      signal: AbortSignal.timeout(3500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface SopDraft {
  doc_code: string;
  title: string;
  keywords: string[];
  sections: { clause: string; content: string }[];
  filename: string;
  kind: string;
}

/** Reads an SOP file into a draft on the server; nothing is saved until the clauses are confirmed. */
export async function extractSopFile(file: File): Promise<SopDraft> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await apiFetch(`${API_BASE}/files/extract?purpose=sop`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof body?.detail === "string" ? body.detail : `Could not read ${file.name}.`);
  return body as SopDraft;
}

/** Saves the confirmed clauses, one row per clause. */
export async function ingestSopClauses(rows: SopRow[]): Promise<boolean> {
  const res = await apiFetch(`${API_BASE}/knowledge/ingest-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(15_000),
  });
  return res.ok;
}

type SopRow = {
  doc_code: string;
  title: string;
  clause: string;
  keywords: string[];
  excerpt: string;
};

export async function ingestKnowledgeDoc(payload: {
  doc_code: string;
  title: string;
  clause: string;
  keywords: string[];
  excerpt: string;
}): Promise<{ success: boolean; total_documents?: number } | null> {
  try {
    const res = await apiFetch(`${API_BASE}/knowledge/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline fallback
  }
  return null;
}
