import json
from database import run, rows, now

def log(actor, action, target="", status="SUCCESS", details=""):
    if not isinstance(details, str):
        details = json.dumps(details, default=str)
    run("INSERT INTO audit_logs(ts,actor,action,target,status,details) VALUES(?,?,?,?,?,?)",
        (now(), actor, action, target, status, details))

def list_logs(limit=500, target=None):
    if target:
        return rows("SELECT * FROM audit_logs WHERE target=? OR details LIKE ? ORDER BY id DESC LIMIT ?", (target, f"%{target}%", limit))
    return rows("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
