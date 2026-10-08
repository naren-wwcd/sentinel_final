import json
from database import rows, one, run, next_id, now, jl, get_setting
import audit, rpa, verification, risk_engine

ACTIONS = {
 "block_ip": ("Block IP", "safe"), "add_blocklist": ("Add IP to blocklist", "safe"),
 "revoke_session": ("Revoke user session", "safe"), "create_ticket": ("Create incident ticket", "safe"),
 "send_notification": ("Send notification to SOC", "safe"),
 "disable_user": ("Disable user account", "high_impact"), "force_password_reset": ("Force password reset", "high_impact"),
 "isolate_host": ("Isolate host", "high_impact"),
}

def _alerts(inc_id):
    a = rows("SELECT * FROM alerts WHERE incident_id=? ORDER BY ts,id", (inc_id,))
    for x in a: x["meta"] = jl(x["meta"], {})
    return a

def _target(action, inc, alerts):
    if action in ("block_ip", "add_blocklist"): return inc["ip"]
    if action in ("revoke_session", "disable_user", "force_password_reset"): return inc["username"]
    if action == "create_ticket": return inc["id"]
    if action == "send_notification": return "SOC on-call"
    if action == "isolate_host":
        pe = next((a for a in alerts if a["type"] == "privilege_escalation"), None)
        if pe:
            e = one("SELECT asset FROM events WHERE id=?", (pe["event_id"],))
            if e: return e["asset"]
        return inc["asset"].split(",")[0].strip()

def plan(alerts):
    t = {a["type"] for a in alerts}
    p = []
    if t & {"brute_force", "new_country", "login_after_bruteforce"}: p += ["block_ip", "add_blocklist"]
    if t & {"login_after_bruteforce", "new_country"}: p.append("revoke_session")
    p += ["create_ticket", "send_notification"]
    if "login_after_bruteforce" in t: p += ["disable_user", "force_password_reset"]
    if "privilege_escalation" in t: p.append("isolate_host")
    return p

def recommend(inc_id):
    inc = one("SELECT * FROM incidents WHERE id=?", (inc_id,))
    if not inc: raise LookupError("incident not found")
    alerts = _alerts(inc_id)
    existing = {r["action"] for r in rows("SELECT action FROM responses WHERE incident_id=?", (inc_id,))}
    new = []
    for action in plan(alerts):
        if action in existing: continue
        label, cat = ACTIONS[action]
        rid = next_id("RSP", "responses")
        run("INSERT INTO responses(id,incident_id,action,label,target,category,status,created_at) VALUES(?,?,?,?,?,?,?,?)",
            (rid, inc_id, action, label, _target(action, inc, alerts), cat, "recommended", now()))
        new.append(rid)
    if new:
        audit.log("response-engine", "Response recommended", inc_id, "SUCCESS", f"{len(new)} actions: " + ", ".join(new))
    return rows("SELECT * FROM responses WHERE incident_id=? ORDER BY id", (inc_id,))

def _hydrate(r):
    if r:
        r["rpa_steps"] = jl(r.get("rpa_steps"), []); r["verification"] = jl(r.get("verification"), None)
    return r

def get_response(rid): return _hydrate(one("SELECT * FROM responses WHERE id=?", (rid,)))

def refresh_status(inc_id):
    inc = one("SELECT * FROM incidents WHERE id=?", (inc_id,))
    if not inc or inc["status"] in ("Resolved", "Closed"): return
    pending = one("SELECT COUNT(*) n FROM approvals WHERE incident_id=? AND status='pending'", (inc_id,))["n"]
    done_hi = one("SELECT COUNT(*) n FROM responses WHERE incident_id=? AND category='high_impact' AND status='executed'", (inc_id,))["n"]
    inv = one("SELECT id FROM investigations WHERE incident_id=?", (inc_id,))
    st = "Awaiting Approval" if pending else "Contained" if done_hi else "Investigating" if inv else inc["status"]
    run("UPDATE incidents SET status=?, updated_at=? WHERE id=?", (st, now(), inc_id))

