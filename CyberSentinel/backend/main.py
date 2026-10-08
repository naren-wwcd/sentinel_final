import os, json
from collections import Counter
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, rows, one, jl, get_setting, set_setting, now
import simulator, ai_agent, response_engine, risk_engine, rpa, audit
from schemas import SimStart, ExecuteRequest, Decision, SettingsUpdate

def _load_env():
    for d in (os.path.dirname(os.path.abspath(__file__)), os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")):
        f = os.path.join(d, ".env")
        if os.path.exists(f):
            for line in open(f):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"'))
_load_env()

app = FastAPI(title="CyberSentinel API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    init_db()
    if not one("SELECT id FROM events LIMIT 1"):
        simulator.seed_background()

def _inc(i):
    for k in ("risk_breakdown", "mitre"): i[k] = jl(i.get(k), [])
    return i

def _need_inc(iid):
    i = one("SELECT * FROM incidents WHERE id=?", (iid,))
    if not i: raise HTTPException(404, "Incident not found")
    return _inc(i)

def _events(sql, a=()):
    out = rows(sql, a)
    for e in out: e["details"] = jl(e["details"], {})
    return out

@app.get("/api/health")
def health():
    return {"status": "ok", "time": now(), "ai_provider": ai_agent.provider_name(), "rpa_mode": rpa.mode(),
            "pending_approvals": one("SELECT COUNT(*) n FROM approvals WHERE status='pending'")["n"],
            "simulation_running": simulator.STATUS["running"]}

@app.get("/api/events")
def events(limit: int = 300, user: str = None):
    if user: return _events("SELECT * FROM events WHERE username=? ORDER BY ts DESC,id DESC LIMIT ?", (user, limit))
    return _events("SELECT * FROM events ORDER BY ts DESC,id DESC LIMIT ?", (limit,))

@app.get("/api/alerts")
def alerts():
    out = rows("SELECT * FROM alerts ORDER BY ts DESC,id DESC")
    for a in out: a["meta"] = jl(a["meta"], {})
    return out

@app.get("/api/incidents")
def incidents():
    return [_inc(i) for i in rows("SELECT * FROM incidents ORDER BY created_at DESC")]

@app.get("/api/incidents/{iid}")
def incident(iid: str):
    inc = _need_inc(iid)
    al = rows("SELECT * FROM alerts WHERE incident_id=? ORDER BY ts,id", (iid,))
    for a in al: a["meta"] = jl(a["meta"], {})
    ev = _events("SELECT e.* FROM events e JOIN evidence v ON v.event_id=e.id WHERE v.incident_id=? ORDER BY e.ts,e.id", (iid,))
    return {"incident": inc, "alerts": al, "events": ev, "mitre": inc["mitre"],
            "risk": {"score": inc["risk_score"], "level": inc["risk_level"], "breakdown": inc["risk_breakdown"]},
            "investigation": ai_agent.get_investigation(iid),
            "responses": [response_engine._hydrate(r) for r in rows("SELECT * FROM responses WHERE incident_id=? ORDER BY id", (iid,))],
            "approvals": rows("SELECT * FROM approvals WHERE incident_id=? ORDER BY id", (iid,)),
            "audit": audit.list_logs(200, iid)}

@app.post("/api/simulation/start")
def sim_start(body: SimStart = SimStart()):
    try: simulator.start(body.speed, body.include_optional)
    except RuntimeError as e: raise HTTPException(409, str(e))
    return simulator.status()

@app.get("/api/simulation/status")
def sim_status(): return simulator.status()

@app.post("/api/simulation/reset")
def sim_reset():
    if simulator.STATUS["running"]: raise HTTPException(409, "simulation running")
    simulator.reset_all(); simulator.STATUS.update(state="idle", steps=[], incident_id=None, message="")
    audit.log("analyst", "Demo data reset", "system", "SUCCESS", "")
    return {"status": "reset"}

@app.post("/api/investigate/{iid}")
def investigate(iid: str):
    _need_inc(iid)
    inv = ai_agent.investigate(iid)
    response_engine.recommend(iid); auto = response_engine.auto_execute_safe(iid); ap = response_engine.request_high_impact_approvals(iid)
    response_engine.refresh_status(iid)
    return {**inv, "auto_executed": auto, "approvals_requested": ap}

@app.get("/api/investigation/{iid}")
def investigation(iid: str):
    _need_inc(iid)
    return ai_agent.get_investigation(iid) or {"incident_id": iid, "result": None, "tool_calls": []}

@app.get("/api/risk/{iid}")
def risk(iid: str):
    i = _need_inc(iid)
    return {"incident_id": iid, "score": i["risk_score"], "level": i["risk_level"], "breakdown": i["risk_breakdown"],
            "scale": "0-29 LOW, 30-59 MEDIUM, 60-79 HIGH, 80-100 CRITICAL", "method": "deterministic rules (no LLM)"}

@app.get("/api/responses")
def responses():
    return [response_engine._hydrate(r) for r in rows("SELECT * FROM responses ORDER BY created_at DESC, id DESC")]

@app.post("/api/responses/{rid}/execute")
def execute(rid: str, body: ExecuteRequest = ExecuteRequest()):
    try: return response_engine.execute(rid, body.actor)
    except LookupError as e: raise HTTPException(404, str(e))
    except ValueError as e: raise HTTPException(409, str(e))

@app.get("/api/approvals")
def approvals(status: str = None):
    if status: return rows("SELECT * FROM approvals WHERE status=? ORDER BY requested_at DESC", (status,))
    return rows("SELECT * FROM approvals ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, requested_at DESC")

def _decide(aid, ok, body):
    try: return response_engine.decide(aid, ok, body.actor, body.note or "")
    except LookupError as e: raise HTTPException(404, str(e))
    except ValueError as e: raise HTTPException(409, str(e))

@app.post("/api/approvals/{aid}/approve")
def approve(aid: str, body: Decision = Decision()): return _decide(aid, True, body)

@app.post("/api/approvals/{aid}/reject")
def reject(aid: str, body: Decision = Decision()): return _decide(aid, False, body)

@app.get("/api/audit")
def audit_logs(limit: int = 500): return audit.list_logs(limit)

@app.get("/api/settings")
def settings():
    try: one("SELECT 1 x"); db = "connected"
    except Exception: db = "error"
    return {"ai_provider": ai_agent.provider_name(), "automation_mode": get_setting("automation_mode"), "simulation_mode": "Enabled",
            "rpa_mode": rpa.mode(), "api_status": "online", "database_status": db, "threat_intel": "Simulated (demo data)"}

@app.post("/api/settings")
def update_settings(body: SettingsUpdate):
    if body.automation_mode:
        if body.automation_mode not in ("safe_auto", "manual"): raise HTTPException(422, "invalid automation_mode")
        set_setting("automation_mode", body.automation_mode)
        audit.log("analyst", "Setting changed", "automation_mode", "SUCCESS", body.automation_mode)
    return settings()

@app.get("/api/dashboard")
def dashboard():
    incs = [_inc(i) for i in rows("SELECT * FROM incidents ORDER BY created_at DESC")]
    evs = _events("SELECT * FROM events ORDER BY ts DESC,id DESC")
    als = rows("SELECT * FROM alerts ORDER BY ts,id")
    active = [i for i in incs if i["status"] not in ("Resolved", "Closed")]
    today = datetime.now(timezone.utc).date().isoformat()
    cards = {"active_incidents": len(active), "critical_incidents": sum(1 for i in active if i["risk_level"] == "CRITICAL"),
             "events_today": sum(1 for e in evs if e["ts"][:10] == today),
             "high_risk_users": len({i["username"] for i in active if i["risk_score"] >= 60}),
             "automated_responses": one("SELECT COUNT(*) n FROM responses WHERE status='executed'")["n"],
             "pending_approvals": one("SELECT COUNT(*) n FROM approvals WHERE status='pending'")["n"]}
    end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    buckets = {(end - timedelta(hours=h)).strftime("%H:00"): 0 for h in range(12, -1, -1)}
    for e in evs:
        k = datetime.fromisoformat(e["ts"]).strftime("%H:00")
        if k in buckets: buckets[k] += 1
    trend, cum, seen = [], 0, set()
    pts = {t: p for t, p, _ in [(f[0], f[1], f[2]) for f in risk_engine.FACTORS]}
    if incs:
        for a in [a for a in als if a["incident_id"] == incs[0]["id"]]:
            if a["type"] in pts and a["type"] not in seen:
                seen.add(a["type"]); cum = min(100, cum + pts[a["type"]])
                trend.append({"t": a["ts"][11:19], "score": cum, "label": a["type"]})
    return {"cards": cards,
            "charts": {"events_over_time": [{"t": k, "count": v} for k, v in buckets.items()],
                       "severity": [{"name": k, "value": v} for k, v in Counter(a["severity"] for a in als).items()],
                       "attack_types": [{"name": k.replace("_", " "), "value": v} for k, v in Counter(a["type"] for a in als).items()],
                       "risk_trend": trend},
            "live_events": evs[:15], "incidents": incs[:10], "simulation": simulator.status(), "ai_provider": ai_agent.provider_name()}
