import json
from datetime import datetime, timedelta
from database import rows, one, run, next_id, now
import risk_engine, mitre, audit

CORRELATION_WINDOW_S = 1800

def _refresh(inc_id):
    alerts = rows("SELECT * FROM alerts WHERE incident_id=? ORDER BY ts,id", (inc_id,))
    for a in alerts: a["meta"] = json.loads(a["meta"] or "{}")
    ev_ids = set()
    for a in alerts:
        ev_ids |= set(a["meta"].get("event_ids", [])) | {a["event_id"]}
    ev_ids = sorted(ev_ids)
    evs = rows(f"SELECT * FROM events WHERE id IN ({','.join('?'*len(ev_ids))}) ORDER BY ts,id", ev_ids) if ev_ids else []
    pref = next((a for a in alerts if a["type"] == "login_after_bruteforce"), None) or next((a for a in alerts if a["type"] == "brute_force"), alerts[0])
    assets = []
    for e in evs:
        if e["asset"] not in assets: assets.append(e["asset"])
    risk = risk_engine.compute(alerts)
    types = [a["type"] for a in alerts]
    user = alerts[0]["username"]
    title = f"Possible {user.capitalize()} Account Compromise" if "login_after_bruteforce" in types else f"Suspicious activity by {user.capitalize()}"
    techs = mitre.for_alert_types(dict.fromkeys(types))
    summary = f"{len(alerts)} correlated alerts, {len(ev_ids)} evidence events for {user} / {pref['ip']}"
    run("UPDATE incidents SET title=?, ip=?, asset=?, severity=?, risk_score=?, risk_level=?, updated_at=?, risk_breakdown=?, mitre=?, summary=? WHERE id=?",
        (title, pref["ip"], ", ".join(assets), risk["level"], risk["score"], risk["level"], now(), json.dumps(risk["breakdown"]), json.dumps(techs), summary, inc_id))
    run("DELETE FROM evidence WHERE incident_id=?", (inc_id,))
    for e in evs:
        run("INSERT INTO evidence(incident_id,event_id,kind) VALUES(?,?,?)", (inc_id, e["id"], e["event_type"]))
    return risk

def correlate():
    """Group unassigned alerts by user (+ time window) into incidents. Returns list of (incident_id, created)."""
    pending = rows("SELECT * FROM alerts WHERE incident_id IS NULL ORDER BY ts,id")
    by_user = {}
    for a in pending: by_user.setdefault(a["username"], []).append(a)
    result = []
    for user, alerts in by_user.items():
        inc = one("SELECT * FROM incidents WHERE username=? AND status NOT IN ('Resolved','Closed') ORDER BY created_at DESC LIMIT 1", (user,))
        created = False
        if inc and datetime.fromisoformat(alerts[0]["ts"]) - datetime.fromisoformat(inc["updated_at"]) > timedelta(seconds=CORRELATION_WINDOW_S):
            inc = None
        if not inc:
            iid = next_id("INC", "incidents")
            run("INSERT INTO incidents(id,title,username,ip,asset,severity,risk_score,risk_level,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                (iid, "Pending", user, alerts[0]["ip"], "", "LOW", 0, "LOW", "Open", now(), now()))
            created = True
        else:
            iid = inc["id"]
        for a in alerts:
            run("UPDATE alerts SET incident_id=? WHERE id=?", (iid, a["id"]))
        risk = _refresh(iid)
        i = one("SELECT * FROM incidents WHERE id=?", (iid,))
        audit.log("correlation-engine", "Incident created" if created else "Incident updated", iid, "SUCCESS",
                  f'{i["title"]}: {len(alerts)} alerts correlated by user={user}')
        audit.log("risk-engine", "Risk calculated", iid, "SUCCESS", f'{risk["score"]} {risk["level"]}')
        result.append((iid, created))
    return result
