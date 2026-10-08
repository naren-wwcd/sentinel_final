SCHEMA = """
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, ts TEXT, username TEXT, event_type TEXT, country TEXT, ip TEXT, asset TEXT, details TEXT, source TEXT);
CREATE TABLE IF NOT EXISTS alerts(id TEXT PRIMARY KEY, event_id TEXT, type TEXT, severity TEXT, description TEXT, ts TEXT, username TEXT, ip TEXT, incident_id TEXT, meta TEXT);
CREATE TABLE IF NOT EXISTS incidents(id TEXT PRIMARY KEY, title TEXT, username TEXT, ip TEXT, asset TEXT, severity TEXT, risk_score INTEGER, risk_level TEXT, status TEXT, created_at TEXT, updated_at TEXT, risk_breakdown TEXT, mitre TEXT, summary TEXT);
CREATE TABLE IF NOT EXISTS investigations(id INTEGER PRIMARY KEY AUTOINCREMENT, incident_id TEXT, provider TEXT, status TEXT, result TEXT, tool_calls TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS evidence(id INTEGER PRIMARY KEY AUTOINCREMENT, incident_id TEXT, event_id TEXT, kind TEXT);
CREATE TABLE IF NOT EXISTS responses(id TEXT PRIMARY KEY, incident_id TEXT, action TEXT, label TEXT, target TEXT, category TEXT, status TEXT, rpa_job TEXT, rpa_steps TEXT, verification TEXT, created_at TEXT, executed_at TEXT);
CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY, incident_id TEXT, response_id TEXT, action TEXT, label TEXT, target TEXT, risk_level TEXT, risk_score INTEGER, reason TEXT, status TEXT, requested_at TEXT, decided_at TEXT, decided_by TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS audit_logs(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, actor TEXT, action TEXT, target TEXT, status TEXT, details TEXT);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS sim_state(kind TEXT, target TEXT, value TEXT, ts TEXT, PRIMARY KEY(kind, target));
"""
RESETTABLE = ["events","alerts","incidents","investigations","evidence","responses","approvals","audit_logs","sim_state"]
