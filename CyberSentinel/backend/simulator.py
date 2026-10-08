import json, os, random, threading, time
from datetime import datetime, timedelta, timezone
from database import run, rows, one, now, reset_tables
import detection, correlation, ai_agent, response_engine, audit

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "events.json")
EVENTS = {e["id"]: e for e in json.load(open(DATA))["events"]}
TIMELINE = [(0, "Normal activity"), (2, "5 failed login attempts"), (5, "Successful Netherlands login"), (8, "Privilege escalation"),
            (11, "Large data download"), (14, "Incident created"), (17, "AI investigation"), (20, "Risk score calculated"),
            (23, "Response recommendation"), (26, "Approval request")]
STATUS = {"state": "idle", "running": False, "steps": [], "incident_id": None, "speed": 1.0, "started_at": None, "message": ""}
_lock = threading.Lock()

def ingest(defn):
    run("INSERT OR REPLACE INTO events(id,ts,username,event_type,country,ip,asset,details,source) VALUES(?,?,?,?,?,?,?,?,?)",
        (defn["id"], now(), defn["username"], defn["event_type"], defn["country"], defn["ip"], defn["asset"], json.dumps(defn["details"]), "simulator"))
    return detection.run_detection(one("SELECT * FROM events WHERE id=?", (defn["id"],)))

def seed_background(seed=7):
    rnd = random.Random(seed); base = datetime.now(timezone.utc)
    prof = {"alice": ("192.168.1.30", "LAPTOP-ALICE"), "john": ("192.168.1.20", "WEB-SERVER"),
            "admin": ("192.168.1.10", "SERVER-01"), "bob": ("192.168.1.40", "DB-SERVER")}
    plan = ["alice", "alice", "alice"] + [rnd.choice(list(prof)) for _ in range(45)]
    for i, u in enumerate(plan, 1):
        ip, asset = prof[u]
        et = "login_success" if i <= 3 else rnd.choices(["login_success", "file_access", "login_failed"], [70, 20, 10])[0]
        ts = (base - timedelta(minutes=rnd.randint(95, 720))).isoformat(timespec="milliseconds")
        run("INSERT OR REPLACE INTO events(id,ts,username,event_type,country,ip,asset,details,source) VALUES(?,?,?,?,?,?,?,?,?)",
            (f"BG{i:03d}", ts, u, et, "India", ip, asset, json.dumps({"background": True}), "baseline"))

def reset_all():
    reset_tables(); seed_background()

def _sleep_until(t0, sec, speed):
    d = t0 + sec * speed - time.time()
    if d > 0: time.sleep(d)

def _step(i, status, detail=""):
    STATUS["steps"][i]["status"] = status
    if detail: STATUS["steps"][i]["detail"] = detail
    STATUS["message"] = TIMELINE[i][1]

def _play(speed, opt):
    try:
        t0 = time.time()
        def at(i): _sleep_until(t0, TIMELINE[i][0], speed); _step(i, "active")
        at(0); ingest(EVENTS["E001"]); _step(0, "done", "E001 john login_success")
        at(1)
        for e in ("E002", "E003", "E004", "E005", "E006"): ingest(EVENTS[e]); time.sleep(0.3 * speed)
        _step(1, "done", "E002–E006 brute force → alert")
        at(2); ingest(EVENTS["E007"]); _step(2, "done", "E007 login from Netherlands")
        at(3); ingest(EVENTS["E008"]); _step(3, "done", "E008 privilege escalation")
        at(4); ingest(EVENTS["E009"])
        if opt: ingest(EVENTS["E010"])
        _step(4, "done", "E009 650 MB download")
        at(5); res = correlation.correlate(); iid = res[0][0]; STATUS["incident_id"] = iid; _step(5, "done", f"{iid} created")
        at(6); ai_agent.investigate(iid); _step(6, "done", f"Provider: {ai_agent.provider_name()}")
        at(7); inc = one("SELECT * FROM incidents WHERE id=?", (iid,)); _step(7, "done", f'{inc["risk_score"]} {inc["risk_level"]}')
        at(8); response_engine.recommend(iid); auto = response_engine.auto_execute_safe(iid); _step(8, "done", f"{len(auto)} safe actions auto-executed")
        at(9); ap = response_engine.request_high_impact_approvals(iid); response_engine.refresh_status(iid)
        _step(9, "done", f"{len(ap)} approvals pending")
        audit.log("simulator", "Simulation completed", iid, "SUCCESS", "")
        STATUS.update(state="completed", running=False, message="Simulation complete")
    except Exception as e:
        audit.log("simulator", "Simulation failed", "", "FAILED", f"{type(e).__name__}: {e}")
        STATUS.update(state="error", running=False, message=f"{type(e).__name__}: {e}")

def start(speed=1.0, include_optional=False):
    with _lock:
        if STATUS["running"]: raise RuntimeError("simulation already running")
        speed = max(0.02, min(float(speed), 3.0))
        reset_all()
        STATUS.update(state="running", running=True, incident_id=None, speed=speed, started_at=now(), message="Starting…",
                      steps=[{"t": t, "label": l, "status": "pending", "detail": ""} for t, l in TIMELINE])
        audit.log("analyst", "Simulation started", "attack-simulation", "SUCCESS", f"speed={speed}")
        threading.Thread(target=_play, args=(speed, include_optional), daemon=True).start()
    return STATUS

def status():
    s = dict(STATUS)
    s["elapsed"] = round((datetime.now(timezone.utc) - datetime.fromisoformat(s["started_at"])).total_seconds(), 1) if s["started_at"] else 0
    return s
