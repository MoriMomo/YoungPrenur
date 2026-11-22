"""
MDIP backend entrypoint: creates the FastAPI app and mounts the routers in app/api/.
Run with:  uvicorn main:app --reload --port 8000   (from backend/)

Access: auth, system and public routers are open; every other router requires a signed-in
user (see app/security.py). Retraining additionally requires the admin key.
"""

import logging
import os
import sys

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import database  # noqa: E402
from app.api import auth, dashboard, files, iroom, knowledge, legacy, ml, public, risks, scheduler, system  # noqa: E402
from app.security import cors_origins, require_user  # noqa: E402

logging.basicConfig(
    level=os.environ.get("MDIP_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
database.assert_auth_configured()

app = FastAPI(
    title="MDIP Manufacturing Decision Intelligence Platform API",
    description=(
        "Backend API serving SQLite-persisted IRoom System Connectors, CPM Scheduler, "
        "XGBoost Delay-Risk + SHAP + Monte Carlo Engine, and Grounded Copilot RAG."
    ),
    version="1.3.0",
)

# Bearer tokens travel in the Authorization header, so no cookies or credentials are needed cross-origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Key", "X-MDIP-Deployment", "X-MDIP-Role"],
)

# Open: sign-in, health, the public model card and the anonymous schedule inspection preview.
for _module in (auth, system, public):
    app.include_router(_module.router)

# Signed-in users only.
for _module in (legacy, iroom, dashboard, scheduler, risks, knowledge, files):
    app.include_router(_module.router, dependencies=[Depends(require_user)])

# Retraining keeps its own admin-key check; the model card inside it is public on purpose.
app.include_router(ml.router)
