import time
import pytest
import simulator, detection, correlation, risk_engine, response_engine, verification, ai_agent
from database import rows, one, get_state
from fastapi.testclient import TestClient
from main import app

E = simulator.EVENTS
def feed(ids):
    out = []
    for i in ids: out += simulator.ingest(E[i])
    return out
def types(al): return [a["type"] for a in al]
def full_attack():
    feed(["E001", "E002", "E003", "E004", "E005", "E006", "E007", "E008", "E009"])
    return correlation.correlate()[0][0]

def test_bruteforce_detection():
    al = feed(["E002", "E003", "E004", "E005"]); assert al == []
    al = feed(["E006"]); assert types(al) == ["brute_force"]
    assert al[0]["meta"]["event_ids"] == ["E002", "E003", "E004", "E005", "E006"]

def test_new_country_and_login_after_bruteforce():
    feed(["E002", "E003", "E004", "E005", "E006"])
    t = types(feed(["E007"])); assert "new_country" in t and "login_after_bruteforce" in t

def test_privilege_escalation():
    assert types(feed(["E008"])) == ["privilege_escalation"]

def test_large_download_threshold():
    assert types(feed(["E009"])) == ["large_download"]
    small = dict(E["E009"], id="E099", details={"size_mb": 10}); assert simulator.ingest(small) == []

def test_normal_event_no_alert():
    assert feed(["E001"]) == []

def test_sequence_and_correlation_single_incident():
    iid = full_attack()
    assert len(rows("SELECT * FROM incidents")) == 1 and iid == "INC-001"
    inc = one("SELECT * FROM incidents WHERE id=?", (iid,))
    ev = {r["event_id"] for r in rows("SELECT event_id FROM evidence WHERE incident_id=?", (iid,))}
    assert {f"E00{n}" for n in range(2, 10)} <= ev and "E001" not in ev
    assert inc["severity"] == "CRITICAL" and "Alice" in inc["title"]
    assert "suspicious_sequence" in [a["type"] for a in rows("SELECT type FROM alerts")]

def test_risk_score_deterministic():
    iid = full_attack(); inc = one("SELECT * FROM incidents WHERE id=?", (iid,))
    assert inc["risk_score"] == 100 and inc["risk_level"] == "CRITICAL"
    assert risk_engine.level(29) == "LOW" and risk_engine.level(30) == "MEDIUM" and risk_engine.level(60) == "HIGH" and risk_engine.level(80) == "CRITICAL"
    partial = risk_engine.compute([{"type": "brute_force", "id": "A", "event_id": "E002", "meta": {}}])
    assert partial["score"] == 20 and partial["level"] == "LOW"

def test_ai_investigation_citations_validated():
    iid = full_attack(); inv = ai_agent.investigate(iid)
    r = inv["result"]
    assert inv["provider"] == "Demo/Mock" and r["validation"]["status"] == "PASSED"
    assert "[E002-E006]" in r["reasoning"] and len(inv["tool_calls"]) >= 4
    assert {t["tool"] for t in inv["tool_calls"]} >= {"get_ip_reputation", "get_user_history", "get_asset_information", "get_related_events"}
    bad = ai_agent.validate({"reasoning": "Fake evidence [E900] and real [E002-E004]", "evidence": [{"event_id": "E900", "note": "x"}, {"event_id": "E002", "note": "ok"}]})
    assert "E900" not in bad["reasoning"] and bad["validation"]["status"] == "CORRECTED" and len(bad["evidence"]) == 1

def test_safe_auto_and_high_impact_needs_approval():
    iid = full_attack(); response_engine.recommend(iid)
    auto = response_engine.auto_execute_safe(iid); assert len(auto) == 5
    assert get_state("ip_blocked", "192.168.1.55") == "blocked"
    assert get_state("account", "alice") is None
    pend = response_engine.request_high_impact_approvals(iid); assert len(pend) == 3
    assert get_state("account", "alice") is None

def test_approval_runs_rpa_and_verifies():
    iid = full_attack(); response_engine.recommend(iid); response_engine.request_high_impact_approvals(iid)
    ap = one("SELECT * FROM approvals WHERE action='disable_user'")
    out = response_engine.decide(ap["id"], True, "tester")
    assert out["response"]["status"] == "executed" and out["response"]["verification"]["status"] == "SUCCESS"
    assert len(out["response"]["rpa_steps"]) == 6 and get_state("account", "alice") == "disabled"
    with pytest.raises(ValueError): response_engine.decide(ap["id"], True)

def test_rejection_logged_and_no_change():
    iid = full_attack(); response_engine.recommend(iid); response_engine.request_high_impact_approvals(iid)
    ap = one("SELECT * FROM approvals WHERE action='isolate_host'")
    response_engine.decide(ap["id"], False, "tester", "not now")
    assert get_state("host", "SERVER-01") is None
    assert one("SELECT * FROM audit_logs WHERE action='Approval rejected'")

def test_verification_detects_mismatch():
    assert verification.verify("block_ip", "1.2.3.4")["status"] == "FAILED"

def test_api_end_to_end():
    c = TestClient(app)
    assert c.get("/api/health").json()["status"] == "ok"
    assert c.post("/api/simulation/start", json={"speed": 0.05}).status_code == 200
    for _ in range(200):
        s = c.get("/api/simulation/status").json()
        if not s["running"]: break
        time.sleep(0.1)
    assert s["state"] == "completed", s
    d = c.get("/api/dashboard").json()
    assert d["cards"]["active_incidents"] == 1 and d["cards"]["pending_approvals"] == 3
    detail = c.get("/api/incidents/INC-001").json()
    assert detail["investigation"]["result"]["validation"]["status"] == "PASSED" and detail["incident"]["status"] == "Awaiting Approval"
    aid = c.get("/api/approvals?status=pending").json()[0]["id"]
    r = c.post(f"/api/approvals/{aid}/approve", json={}).json()
    assert r["response"]["verification"]["status"] == "SUCCESS"
    assert c.post(f"/api/approvals/{aid}/approve", json={}).status_code == 409
    actions = {a["action"] for a in c.get("/api/audit").json()}
    assert {"Incident created", "AI investigation started", "Risk calculated", "Automatic action executed", "Approval requested", "Approval granted", "RPA executed", "Action verified"} <= actions
