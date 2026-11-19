"""
MDIP backend entrypoint: creates the FastAPI app and mounts the routers in app/api/.
Run with:  uvicorn main:app --reload --port 8000   (from backend/)
"""

import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.api import auth, system, legacy, iroom, dashboard, scheduler, risks, ml, knowledge  # noqa: E402

app = FastAPI(
    title="MDIP Manufacturing Decision Intelligence Platform API",
    description=(
        "Backend API serving SQLite-persisted IRoom System Connectors, CPM Scheduler, "
        "XGBoost Delay-Risk + SHAP + Monte Carlo Engine, and Grounded Copilot RAG."
    ),
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for _module in (auth, system, legacy, iroom, dashboard, scheduler, risks, ml, knowledge):
    app.include_router(_module.router)
