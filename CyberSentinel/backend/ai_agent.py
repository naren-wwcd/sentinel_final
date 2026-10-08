"""Agentic SOC investigator. Uses tools (not a prompt dump). Gemini if GEMINI_API_KEY is set, else deterministic mock agent.
All cited event IDs are validated against the DB before the result is stored."""
import json, os, re, urllib.request
from datetime import datetime, timedelta
from database import rows, one, run, now, jl
import audit, mitre

SIM_LABEL = "SIMULATED threat intelligence (demo data)"
IP_INTEL = {
 "192.168.1.55": {"reputation": "MALICIOUS", "risk": "HIGH", "reason": "Multiple suspicious authentication events."},
 "192.168.1.20": {"reputation": "CLEAN", "risk": "LOW", "reason": "Known corporate workstation, no abuse reports."},
}
USERS = {
 "alice": {"role": "Finance Analyst", "home_country": "India", "privileged": False},
 "john": {"role": "Software Engineer", "home_country": "India", "privileged": False},
 "admin": {"role": "IT Administrator", "home_country": "India", "privileged": True},
 "bob": {"role": "HR Manager", "home_country": "India", "privileged": False},
}
ASSETS = {
 "LAPTOP-ALICE": {"type": "Workstation", "criticality": "MEDIUM", "owner": "alice", "data": "Personal files"},
 "SERVER-01": {"type": "Application server", "criticality": "HIGH", "owner": "IT Ops", "data": "Internal services"},
 "DB-SERVER": {"type": "Database server", "criticality": "CRITICAL", "owner": "Data team", "data": "Customer records (confidential)"},
 "WEB-SERVER": {"type": "Web / login portal", "criticality": "HIGH", "owner": "IT Ops", "data": "Authentication gateway"},
}

# ---------------- tools ----------------
def get_ip_reputation(ip):
    d = IP_INTEL.get(ip, {"reputation": "UNKNOWN", "risk": "LOW", "reason": "No intelligence available."})
    return {"ip": ip, **d, "source": SIM_LABEL}

def get_user_history(user):
    prof = USERS.get(user, {"role": "Unknown", "home_country": "Unknown", "privileged": False})
    ev = rows("SELECT * FROM events WHERE username=? ORDER BY ts DESC", (user,))
    succ = [e for e in ev if e["event_type"] == "login_success"]
    countries = {}
    for e in succ: countries[e["country"]] = countries.get(e["country"], 0) + 1
    return {"user": user, **prof, "login_countries": countries, "total_events": len(ev),
            "failed_logins": sum(1 for e in ev if e["event_type"] == "login_failed"),
            "last_events": [e["id"] for e in ev[:5]]}

def get_asset_information(asset):
    return {"asset": asset, **ASSETS.get(asset, {"type": "Unknown", "criticality": "LOW", "owner": "Unknown", "data": "Unknown"})}

def get_related_events(user, ip, time_window_minutes=60):
    anchor = one("SELECT MAX(ts) t FROM events WHERE username=? OR ip=?", (user, ip))
    if not anchor or not anchor["t"]: return []
    since = (datetime.fromisoformat(anchor["t"]) - timedelta(minutes=float(time_window_minutes))).isoformat(timespec="milliseconds")
    out = rows("SELECT * FROM events WHERE (username=? OR ip=?) AND ts>=? ORDER BY ts,id", (user, ip, since))
    for e in out: e["details"] = jl(e["details"], {})
    return out

TOOLS = {"get_ip_reputation": get_ip_reputation, "get_user_history": get_user_history,
         "get_asset_information": get_asset_information, "get_related_events": get_related_events}

# ---------------- citation validation ----------------
CITE = re.compile(r"\bE(\d{3,})(?:\s*[-–]\s*E(\d{3,}))?")

def _expand(m):
    a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else a
    w = len(m.group(1))
    if b < a or b - a > 500: return None
    return [f"E{n:0{w}d}" for n in range(a, b + 1)]

def _all_event_ids():
    return {r["id"] for r in rows("SELECT id FROM events")}

