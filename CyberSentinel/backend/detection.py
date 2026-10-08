import json
from datetime import timedelta, datetime
from database import rows, run, next_id
import audit

BRUTE_THRESHOLD = 5
BRUTE_WINDOW_S = 600
SEQUENCE_WINDOW_S = 1800
LARGE_DOWNLOAD_MB = 500
SEVERITY = {"brute_force": "MEDIUM", "login_after_bruteforce": "HIGH", "new_country": "MEDIUM",
            "privilege_escalation": "HIGH", "large_download": "HIGH", "suspicious_command": "HIGH",
            "suspicious_sequence": "CRITICAL"}

def _p(s): return datetime.fromisoformat(s)
def _iso(d): return d.isoformat(timespec="milliseconds")

def _alerts_since(user, ts, window):
    out = rows("SELECT * FROM alerts WHERE username=? AND ts>=? ORDER BY ts,id", (user, _iso(_p(ts) - timedelta(seconds=window))))
    for a in out: a["meta"] = json.loads(a["meta"] or "{}")
    return out

def detect(ev):
    """Pure rule evaluation against history in the DB. Returns alert dicts (not persisted)."""
    d = ev["details"] if isinstance(ev["details"], dict) else json.loads(ev["details"] or "{}")
    u, ip, typ, ts = ev["username"], ev["ip"], ev["event_type"], ev["ts"]
    out = []
    def add(t, desc, **meta):
        out.append({"type": t, "severity": SEVERITY[t], "description": desc, "event_id": ev["id"], "ts": ts,
                    "username": u, "ip": ip, "meta": meta})
    prior = _alerts_since(u, ts, SEQUENCE_WINDOW_S)

    if typ == "login_failed":
        fails = rows("SELECT id FROM events WHERE username=? AND ip=? AND event_type='login_failed' AND ts>=? AND ts<=? ORDER BY ts,id",
                     (u, ip, _iso(_p(ts) - timedelta(seconds=BRUTE_WINDOW_S)), ts))
        if len(fails) >= BRUTE_THRESHOLD and not any(a["type"] == "brute_force" and a["ip"] == ip for a in prior):
            add("brute_force", f"{len(fails)} failed logins for {u} from {ip} within {BRUTE_WINDOW_S//60} minutes",
                event_ids=[f["id"] for f in fails], count=len(fails))

    if typ == "login_success":
        bf = [a for a in prior if a["type"] == "brute_force" and a["ip"] == ip]
        if bf:
            add("login_after_bruteforce", f"Successful login for {u} from {ip} after brute-force attempts",
                event_ids=bf[0]["meta"].get("event_ids", []) + [ev["id"]])
        home = rows("SELECT DISTINCT country FROM events WHERE username=? AND event_type='login_success' AND id!=? AND ts<?", (u, ev["id"], ts))
        known = sorted(r["country"] for r in home)
        if known and ev["country"] not in known:
            add("new_country", f"Login for {u} from unusual country {ev['country']} (usual: {', '.join(known)})",
                event_ids=[ev["id"]], country=ev["country"], known_countries=known)

    if typ == "privilege_escalation":
        add("privilege_escalation", f"Privilege escalation by {u} on {ev['asset']}", event_ids=[ev["id"]])

    if typ == "large_download" and d.get("size_mb", 0) >= LARGE_DOWNLOAD_MB:
        add("large_download", f"Large download of {d['size_mb']} MB by {u} from {ev['asset']}", event_ids=[ev["id"]], size_mb=d["size_mb"])

    if typ == "suspicious_command":
        add("suspicious_command", f"Suspicious command executed by {u} on {ev['asset']}", event_ids=[ev["id"]])

    types = {a["type"] for a in prior} | {a["type"] for a in out}
    if {"login_after_bruteforce", "privilege_escalation", "large_download"} <= types and \
       not any(a["type"] == "suspicious_sequence" for a in prior) and out:
        ids = []
        for a in prior + out:
            if a["type"] in ("brute_force", "login_after_bruteforce", "privilege_escalation", "large_download"):
                ids += a["meta"].get("event_ids", [a["event_id"]])
        add("suspicious_sequence", f"Attack sequence for {u}: password attack → login → privilege escalation → data download",
            event_ids=sorted(set(ids)))
    return out

def run_detection(ev):
    saved = []
    for a in detect(ev):
        a["id"] = next_id("ALT", "alerts")
        run("INSERT INTO alerts(id,event_id,type,severity,description,ts,username,ip,incident_id,meta) VALUES(?,?,?,?,?,?,?,?,NULL,?)",
            (a["id"], a["event_id"], a["type"], a["severity"], a["description"], a["ts"], a["username"], a["ip"], json.dumps(a["meta"])))
        audit.log("detection-engine", "Alert generated", a["id"], "SUCCESS", f'{a["type"]} ({a["severity"]}) on {a["event_id"]}')
        saved.append(a)
    return saved
