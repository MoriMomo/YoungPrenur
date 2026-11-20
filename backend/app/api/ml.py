"""Model card and admin-only retraining (/api/v1/ml/...).
"""

import hmac
import os
from typing import Optional

from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile

from app import state
from ml.predictor import model_card, reload_models
from ml.train import ingest_historical_schedule, train_models
from schedule_parser import ScheduleParseError

router = APIRouter()


@router.get("/api/v1/ml/model-card")
def get_model_card():
    """Training provenance, held-out metrics, and global feature importance of the delay-risk model."""
    return model_card()


def _require_admin_key(provided: Optional[str]) -> None:
    """Model retraining changes what every user sees, so it needs MDIP_ADMIN_KEY (sent as X-Admin-Key)."""
    expected = os.environ.get("MDIP_ADMIN_KEY", "")
    if not expected:
        raise HTTPException(status_code=403, detail="Retraining is disabled: set MDIP_ADMIN_KEY on the server to enable it.")
    if not provided or not hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Missing or invalid X-Admin-Key header.")


@router.post("/api/v1/ml/retrain")
async def retrain_ml_models(
    file: Optional[UploadFile] = File(None),
    project_id: Optional[str] = Query(None, description="Optional unique historical project identifier"),
    x_admin_key: Optional[str] = Header(None),
):
    """
    Ingest a COMPLETED CSV/XLSX schedule (planned vs. actual) into historical training data,
    retrain XGBoost, and hot-reload. Requires the X-Admin-Key header.
    The live (in-progress) schedule is never used as training data: its "actual" days are forecasts.
    """
    _require_admin_key(x_admin_key)
    if file is None or not file.filename:
        raise HTTPException(
            status_code=422,
            detail="Upload a completed historical schedule (CSV/XLSX with planned and actual durations) to retrain.",
        )
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Training schedule file is larger than 5 MB.")
    try:
        df_new = ingest_historical_schedule(content, file.filename, project_id=project_id)
        ingested_rows = len(df_new)
    except ScheduleParseError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not ingest training file {file.filename}: {e}")

    card = train_models()
    reload_models()
    state.re_score_all()
    return {
        "success": True,
        "ingested_tasks": ingested_rows,
        "model_card": card,
        "updated_prediction_summary": {
            "project_name": state.BASELINE_ANALYSIS.get("project_name"),
            "overall_delay_probability": state.BASELINE_ANALYSIS.get("overall_delay_probability"),
            "estimated_project_slippage_days": state.BASELINE_ANALYSIS.get("estimated_project_slippage_days"),
        },
    }