def clean_text(text, valid, report):
    if not isinstance(text, str): return text
    def sub(m):
        ids = _expand(m)
        if ids is None or any(i not in valid for i in ids):
            report["invalid"].append(m.group(0)); return "[invalid citation removed]"
        report["cited"].update(ids); return m.group(0)
    return CITE.sub(sub, text)

def validate(result):
    valid = _all_event_ids(); rep = {"cited": set(), "invalid": []}
    for k in ("attack_summary", "reasoning", "recommended_action", "verdict"):
        result[k] = clean_text(result.get(k, ""), valid, rep)
    ev = []
    for e in result.get("evidence", []):
        if isinstance(e, dict) and e.get("event_id") in valid:
            e["note"] = clean_text(e.get("note", ""), valid, rep); ev.append(e); rep["cited"].add(e["event_id"])
        else:
            rep["invalid"].append(str(e.get("event_id") if isinstance(e, dict) else e))
    result["evidence"] = ev
    tl = []
    for t in result.get("timeline", []):
        if isinstance(t, dict) and t.get("event_id") in valid: tl.append(t)
        else: rep["invalid"].append(str(t.get("event_id") if isinstance(t, dict) else t))
    result["timeline"] = tl
    result["mitre_techniques"] = [t for t in result.get("mitre_techniques", []) if isinstance(t, dict) and t.get("id") in mitre.KNOWN]
    try: result["confidence"] = max(0, min(100, int(result.get("confidence", 0))))
    except Exception: result["confidence"] = 0
    result["validation"] = {"status": "CORRECTED" if rep["invalid"] else "PASSED", "cited_event_ids": sorted(rep["cited"]),
                            "invalid_citations_removed": rep["invalid"]}
    return result

# ---------------- helpers ----------------
def fmt_ids(ids):
    ids = sorted(set(ids)); nums = [(i, int(i[1:])) for i in ids if re.fullmatch(r"E\d+", i)]
    out, run_ = [], []
    for i, n in nums:
        if run_ and n == run_[-1][1] + 1: run_.append((i, n))
        else:
            if run_: out.append(run_); run_ = []
            run_ = [(i, n)]
    if run_: out.append(run_)
    return ", ".join(r[0][0] if len(r) == 1 else f"{r[0][0]}-{r[-1][0]}" for r in out)

def _load(inc_id):
    inc = one("SELECT * FROM incidents WHERE id=?", (inc_id,))
    if not inc: raise LookupError("incident not found")
    ev_ids = [r["event_id"] for r in rows("SELECT event_id FROM evidence WHERE incident_id=?", (inc_id,))]
    alerts = rows("SELECT * FROM alerts WHERE incident_id=? ORDER BY ts,id", (inc_id,))
    return inc, sorted(ev_ids), alerts

