"""Grounded SOP copilot: retrieval over the knowledge index with optional Gemini synthesis.
"""

import json
import math
import os
import re
import urllib.request
from typing import Any, Dict, List, Optional

import database
from app import state
from app.config import DEFAULT_PROJECT_NAME
from app.services.insights import CATEGORY_ROUTING, _infer_task_category


def _tokenize(text: str) -> List[str]:
    return [tok for tok in re.findall(r"[a-z0-9\-]{2,}", text.lower()) if tok]


def _run_grounded_copilot(message: str, role: str) -> Dict[str, Any]:
    """Live grounded retrieval over SQLite SOPs, active WBS tasks, and live IRoom records."""
    sops = database.get_sops()
    tasks = state.ACTIVE_ANALYSIS.get("tasks", [])
    materials = database.get_stream("materials")
    operations = database.get_stream("operations")
    drawings = database.get_stream("drawings")

    q_lower = message.lower().strip()
    q_tokens = set(_tokenize(message))

    # Build IDF across SOP corpus for token weighting
    n_docs = max(1, len(sops))
    doc_freq: Dict[str, int] = {}
    doc_token_sets: List[set[str]] = []
    for doc in sops:
        tokens = set(_tokenize(f"{doc['doc_code']} {doc['title']} {doc['clause']} {doc['excerpt']} {' '.join(doc['keywords'])}"))
        doc_token_sets.append(tokens)
        for tok in tokens:
            doc_freq[tok] = doc_freq.get(tok, 0) + 1

    scored_docs: List[tuple[float, Dict[str, Any]]] = []
    for doc, tokens in zip(sops, doc_token_sets):
        score = 0.0
        if doc["doc_code"].lower() in q_lower:
            score += 5.0
        for kw in doc.get("keywords", []):
            kw_low = kw.lower()
            if kw_low in q_lower:
                score += 1.5
        for tok in q_tokens:
            if tok in tokens:
                idf = math.log(1.0 + n_docs / max(1, doc_freq.get(tok, 1)))
                score += 0.8 * idf
        if score > 0:
            scored_docs.append((score, doc))

    scored_docs.sort(key=lambda item: item[0], reverse=True)
    matched_sops = [doc for _, doc in scored_docs]

    # Match WBS tasks explicitly referenced in query
    matched_tasks = [
        t for t in tasks
        if t["code"].lower() in q_lower
        or any(tok in f"{t['task']} {t.get('work_center', '')} {t.get('owner', '')}".lower() for tok in q_tokens)
    ]
    if not matched_tasks:
        matched_tasks = sorted(tasks, key=lambda t: float(t.get("delay_risk", 0)), reverse=True)[:2]

    # Match IRoom telemetry rows relevant to query
    matched_materials = [
        m for m in materials
        if any(tok in f"{m.get('partNumber', '')} {m.get('description', '')} {m.get('openPo', '')}".lower() for tok in q_tokens)
        or float(m.get("stockCoverHours", 999)) <= 48
    ][:1]
    matched_ops = [
        o for o in operations
        if any(tok in f"{o.get('workCenter', '')} {o.get('machineId', '')} {o.get('vibrationSensor', '')}".lower() for tok in q_tokens)
        or str(o.get("vibrationSensor", "NORMAL")).upper() != "NORMAL"
    ][:1]
    matched_dwgs = [
        d for d in drawings
        if any(tok in f"{d.get('dwgNumber', '')} {d.get('title', '')}".lower() for tok in q_tokens)
        or (d.get("criticalDwg") and "approved" not in str(d.get("status", "")).lower())
    ][:1]

    parts: List[str] = []
    if matched_tasks:
        t_summary = "; ".join(
            (
                f"{t['code']} ({t['task']}): {float(t['delay_risk']):.0%} delay risk, "
                f"+{float(t['expected_slip_days']):.1f}d expected slip"
                + (f" [{', '.join(d['label'] for d in t.get('drivers', [])[:2])}]" if t.get("drivers") else "")
            )
            for t in matched_tasks[:2]
        )
        parts.append(
            f"Live schedule ({state.ACTIVE_ANALYSIS.get('project_name', DEFAULT_PROJECT_NAME)}): {t_summary}. "
            f"Monte Carlo CPM slippage is {state.ACTIVE_ANALYSIS.get('overall_delay_probability', 0):.1f}% "
            f"(P50 +{state.ACTIVE_ANALYSIS.get('estimated_project_slippage_days', 0):.1f}d, "
            f"P80 +{state.ACTIVE_ANALYSIS.get('p80_slippage_days', 0):.1f}d)."
        )

    iroom_notes: List[str] = []
    for m in matched_materials:
        iroom_notes.append(
            f"{m.get('partNumber')} stock cover {int(m.get('stockCoverHours', 0))}h ({m.get('status')}, PO {m.get('openPo')})"
        )
    for o in matched_ops:
        iroom_notes.append(
            f"{o.get('machineId')} vibration={o.get('vibrationSensor')} (OEE {o.get('oeePercent')}%)"
        )
    for d in matched_dwgs:
        iroom_notes.append(f"{d.get('dwgNumber')} status={d.get('status')}")
    if iroom_notes:
        parts.append(f"Live IRoom telemetry ({role} view): {'; '.join(iroom_notes)}.")

    citations: List[Dict[str, Any]] = []
    if matched_sops:
        lead = matched_sops[0]
        parts.append(f"SOP {lead['doc_code']} ({lead['clause']}): {lead['excerpt']}")
        citations = [
            {
                "doc_code": d["doc_code"],
                "clause": d["clause"],
                "title": d["title"],
                "excerpt": d["excerpt"],
            }
            for d in matched_sops[:2]
        ]
        confidence = 0.94
    elif sops:
        # Ensure citations stay grounded in live SOP store using category of highest-risk task
        lead_cat = _infer_task_category(matched_tasks[0]) if matched_tasks else "other"
        _, target_code, _ = CATEGORY_ROUTING.get(lead_cat, CATEGORY_ROUTING["other"])
        fallback_sop = next((d for d in sops if d["doc_code"] == target_code), sops[0])
        parts.append(f"Relevant SOP ({fallback_sop['doc_code']} - {fallback_sop['clause']}): {fallback_sop['excerpt']}")
        citations = [
            {
                "doc_code": fallback_sop["doc_code"],
                "clause": fallback_sop["clause"],
                "title": fallback_sop["title"],
                "excerpt": fallback_sop["excerpt"],
            }
        ]
        confidence = 0.89
    else:
        confidence = 0.82

    deterministic_reply = " ".join(parts)
    llm_reply = _synthesize_with_gemini(message, role, deterministic_reply, citations)
    reply = llm_reply or deterministic_reply

    return {
        "success": True,
        "reply": reply,
        "citations": citations,
        "confidence": confidence,
        "is_grounded": True,
        "llm_enhanced": bool(llm_reply),
        "source_documents_indexed": len(sops),
    }


def _synthesize_with_gemini(
    question: str,
    role: str,
    facts_context: str,
    citations: List[Dict[str, Any]],
) -> Optional[str]:
    """Use Gemini 2.5 Flash for natural answers grounded in retrieved telemetry and SOPs."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None
    sop_lines = "\n".join(
        f"- {c['doc_code']} ({c['clause']}): {c.get('excerpt', '')}" for c in citations
    )
    prompt = (
        f"You are MDIP Manufacturing Copilot advising the {role}. "
        "Answer in concise plain language matching the user's language (English or Indonesian), "
        "using ONLY these verified plant metrics and SOP clauses—never invent numbers or SOP codes:\n\n"
        f"Live Telemetry & Schedule:\n{facts_context}\n\n"
        f"Verified SOP Excerpts:\n{sop_lines}\n\n"
        f"User Question: {question}"
    )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        f"?key={urllib.parse.quote(api_key)}"
    )
    payload = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        return text or None
    except Exception:
        return None
