import sqlite3, os, json
from datetime import datetime, timezone
from models import SCHEMA, RESETTABLE

DB_PATH = os.environ.get("CS_DB_PATH") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "cybersentinel.db")

def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")

def conn():
    c = sqlite3.connect(DB_PATH, timeout=30)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    return c

def init_db():
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    c = conn()
    c.executescript(SCHEMA)
    c.commit(); c.close()
    if get_setting("automation_mode") is None:
        set_setting("automation_mode", "safe_auto")

def rows(sql, args=()):
    c = conn()
    try:
        return [dict(r) for r in c.execute(sql, args).fetchall()]
    finally:
        c.close()

def one(sql, args=()):
    r = rows(sql, args)
    return r[0] if r else None

def run(sql, args=()):
    c = conn()
    try:
        cur = c.execute(sql, args); c.commit(); return cur.lastrowid
    finally:
        c.close()

def next_id(prefix, table, width=3):
    ids = [r["id"] for r in rows(f"SELECT id FROM {table} WHERE id LIKE ?", (prefix + "-%",))]
    n = max([int(i.split("-")[1]) for i in ids] or [0])
    return f"{prefix}-{n+1:0{width}d}"

def jl(s, default=None):
    try:
        return json.loads(s) if s else default
    except Exception:
        return default

def get_setting(k):
    r = one("SELECT value FROM settings WHERE key=?", (k,))
    return r["value"] if r else None

def set_setting(k, v):
    run("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)", (k, v))

def set_state(kind, target, value):
    run("INSERT OR REPLACE INTO sim_state(kind,target,value,ts) VALUES(?,?,?,?)", (kind, target, value, now()))

def get_state(kind, target):
    r = one("SELECT value FROM sim_state WHERE kind=? AND target=?", (kind, target))
    return r["value"] if r else None

def reset_tables():
    c = conn()
    for t in RESETTABLE:
        c.execute(f"DELETE FROM {t}")
    c.commit(); c.close()