# ---------------- mock agent ----------------
def _mock(inc, ev_ids, alerts, call):
    rel = call("get_related_events", user=inc["username"], ip=inc["ip"], time_window_minutes=60)
    rep = call("get_ip_reputation", ip=inc["ip"])
    hist = call("get_user_history", user=inc["username"])
    assets = {a: call("get_asset_information", asset=a) for a in [x.strip() for x in inc["asset"].split(",") if x.strip()]}
    evs = [e for e in rel if e["id"] in ev_ids]
    by = lambda t: [e for e in evs if e["event_type"] == t]
    fails, succ = by("login_failed"), by("login_success")
    home = hist["home_country"]
    foreign = [e for e in succ if e["country"] != home]
    pe, dl = by("privilege_escalation"), by("large_download")
    u, ip = inc["username"], inc["ip"]
    parts = []
    if fails: parts.append(f"{len(fails)} failed logins for {u} from {ip} [{fmt_ids([e['id'] for e in fails])}]")
    if foreign: parts.append(f"followed by a successful login from {foreign[0]['country']}, outside {u}'s usual location ({home}) [{foreign[0]['id']}]")
    elif succ: parts.append(f"followed by a successful login [{succ[0]['id']}]")
    if pe: parts.append(f"then privilege escalation on {pe[0]['asset']} [{pe[0]['id']}]")
    if dl:
        sz = dl[0]["details"].get("size_mb", "?")
        parts.append(f"and a {sz} MB download from {dl[0]['asset']} ({assets.get(dl[0]['asset'], {}).get('criticality', '?')} criticality asset) [{dl[0]['id']}]")
    reasoning = ("; ".join(parts) + ". " if parts else "Limited activity observed. ") + \
        f"Source IP {ip} is rated {rep['reputation']} ({rep['reason']}) by simulated threat intel. The deterministic risk engine scored this {inc['risk_score']} {inc['risk_level']}."
    compromised = any(a["type"] == "login_after_bruteforce" for a in alerts)
    verdict = ("Likely account compromise (true positive)" if compromised and inc["risk_score"] >= 60
               else "Suspicious activity — analyst review required" if inc["risk_score"] >= 30 else "Low-confidence anomaly")
    types = {a["type"] for a in alerts}
    rec = []
    if types & {"brute_force", "login_after_bruteforce"}: rec.append(f"Block {ip} and revoke {u}'s sessions (safe, automatic)")
    if compromised: rec.append(f"Disable {u}'s account and force a password reset (needs approval)")
    if "privilege_escalation" in types: rec.append(f"Isolate {pe[0]['asset'] if pe else 'affected host'} (needs approval)")
    labels = {"login_failed": "Failed login", "login_success": "Successful login", "privilege_escalation": "Privilege escalation",
              "large_download": "Large data download", "suspicious_command": "Suspicious command"}
    def note(e):
        base = labels.get(e["event_type"], e["event_type"])
        if e["event_type"] == "login_success" and e["country"] != home: base += f" from unusual country ({e['country']})"
        if e["event_type"] == "large_download": base += f" ({e['details'].get('size_mb')} MB)"
        return f"{base} on {e['asset']}"
    return {
        "verdict": verdict, "confidence": min(97, int(40 + inc["risk_score"] * 0.55)),
        "attack_summary": f"{'Account compromise' if compromised else 'Suspicious activity'} chain for {u}: " + " → ".join(
            x for x in [f"password attack [{fmt_ids([e['id'] for e in fails])}]" if fails else "", "successful login" + (f" from {foreign[0]['country']}" if foreign else "") if succ else "",
                        "privilege escalation" if pe else "", "large data download" if dl else ""] if x) + ".",
        "timeline": [{"event_id": e["id"], "ts": e["ts"], "label": note(e)} for e in evs],
        "evidence": [{"event_id": e["id"], "note": note(e)} for e in evs],
        "mitre_techniques": jl(inc["mitre"], []),
        "recommended_action": "; ".join(rec) or "Monitor and review",
        "reasoning": reasoning,
    }

# ---------------- Gemini agent ----------------
SYS = ("You are a SOC investigation agent. Investigate the incident ONLY by calling the provided tools. "
       "Cite event IDs in brackets like [E002-E006]; cite only IDs returned by tools or listed as incident evidence. "
       "Never invent evidence. Do not output a risk score. Final answer must be ONLY a JSON object with keys: verdict, confidence (0-100), "
       "attack_summary, timeline (list of {event_id, ts, label}), evidence (list of {event_id, note}), recommended_action, reasoning.")
DECLS = [
 {"name": "get_ip_reputation", "description": "Simulated threat-intel lookup for an IP", "parameters": {"type": "OBJECT", "properties": {"ip": {"type": "STRING"}}, "required": ["ip"]}},
 {"name": "get_user_history", "description": "Profile and login history for a user", "parameters": {"type": "OBJECT", "properties": {"user": {"type": "STRING"}}, "required": ["user"]}},
 {"name": "get_asset_information", "description": "Criticality and owner for an asset", "parameters": {"type": "OBJECT", "properties": {"asset": {"type": "STRING"}}, "required": ["asset"]}},
 {"name": "get_related_events", "description": "Events for a user or IP in the last N minutes", "parameters": {"type": "OBJECT", "properties": {"user": {"type": "STRING"}, "ip": {"type": "STRING"}, "time_window_minutes": {"type": "NUMBER"}}, "required": ["user", "ip"]}},
]

