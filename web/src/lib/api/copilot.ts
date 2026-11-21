/** Copilot status and chat, and the SOP knowledge base. */

import { KNOWLEDGE_DOCS } from "@/lib/mock-data";
import { ManufacturingRole, KnowledgeDoc, CopilotStatus } from "@/types";
import { API_BASE, apiFetch } from "./client";

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
        indexed_sops:
          typeof data?.indexed_sops === "number" ? data.indexed_sops : KNOWLEDGE_DOCS.length,
      };
    }
  } catch {
    // Offline fallback below
  }
  return {
    llm_configured: false,
    provider: "retrieval",
    model: null,
    indexed_sops: KNOWLEDGE_DOCS.length,
  };
}

/**
 * Queries the grounded RAG Copilot with local deterministic retrieval fallback.
 */
export async function askManufacturingCopilot(
  message: string,
  activeRole: ManufacturingRole,
  history: Array<{ role: "user" | "model"; text: string }> = [],
  localDocs: KnowledgeDoc[] = KNOWLEDGE_DOCS
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
  const qAlnum = qLower.replace(/[^a-z0-9]/g, "");
  const qTokens = Array.from(new Set(qLower.match(/[a-z0-9]{2,}/g) || []));

  const scoredDocs = localDocs
    .map((doc) => {
      let score = 0;
      const codeAlnum = doc.code.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (qLower.includes(doc.code.toLowerCase()) || (codeAlnum && qAlnum.includes(codeAlnum))) {
        score += 6;
      }
      if (
        doc.code === "SOP-ENG-02" &&
        (qLower.includes("dwg-") || qLower.includes("drawing") || qLower.includes("blueprint"))
      ) {
        score += 2;
      }
      for (const kw of doc.keywords) {
        if (kw && qLower.includes(kw.toLowerCase())) score += 2;
      }
      const haystack = `${doc.code} ${doc.title} ${doc.summary} ${doc.sections
        .map((s) => `${s.clause} ${s.content}`)
        .join(" ")}`.toLowerCase();
      for (const tok of qTokens) {
        if (haystack.includes(tok)) score += 1;
      }
      return { doc, score };
    })
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
  let base: KnowledgeDoc[] = KNOWLEDGE_DOCS;
  try {
    const res = await apiFetch(`${API_BASE}/knowledge/docs`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const rows: Array<{
        doc_code: string;
        title: string;
        clause: string;
        keywords: string[];
        excerpt: string;
      }> = await res.json();
      const extraByCode = new Map(KNOWLEDGE_DOCS.map((d) => [d.code.toUpperCase(), d]));
      base = rows.map((row) => {
        const local = extraByCode.get(row.doc_code.toUpperCase());
        if (local) {
          const hasClause = local.sections.some(
            (s) => s.clause.toLowerCase() === row.clause.toLowerCase()
          );
          const updatedSections = hasClause
            ? local.sections.map((s) =>
                s.clause.toLowerCase() === row.clause.toLowerCase()
                  ? { clause: row.clause, content: row.excerpt }
                  : s
              )
            : [{ clause: row.clause, content: row.excerpt }, ...local.sections];
          return {
            ...local,
            title: row.title || local.title,
            keywords: row.keywords.length > 0 ? row.keywords : local.keywords,
            summary: row.excerpt || local.summary,
            sections: updatedSections,
          };
        }
        return {
          id: `sop-${row.doc_code.toLowerCase()}`,
          title: row.title,
          code: row.doc_code,
          category: "Plant SOP",
          keywords: row.keywords,
          summary: row.excerpt,
          sections: [{ clause: row.clause, content: row.excerpt }],
        };
      });
    }
  } catch {
    // Offline fallback
  }

  return base;
}

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
