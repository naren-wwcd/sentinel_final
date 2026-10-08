from pydantic import BaseModel
from typing import Optional

class SimStart(BaseModel):
    speed: float = 1.0
    include_optional: bool = False

class ExecuteRequest(BaseModel):
    actor: str = "analyst"

class Decision(BaseModel):
    actor: str = "analyst"
    note: Optional[str] = ""

class SettingsUpdate(BaseModel):
    automation_mode: Optional[str] = None
