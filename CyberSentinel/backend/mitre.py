# Real MITRE ATT&CK Enterprise technique IDs only.
T = {
 "T1110": ("Brute Force", "Credential Access"),
 "T1078": ("Valid Accounts", "Initial Access / Persistence / Privilege Escalation"),
 "T1098": ("Account Manipulation", "Persistence / Privilege Escalation"),
 "T1005": ("Data from Local System", "Collection"),
 "T1041": ("Exfiltration Over C2 Channel", "Exfiltration"),
 "T1059": ("Command and Scripting Interpreter", "Execution"),
}
MAP = {
 "brute_force": ["T1110"],
 "login_after_bruteforce": ["T1078"],
 "new_country": ["T1078"],
 "privilege_escalation": ["T1098"],
 "large_download": ["T1005", "T1041"],
 "suspicious_command": ["T1059"],
}
KNOWN = set(T)

def technique(tid, triggered_by=None):
    n, tac = T[tid]
    return {"id": tid, "name": n, "tactic": tac, "url": f"https://attack.mitre.org/techniques/{tid}/", "triggered_by": triggered_by or []}

def for_alert_types(types):
    out = {}
    for ty in types:
        for tid in MAP.get(ty, []):
            out.setdefault(tid, []).append(ty)
    return [technique(t, b) for t, b in out.items()]
