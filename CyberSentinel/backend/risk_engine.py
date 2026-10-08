# Deterministic, explainable risk scoring. The LLM never sets this number.
FACTORS = [
 ("brute_force", 20, "Brute force"),
 ("login_after_bruteforce", 20, "Successful login after attack"),
 ("new_country", 20, "Unusual country"),
 ("privilege_escalation", 20, "Privilege escalation"),
 ("large_download", 20, "Large download"),
 ("suspicious_command", 10, "Suspicious command execution"),
]

def level(score):
    return "LOW" if score < 30 else "MEDIUM" if score < 60 else "HIGH" if score < 80 else "CRITICAL"

def compute(alerts):
    by = {}
    for a in alerts:
        by.setdefault(a["type"], a)
    breakdown, total = [], 0
    for ty, pts, label in FACTORS:
        a = by.get(ty)
        if a:
            meta = a.get("meta") or {}
            breakdown.append({"type": ty, "factor": label, "points": pts, "alert_id": a["id"],
                              "event_ids": meta.get("event_ids") or [a["event_id"]]})
            total += pts
    score = min(100, total)
    return {"score": score, "level": level(score), "breakdown": breakdown, "max": 100}
