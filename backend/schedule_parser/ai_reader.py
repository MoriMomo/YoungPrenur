"""Optional AI reader (DeepSeek / Gemini) for PDF and Word schedules (skipped in on-premises mode).
"""

import base64
import json
import logging
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

from schedule_parser.base import _build_task_dict, _parse_duration_days, _parse_pred_links, _to_bool


log = logging.getLogger("mdip.schedule_parser")


def _ai_reader_config(has_text: bool, has_pdf_bytes: bool) -> Tuple[Optional[str], str, str]:
    """Select active cloud LLM provider (DeepSeek takes precedence when selectable text exists)."""
    deepseek_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if deepseek_key and (has_text or not (has_pdf_bytes and gemini_key)):
        model = os.environ.get("DEEPSEEK_MODEL", "").strip() or "deepseek-flash"
        return "deepseek", deepseek_key, model
    if gemini_key:
        model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
        return "gemini", gemini_key, model
    return None, "", ""


def _normalize_ai_tasks(raw_tasks: List[Any]) -> List[Dict[str, Any]]:
    """Normalize structured tasks returned by DeepSeek/Gemini into the exact schema compute_cpm expects."""
    tasks: List[Dict[str, Any]] = []
    has_any_deps = any(
        isinstance(item, dict) and bool(_parse_pred_links(item.get("predecessors")))
        for item in raw_tasks
    )
    for idx, item in enumerate(raw_tasks):
        if not isinstance(item, dict):
            continue
        name = str(item.get("task") or item.get("name") or item.get("activity") or "").strip()
        planned = _parse_duration_days(item.get("planned_days"))
        if planned is None:
            planned = _parse_duration_days(item.get("planned"))
        if not name or planned is None or planned <= 0:
            continue
        actual = _parse_duration_days(item.get("actual_days"))
        if actual is None:
            actual = _parse_duration_days(item.get("actual"))
        if actual is not None and actual <= 0:
            actual = None
        code = str(item.get("code") or f"WBS-{len(tasks) + 1}").strip()
        pred_links = _parse_pred_links(item.get("predecessors"))
        critical_raw = item.get("critical")
        critical_declared = bool(critical_raw) if isinstance(critical_raw, bool) else _to_bool(critical_raw)

        tasks.append(
            _build_task_dict(
                code=code or f"WBS-{idx + 1}",
                name=name,
                planned=planned,
                actual=actual,
                work_center=str(item.get("work_center") or "").strip(),
                owner=str(item.get("owner") or "").strip(),
                pred_links=pred_links,
                has_dependency_column=has_any_deps,
                status_declared=str(item.get("status") or "").strip(),
                critical_declared=critical_declared,
            )
        )
    return tasks


def _extract_schedule_with_ai(
    filename: str,
    pdf_bytes: Optional[bytes] = None,
    text: str = "",
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Use DeepSeek (preferred) or Gemini to extract structured WBS tasks and summary from Word/PDF."""
    has_text = bool(text and text.strip())
    provider, api_key, model = _ai_reader_config(has_text=has_text, has_pdf_bytes=pdf_bytes is not None)
    if not provider or not api_key:
        return None, None

    if provider == "deepseek" and not has_text:
        return None, "DeepSeek requires selectable PDF text (this PDF appears scanned; set GEMINI_API_KEY for vision PDF reading)"

    instruction = (
        "Extract every work-breakdown / manufacturing schedule activity from this document into strict JSON "
        "matching this exact schema:\n"
        '{"project_name": "string or null", '
        '"document_summary": "3-5 sentence summary of scope, milestones, constraints, and key risks", '
        '"tasks": [{"code": "WBS-1.1", "task": "Activity name", "planned_days": 5.0, '
        '"actual_days": 5.0, "predecessors": ["WBS-1.0"], "work_center": "", '
        '"owner": "", "status": "", "critical": false}]}.\n'
        "Convert durations in weeks (1w = 5 days) or hours (8h = 1 day) to numeric days. "
        "If actual_days is omitted, set it equal to planned_days. Return JSON only."
    )

    headers = {"Content-Type": "application/json"}
    if provider == "deepseek":
        label = "DeepSeek"
        url = "https://api.deepseek.com/chat/completions"
        headers["Authorization"] = f"Bearer {api_key}"
        payload = json.dumps(
            {
                "model": model,
                "messages": [
                    {"role": "system", "content": instruction},
                    {
                        "role": "user",
                        "content": f"Filename: {filename}\n\nDocument content:\n{text[:24000]}",
                    },
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
                "thinking": {"type": "disabled"},
                "max_tokens": 4096,
            }
        ).encode("utf-8")
    else:
        label = "Gemini"
        parts: List[Dict[str, Any]] = []
        if pdf_bytes is not None:
            parts.append(
                {
                    "inline_data": {
                        "mime_type": "application/pdf",
                        "data": base64.b64encode(pdf_bytes).decode("ascii"),
                    }
                }
            )
            preview = f"\n\nExtracted text preview:\n{text[:8000]}" if has_text else ""
            parts.append({"text": f"Filename: {filename}\n\n{instruction}{preview}"})
        else:
            parts.append(
                {"text": f"Filename: {filename}\n\n{instruction}\n\nDocument content:\n{text[:24000]}"}
            )
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model)}:generateContent"
            f"?key={urllib.parse.quote(api_key)}"
        )
        payload = json.dumps(
            {
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.1,
                },
            }
        ).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if provider == "deepseek":
            raw = data["choices"][0]["message"]["content"].strip()
        else:
            raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        cleaned_json = re.sub(
            r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE
        ).strip()
        parsed = json.loads(cleaned_json)
    except urllib.error.HTTPError as exc:
        if provider == "deepseek" and exc.code == 402:
            return None, "DeepSeek API balance is insufficient"
        if provider == "deepseek" and exc.code == 401:
            return None, "Invalid DEEPSEEK_API_KEY"
        if provider == "gemini" and exc.code in (400, 401, 403):
            return None, "Invalid GEMINI_API_KEY"
        if exc.code == 429:
            return None, f"{label} API quota or rate limit exceeded"
        return None, f"{label} HTTP {exc.code}"
    except (ValueError, KeyError, IndexError, TypeError):
        return None, f"{label} returned invalid schedule JSON"
    except Exception:
        log.warning("%s document reader failed; falling back to local parsing", label, exc_info=True)
        return None, f"{label} API request timed out or failed"

    if not isinstance(parsed, dict):
        return None, f"{label} returned unexpected schedule format"

    tasks = _normalize_ai_tasks(parsed.get("tasks") or [])
    if not tasks:
        return None, f"{label} found no WBS activities with planned durations"

    proj_raw = parsed.get("project_name")
    project_name = str(proj_raw).strip() if isinstance(proj_raw, str) and proj_raw.strip() else None
    summary_raw = parsed.get("document_summary")
    document_summary = (
        str(summary_raw).strip() if isinstance(summary_raw, str) and summary_raw.strip() else None
    )
    return {
        "provider": provider,
        "project_name": project_name,
        "document_summary": document_summary,
        "tasks": tasks,
    }, None


def _extract_schedule_with_gemini(
    filename: str,
    pdf_bytes: Optional[bytes] = None,
    text: str = "",
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Backward-compatible entrypoint delegating to _extract_schedule_with_ai."""
    return _extract_schedule_with_ai(filename, pdf_bytes=pdf_bytes, text=text)