def _gemini(inc, ev_ids, alerts, call):
    key = os.environ["GEMINI_API_KEY"]; model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    prompt = (f"Incident {inc['id']}: user={inc['username']} ip={inc['ip']} assets={inc['asset']}. Alerts: "
              + "; ".join(f"{a['id']}:{a['type']}@{a['event_id']}" for a in alerts) + f". Evidence event IDs: {fmt_ids(ev_ids)}. Investigate.")
    contents = [{"role": "user", "parts": [{"text": prompt}]}]
    for _ in range(8):
        body = json.dumps({"contents": contents, "tools": [{"functionDeclarations": DECLS}], "systemInstruction": {"parts": [{"text": SYS}]}}).encode()
        data = json.loads(urllib.request.urlopen(urllib.request.Request(url, body, {"Content-Type": "application/json"}), timeout=45).read())
        parts = data["candidates"][0]["content"]["parts"]
        contents.append({"role": "model", "parts": parts})
        fcs = [p["functionCall"] for p in parts if "functionCall" in p]
        if not fcs:
            txt = "".join(p.get("text", "") for p in parts).strip()
            txt = re.sub(r"^```(?:json)?|```$", "", txt, flags=re.M).strip()
            r = json.loads(txt)
            r.setdefault("mitre_techniques", jl(inc["mitre"], []))
            for k in ("timeline", "evidence"): r.setdefault(k, [])
            return r
        contents.append({"role": "user", "parts": [{"functionResponse": {"name": fc["name"], "response": {"result": call(fc["name"], **fc.get("args", {}))}}} for fc in fcs]})
    raise RuntimeError("tool loop exceeded")

def provider_name():
    return "Gemini" if os.environ.get("GEMINI_API_KEY") else "Demo/Mock"

def investigate(inc_id, actor="ai-agent"):
    inc, ev_ids, alerts = _load(inc_id)
    provider = provider_name()
    audit.log(actor, "AI investigation started", inc_id, "SUCCESS", f"provider={provider}")
    calls = []
    def call(name, **args):
        res = TOOLS[name](**args)
        calls.append({"tool": name, "args": args, "result": res, "ts": now()})
        audit.log(actor, "Tool called", inc_id, "SUCCESS", f"{name}({json.dumps(args)})")
        return res
    result = None
    if provider == "Gemini":
        try: result = _gemini(inc, ev_ids, alerts, call)
        except Exception as e:
            audit.log(actor, "Gemini failed, using mock fallback", inc_id, "WARNING", f"{type(e).__name__}: {e}")
            provider, calls = "Demo/Mock (Gemini fallback)", []
    if result is None:
        result = _mock(inc, ev_ids, alerts, call)
    result = validate(result)
    result["provider"] = provider
    run("DELETE FROM investigations WHERE incident_id=?", (inc_id,))
    run("INSERT INTO investigations(incident_id,provider,status,result,tool_calls,created_at) VALUES(?,?,?,?,?,?)",
        (inc_id, provider, "complete", json.dumps(result), json.dumps(calls, default=str), now()))
    audit.log(actor, "AI investigation completed", inc_id, "SUCCESS",
              f'verdict="{result["verdict"]}" confidence={result["confidence"]} citations={result["validation"]["status"]} tools={len(calls)}')
    run("UPDATE incidents SET status=CASE WHEN status='Open' THEN 'Investigating' ELSE status END, updated_at=? WHERE id=?", (now(), inc_id))
    return get_investigation(inc_id)

def get_investigation(inc_id):
    r = one("SELECT * FROM investigations WHERE incident_id=? ORDER BY id DESC LIMIT 1", (inc_id,))
    if not r: return None
    return {"incident_id": inc_id, "provider": r["provider"], "created_at": r["created_at"], "result": jl(r["result"], {}), "tool_calls": jl(r["tool_calls"], [])}