def _execute(r, actor, auto=False):
    job, steps = rpa.get_provider().run(r["action"], r["target"])
    v = verification.verify(r["action"], r["target"])
    status = "executed" if v["status"] == "SUCCESS" else "failed"
    run("UPDATE responses SET status=?, rpa_job=?, rpa_steps=?, verification=?, executed_at=? WHERE id=?",
        (status, job, json.dumps(steps), json.dumps(v), now(), r["id"]))
    audit.log(actor, "Automatic action executed" if auto else "RPA executed", r["id"], "SUCCESS" if status == "executed" else "FAILED",
              f'{job} on {r["target"]} ({len(steps)} steps, provider={rpa.mode()})')
    audit.log("verifier", "Action verified", r["id"], v["status"], f'Expected: {v["expected"]} | Actual: {v["actual"]}')
    refresh_status(r["incident_id"])

def request_approval(r):
    ex = one("SELECT * FROM approvals WHERE response_id=? AND status='pending'", (r["id"],))
    if ex: return ex
    inc = one("SELECT * FROM incidents WHERE id=?", (r["incident_id"],))
    factors = ", ".join(b["factor"] for b in jl(inc["risk_breakdown"], []))
    aid = next_id("APR", "approvals")
    reason = f'High-impact action ({r["label"]} → {r["target"]}) requires human approval. Risk {inc["risk_score"]} {inc["risk_level"]}: {factors}.'
    run("INSERT INTO approvals(id,incident_id,response_id,action,label,target,risk_level,risk_score,reason,status,requested_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        (aid, inc["id"], r["id"], r["action"], r["label"], r["target"], inc["risk_level"], inc["risk_score"], reason, "pending", now()))
    run("UPDATE responses SET status='pending_approval' WHERE id=?", (r["id"],))
    audit.log("response-engine", "Approval requested", aid, "PENDING", f'{r["label"]} → {r["target"]} for {inc["id"]}')
    refresh_status(inc["id"])
    return one("SELECT * FROM approvals WHERE id=?", (aid,))

def execute(rid, actor="analyst"):
    r = get_response(rid)
    if not r: raise LookupError("response not found")
    if r["status"] in ("executed", "pending_approval"):
        raise ValueError(f"response is already {r['status']}")
    if r["category"] == "high_impact":
        return {"status": "pending_approval", "approval": request_approval(r), "response": get_response(rid)}
    _execute(r, actor)
    return {"status": "executed", "response": get_response(rid)}

def auto_execute_safe(inc_id):
    if get_setting("automation_mode") != "safe_auto": return []
    out = []
    for r in rows("SELECT * FROM responses WHERE incident_id=? AND category='safe' AND status='recommended' ORDER BY id", (inc_id,)):
        _execute(r, "CyberSentinel (auto)", auto=True); out.append(r["id"])
    return out

def request_high_impact_approvals(inc_id):
    out = []
    for r in rows("SELECT * FROM responses WHERE incident_id=? AND category='high_impact' AND status='recommended' ORDER BY id", (inc_id,)):
        out.append(request_approval(r)["id"])
    return out

def decide(aid, approve, actor="analyst", note=""):
    ap = one("SELECT * FROM approvals WHERE id=?", (aid,))
    if not ap: raise LookupError("approval not found")
    if ap["status"] != "pending": raise ValueError(f"approval already {ap['status']}")
    run("UPDATE approvals SET status=?, decided_at=?, decided_by=?, note=? WHERE id=?",
        ("approved" if approve else "rejected", now(), actor, note, aid))
    r = get_response(ap["response_id"])
    if approve:
        audit.log(actor, "Approval granted", aid, "SUCCESS", f'{ap["label"]} → {ap["target"]}')
        _execute(r, actor)
    else:
        run("UPDATE responses SET status='rejected' WHERE id=?", (r["id"],))
        audit.log(actor, "Approval rejected", aid, "REJECTED", f'{ap["label"]} → {ap["target"]}' + (f" — {note}" if note else ""))
        refresh_status(ap["incident_id"])
    return {"approval": one("SELECT * FROM approvals WHERE id=?", (aid,)), "response": get_response(r["id"])}
