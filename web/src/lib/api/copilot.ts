/** Copilot status and chat, and the SOP knowledge base. */

import { KNOWLEDGE_DOCS } from "@/lib/mock-data";
import { ManufacturingRole, KnowledgeDoc, CopilotStatus } from "@/types";
import { fetchFirestoreSops, saveFirestoreSop } from "@/lib/firestore";
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

  if (scoredDocs.length > 0) {
    const { doc } = scoredDocs[0];
    const sectionLines = doc.sections.map((s) => `- **${s.clause}**: ${s.content}`);
    return {
      success: true,
      reply: `Grounded guidance from **${doc.code} (${doc.title})** for ${activeRole}:\n\n${sectionLines.join("\n")}`,
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

  if (qLower.includes("wbs") || qLower.includes("delay") || qLower.includes("cnc") || qLower.includes("slip")) {
    return {
      success: true,
      reply: `CPM & Schedule Analysis (${activeRole} view):\n\n- **WBS-1.2 (Raw Material Procurement)**: 85% risk score (+2d variance); verify INGOT-AL7075-T6 air-freight authorization (**SOP-SCM-12**).\n- **WBS-3.1 (Cell 02 Sub-Assembly)**: 79% risk score (+2d variance); evaluate operator shift transfer (**SOP-LINE2-OPT**).`,
      citations: [
        {
          doc_code: "SOP-SCM-12",
          clause: "Clause 2.1: Buffer Inventory Warning",
          title: "Critical Component Shortage & Express Procurement",
          excerpt: "When buffer stock falls below 48 hours and supplier lead time exceeds 48 hours, trigger express air freight."
        },
        {
          doc_code: "SOP-LINE2-OPT",
          clause: "Clause 1.4: Throughput Variance Trigger",
          title: "Assembly Cell Line Balancing & Operator Reallocation",
          excerpt: "If cell attainment falls below 90% of shift target for >2h, transfer one cross-trained operator."
        }
      ],
      confidence: 0.91,
      is_grounded: true,
      llm_enhanced: false,
      model: null,
      llm_error: null,
      source_documents_indexed: localDocs.length,
    };
  }

  return {
    success: true,
    reply: `Top operational priorities for ${activeRole}:\n\n- Mitigate **INGOT-AL7075-T6** stock cover (36h left vs 3-day vendor lead time) per **SOP-SCM-12**.\n- Inspect **Press P-07** hydraulic seal before next stamping cycle (+18% vibration vs nominal baseline) per **SOP-PRS-04**.\n- Rebalance **Cell 02** shift staffing to recover output under **SOP-LINE2-OPT**.`,
    citations: [
      {
        doc_code: "SOP-SCM-12",
        clause: "Clause 5.3: Commercial Penalty Protection",
        title: "Critical Component Shortage & Express Procurement",
        excerpt: "Expedited shipping up to Rp 25,000,000 is pre-approved when mitigating penalties exceeding Rp 100,000,000."
      },
      {
        doc_code: "SOP-PRS-04",
        clause: "Clause 3.2: Vibration Thresholds",
        title: "Hydraulic Stamping & Press P-07 Operating Protocol",
        excerpt: "If vibration index exceeds baseline by >15%, condition inspection of seals and bearings is mandatory."
      }
    ],
    confidence: 0.94,
    is_grounded: true,
    llm_enhanced: false,
    model: null,
    llm_error: null,
    source_documents_indexed: localDocs.length,
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

  const firestoreDocs = await fetchFirestoreSops();
  if (firestoreDocs.length === 0) return base;
  const seen = new Set(firestoreDocs.map((d) => d.code.toUpperCase()));
  return [...firestoreDocs, ...base.filter((d) => !seen.has(d.code.toUpperCase()))];
}

export async function ingestKnowledgeDoc(payload: {
  doc_code: string;
  title: string;
  clause: string;
  keywords: string[];
  excerpt: string;
}): Promise<{ success: boolean; total_documents?: number } | null> {
  const savedToFirestore = await saveFirestoreSop(payload);
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
  return savedToFirestore ? { success: true } : null;
}
