"""Grounded SOP copilot: retrieval over the knowledge index with optional Gemini synthesis.
"""

import json
import math
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

import database
from app import state
from app.config import DEFAULT_PROJECT_NAME
from app.services.insights import CATEGORY_ROUTING, _infer_task_category


def _gemini_config() -> Tuple[str, str]:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    return api_key, model


def get_copilot_status() -> Dict[str, Any]:
    """Report active Copilot synthesis provider, model, and indexed SOP count."""
    api_key, model = _gemini_config()
    return {
        "llm_configured": bool(api_key),
        "provider": "gemini" if api_key else "retrieval",
        "model": model if api_key else None,
        "indexed_sops": len(database.get_sops()),
    }


def _tokenize(text: str) -> List[str]:
    low = text.lower()
    tokens = set(re.findall(r"[a-z0-9\-]{2,}", low))
    tokens.update(re.findall(r"[a-z0-9]{2,}", low))
    return list(tokens)


def _run_grounded_copilot(
    message: str,
    role: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Live grounded retrieval over SQLite SOPs, active WBS tasks, and live IRoom records."""
    sops = database.get_sops()
    tasks = state.ACTIVE_ANALYSIS.get("tasks", [])
    materials = database.get_stream("materials")
    operations = database.get_stream("operations")
    drawings = database.get_stream("drawings")

    q_lower = message.lower().strip()
    q_alnum = re.sub(r"[^a-z0-9]", "", q_lower)
    q_tokens = set(_tokenize(message))

    # Build IDF across SOP corpus for token weighting
    n_docs = max(1, len(sops))
    doc_freq: Dict[str, int] = {}
    doc_token_sets: List[set[str]] = []
    for doc in sops:
        tokens = set(
            _tokenize(
                f"{doc['doc_code']} {doc['title']} {doc['clause']} {doc['excerpt']} {' '.join(doc['keywords'])}"
            )
        )
        doc_token_sets.append(tokens)
        for tok in tokens:
            doc_freq[tok] = doc_freq.get(tok, 0) + 1

    scored_docs: List[tuple[float, Dict[str, Any]]] = []
    for doc, tokens in zip(sops, doc_token_sets):
        score = 0.0
        doc_code_low = doc["doc_code"].lower()
        doc_code_alnum = re.sub(r"[^a-z0-9]", "", doc_code_low)
        if doc_code_low in q_lower or (doc_code_alnum and doc_code_alnum in q_alnum):
            score += 6.0
        for kw in doc.get("keywords", []):
            kw_low = kw.lower()
            if kw_low and kw_low in q_lower:
                score += 1.5
        for tok in q_tokens:
            if tok in tokens:
                idf = math.log(1.0 + n_docs / max(1, doc_freq.get(tok, 1)))
                score += 0.8 * idf
        if score > 0:
            scored_docs.append((score, doc))

    scored_docs.sort(key=lambda item: item[0], reverse=True)
    matched_sops = [doc for _, doc in scored_docs]
    direct_sop_hit = bool(scored_docs and scored_docs[0][0] >= 3.0)

    # Match WBS tasks explicitly referenced in query
    matched_tasks = [
        t
        for t in tasks
        if t["code"].lower() in q_lower
        or any(tok in f"{t['task']} {t.get('work_center', '')} {t.get('owner', '')}".lower() for tok in q_tokens)
    ]
    if not matched_tasks:
        matched_tasks = sorted(tasks, key=lambda t: float(t.get("delay_risk", 0)), reverse=True)[:2]

    # Match IRoom telemetry rows relevant to query
    matched_materials = [
        m
        for m in materials
        if any(
            tok in f"{m.get('partNumber', '')} {m.get('description', '')} {m.get('openPo', '')}".lower()
            for tok in q_tokens
        )
        or float(m.get("stockCoverHours", 999)) <= 48
    ][:1]
    matched_ops = [
        o
        for o in operations
        if any(
            tok in f"{o.get('workCenter', '')} {o.get('machineId', '')} {o.get('vibrationSensor', '')}".lower()
            for tok in q_tokens
        )
        or str(o.get("vibrationSensor", "NORMAL")).upper() != "NORMAL"
    ][:1]
    matched_dwgs = [
        d
        for d in drawings
        if any(tok in f"{d.get('dwgNumber', '')} {d.get('title', '')}".lower() for tok in q_tokens)
        or (d.get("criticalDwg") and "approved" not in str(d.get("status", "")).lower())
    ][:1]

    context_sections: List[str] = []
    if matched_tasks:
        task_bullets = [
            f"- **{t['code']} ({t['task']})**: {float(t['delay_risk']):.0%} delay risk, +{float(t['expected_slip_days']):.1f}d expected slip"
            + (f" ({', '.join(d['label'] for d in t.get('drivers', [])[:2])})" if t.get("drivers") else "")
            for t in matched_tasks[:2]
        ]
        proj = state.ACTIVE_ANALYSIS.get("project_name", DEFAULT_PROJECT_NAME)
        prob = state.ACTIVE_ANALYSIS.get("overall_delay_probability", 0)
        p50 = state.ACTIVE_ANALYSIS.get("estimated_project_slippage_days", 0)
        p80 = state.ACTIVE_ANALYSIS.get("p80_slippage_days", 0)
        context_sections.append(
            "\n".join(
                [
                    f"**Schedule assessment ({proj})**: {prob:.1f}% delay probability (P50 +{p50:.1f}d, P80 +{p80:.1f}d).",
                    *task_bullets,
                ]
            )
        )

    iroom_bullets: List[str] = []
    for m in matched_materials:
        iroom_bullets.append(
            f"- **{m.get('partNumber')}**: {int(m.get('stockCoverHours', 0))}h stock cover ({m.get('status')}, PO {m.get('openPo')})"
        )
    for o in matched_ops:
        iroom_bullets.append(
            f"- **{o.get('machineId')}**: vibration {o.get('vibrationSensor')} (OEE {o.get('oeePercent')}%)"
        )
    for d in matched_dwgs:
        iroom_bullets.append(f"- **{d.get('dwgNumber')}**: {d.get('status')}")
    if iroom_bullets:
        context_sections.append("\n".join([f"**Shop-floor streams ({role})**:", *iroom_bullets]))

    doc_summary = str(state.ACTIVE_ANALYSIS.get("document_summary") or "").strip()
    doc_excerpt = str(state.ACTIVE_ANALYSIS.get("document_excerpt") or "").strip()
    active_filename = str(state.ACTIVE_ANALYSIS.get("filename") or "").strip()
    doc_citation: Optional[Dict[str, Any]] = None
    if (doc_summary or doc_excerpt) and active_filename:
        matched_lines = [
            ln.strip()
            for ln in doc_excerpt.splitlines()
            if ln.strip() and any(tok in ln.lower() for tok in q_tokens)
        ]
        snippet_parts: List[str] = []
        if doc_summary:
            snippet_parts.append(doc_summary)
        if matched_lines:
            snippet_parts.append("\n".join(matched_lines[:8])[:1000])
        elif doc_excerpt and (not doc_summary or doc_excerpt[:120] not in doc_summary):
            snippet_parts.append(doc_excerpt[:600])
        doc_snippet = "\n".join(part for part in snippet_parts if part).strip()

        if doc_snippet:
            context_sections.append(f"**Uploaded document ({active_filename})**:\n{doc_snippet}")
            stem = os.path.splitext(active_filename)[0].lower()
            doc_tokens = set(_tokenize(f"{doc_summary} {doc_excerpt}"))
            doc_keywords = {"pdf", "word", "docx", "doc", "uploaded", "document", "file", "schedule"}
            if (
                active_filename.lower() in q_lower
                or (len(stem) >= 3 and stem in q_lower)
                or bool(q_tokens & doc_keywords)
                or len(q_tokens & doc_tokens) >= 2
            ):
                doc_citation = {
                    "doc_code": active_filename,
                    "clause": "Uploaded Schedule Document",
                    "title": str(state.ACTIVE_ANALYSIS.get("project_name") or active_filename),
                    "excerpt": doc_snippet[:320],
                }

    sop_sections: List[str] = []
    citations: List[Dict[str, Any]] = []
    if matched_sops:
        for d in matched_sops[:2]:
            sop_sections.append(f"**SOP {d['doc_code']} ({d['clause']})**: {d['excerpt']}")
        citations = [
            {
                "doc_code": d["doc_code"],
                "clause": d["clause"],
                "title": d["title"],
                "excerpt": d["excerpt"],
            }
            for d in matched_sops[:3]
        ]
        confidence = 0.94
    elif sops:
        # Ensure citations stay grounded in live SOP store using category of highest-risk task
        lead_cat = _infer_task_category(matched_tasks[0]) if matched_tasks else "other"
        _, target_code, _ = CATEGORY_ROUTING.get(lead_cat, CATEGORY_ROUTING["other"])
        fallback_sop = next((d for d in sops if d["doc_code"] == target_code), sops[0])
        sop_sections.append(
            f"**SOP {fallback_sop['doc_code']} ({fallback_sop['clause']})**: {fallback_sop['excerpt']}"
        )
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

    if doc_citation is not None:
        citations.append(doc_citation)

    sections = (sop_sections + context_sections) if direct_sop_hit else (context_sections + sop_sections)

    deterministic_reply = "\n\n".join(sections)
    llm_reply, llm_error = _synthesize_with_gemini(
        message, role, deterministic_reply, citations, history=history
    )
    _, model = _gemini_config()
    reply = llm_reply or deterministic_reply

    return {
        "success": True,
        "reply": reply,
        "citations": citations,
        "confidence": confidence,
        "is_grounded": True,
        "llm_enhanced": bool(llm_reply),
        "model": model if llm_reply else None,
        "llm_error": llm_error,
        "source_documents_indexed": len(sops),
    }


def _synthesize_with_gemini(
    question: str,
    role: str,
    facts_context: str,
    citations: List[Dict[str, Any]],
    history: Optional[List[Dict[str, str]]] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """Use Gemini 2.5 Flash for concise Markdown answers grounded in retrieved telemetry and SOPs."""
    api_key, model = _gemini_config()
    if not api_key:
        return None, None

    sop_lines = "\n".join(
        f"- {c['doc_code']} ({c['clause']}): {c.get('excerpt', '')}" for c in citations
    )
    system_text = (
        f"You are MDIP Copilot advising the {role}. Format responses cleanly in concise Markdown: "
        "start with a direct 1-sentence answer, followed by short '- ' bullet points referencing exact "
        "WBS codes, measurements, and SOP document codes. Match the user's language (English or Indonesian). "
        "Use ONLY the provided verified plant metrics, uploaded schedule document, and SOP excerpts; never invent numbers or SOP codes."
    )

    contents: List[Dict[str, Any]] = []
    for item in (history or [])[-6:]:
        raw_text = str(item.get("text") or "").strip()
        if not raw_text:
            continue
        raw_role = str(item.get("role") or "").strip().lower()
        mapped_role = "model" if raw_role in {"copilot", "model", "assistant"} else "user"
        contents.append({"role": mapped_role, "parts": [{"text": raw_text}]})

    user_prompt = (
        f"Live Telemetry & Schedule:\n{facts_context}\n\n"
        f"Verified SOP Excerpts:\n{sop_lines or 'None'}\n\n"
        f"Question ({role}): {question}"
    )
    contents.append({"role": "user", "parts": [{"text": user_prompt}]})

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model)}:generateContent"
        f"?key={urllib.parse.quote(api_key)}"
    )
    payload = json.dumps(
        {
            "systemInstruction": {"parts": [{"text": system_text}]},
            "contents": contents,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        if not text:
            return None, "Gemini API returned an empty response"
        return text, None
    except urllib.error.HTTPError as exc:
        if exc.code in (400, 401, 403):
            return None, "Invalid GEMINI_API_KEY"
        if exc.code == 429:
            return None, "Gemini API quota or rate limit exceeded"
        return None, f"Gemini HTTP {exc.code}"
    except Exception:
        return None, "Gemini API request timed out or failed"
