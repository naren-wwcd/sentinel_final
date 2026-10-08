from database import get_state

# action -> (state kind, expected value, human text)
STATE_MAP = {
 "block_ip": ("ip_blocked", "blocked", "IP blocked"),
 "add_blocklist": ("blocklist", "listed", "IP on blocklist"),
 "revoke_session": ("session", "revoked", "Sessions revoked"),
 "create_ticket": ("ticket", "created", "Ticket created"),
 "send_notification": ("notification", "sent", "Notification sent"),
 "disable_user": ("account", "disabled", "Account disabled"),
 "force_password_reset": ("password", "reset_required", "Password reset required"),
 "isolate_host": ("host", "isolated", "Host isolated"),
}
ACTUAL_TEXT = {"blocked": "IP blocked", "listed": "IP on blocklist", "revoked": "Sessions revoked", "created": "Ticket created",
               "sent": "Notification sent", "disabled": "Account disabled", "reset_required": "Password reset required",
               "isolated": "Host isolated"}

def verify(action, target):
    kind, expected, text = STATE_MAP[action]
    actual = get_state(kind, target)
    return {"expected": text, "actual": ACTUAL_TEXT.get(actual, "No change detected"),
            "status": "SUCCESS" if actual == expected else "FAILED", "target": target}
