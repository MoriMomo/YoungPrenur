"""Pydantic request models for the MDIP API.
"""

from typing import List, Optional

from pydantic import BaseModel


class TaskItem(BaseModel):
    task_id: str
    name: str
    planned_days: int
    upstream_slip_days: int
    external_vendor: bool
    actual_days: Optional[int] = None
    float_days: Optional[int] = 0
    work_center: Optional[str] = ""
    resource_utilization: Optional[float] = None
    drawing_revisions: Optional[int] = 0


class CopilotHistoryItem(BaseModel):
    role: str
    text: str


class CopilotQuery(BaseModel):
    question: Optional[str] = None
    message: Optional[str] = None
    role: Optional[str] = "Operations Manager"
    active_role: Optional[str] = None
    context_module: Optional[str] = None
    history: List[CopilotHistoryItem] = []


class FlagActionPayload(BaseModel):
    action_id: str
    reviewer_role: Optional[str] = "Operations Manager"
    decision: Optional[str] = "AUTHORIZED"
    notes: Optional[str] = ""


class SopDocumentPayload(BaseModel):
    doc_code: str
    title: str
    clause: str
    keywords: List[str] = []
    excerpt: str


class RegisterPayload(BaseModel):
    email: str
    password: str
    name: str
    role: str = "Operations Manager"


class LoginPayload(BaseModel):
    email: str
    password: str


class GoogleAuthPayload(BaseModel):
    id_token: str
    role: str = "Operations Manager"
