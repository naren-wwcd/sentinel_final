# CyberSentinel — Agentic SOC Analyst with Human-in-the-Loop RPA

An agentic SOC analyst *assistant* that investigates incidents and automates safe, repetitive actions while keeping humans in control of high-impact decisions.

> **Safety disclaimer:** every security action (IP block, session revoke, account disable, host isolation) is **simulated** — state lives only in a local SQLite table. Threat intelligence is **demo data**. Nothing touches real accounts, networks or hosts.

## Problem
SOC analysts drown in disconnected alerts and repetitive containment work, and fully autonomous AI response is too risky.

## Solution
`DETECT → UNDERSTAND → DECIDE → AUTOMATE → VERIFY → AUDIT`
Events → deterministic detections → correlated incident → tool-using AI investigator (evidence-cited) → deterministic explainable risk score → safe actions auto-run / high-impact actions wait for approval → simulated RPA → state verification → audit trail.

## Architecture
```
 Simulator ─▶ events ─▶ Detection rules ─▶ alerts ─▶ Correlation ─▶ INCIDENT ─▶ MITRE map
                                                                       │
                                  Risk engine (deterministic, no LLM) ◀┤
                                                                       ▼
     AI agent (Gemini | Mock) ──tools──▶ ip_reputation · user_history · asset_info · related_events
            │ citations validated against DB (no invented event IDs)
            ▼
     Response engine ──safe──▶ RPA (simulated / UiPath adapter) ──▶ Verification ──▶ Audit
            └──high-impact──▶ Approval Queue ──approve──▶ RPA ──▶ Verification ──▶ Audit
```

## Features
Live attack simulator · 6 detection rules · alert→incident correlation · MITRE ATT&CK (T1110, T1078, T1098, T1005, T1041, T1059) · agentic AI with 4 tools · citation validation · explainable risk (0-100) · safe vs high-impact response split · approval queue · step-by-step RPA view · post-action verification · full audit trail · light and dark themes · responsive console (9 screens).

## Tech stack
React + Vite + Recharts + Phosphor Icons + Plus Jakarta Sans · FastAPI + Pydantic · SQLite · Gemini (optional) · simulated RPA (UiPath adapter optional).

## Interface
The console is monochrome by design: white in light mode, black in dark mode, with colour reserved for severity and state (and always paired with a text label and a level glyph, never colour alone).
- **Theme** — light, dark or system; toggle in the top bar or under Settings. The choice is stored in `localStorage` and applied before first paint.
- **Type & icons** — Plus Jakarta Sans for UI, JetBrains Mono only for IDs, IPs and tool output (both self-hosted via Fontsource, no CDN). Phosphor icons throughout.
- **Tokens** — every colour, radius and shadow is a CSS custom property at the top of `frontend/src/styles.css`; shared components live in `frontend/src/components/ui.jsx`.
- **Behaviour** — filters and tabs live in the URL, destructive actions confirm first, automation runs open in a side drawer, and the layout collapses to an off-canvas nav on small screens.

## Structure
```
backend/  main, database, models, schemas, detection, correlation, risk_engine, ai_agent, mitre, response_engine, verification, simulator, rpa, audit, tests/
frontend/ src/{components,pages,services}
data/events.json   automation/jobs.json   .env.example
```

## Install & run
```bash
# backend (terminal 1)
cd backend && pip install -r requirements.txt && uvicorn main:app --port 8000
# frontend (terminal 2)
cd frontend && npm install && npm run dev      # http://localhost:5173
# tests
cd backend && python -m pytest
```
The DB (`data/cybersentinel.db`) is created and seeded automatically.

## Environment variables
See `.env.example`. `GEMINI_API_KEY` → Gemini; empty → Demo/Mock AI (UI shows the provider). `RPA_MODE=uipath` + `UIPATH_*` → optional UiPath adapter.

## Demo (hackathon flow)
1. Open Overview (clean) → click **Run attack simulation** (~26s; live steps, events, alerts).
2. Watch failed logins → Netherlands login → privilege escalation → 650 MB download → alerts become **one incident (INC-001)**.
3. Open the incident: attack timeline, MITRE techniques, risk breakdown (+20 ×5 = 100 CRITICAL).
4. AI investigation (auto-run by the simulation; re-run with the button): tool calls, cited evidence like `[E002-E006]`, validation status.
5. Response: 5 safe actions already auto-executed; 3 high-impact actions are in **Approval Queue**.
6. In **Approvals**, click **Approve** on "Disable user account" → the run drawer plays the RPA steps → verification succeeds.
7. Open **Audit trail**: full chain of events (searchable, exportable as CSV). Message: *Detect → Understand → Decide → Automate → Verify → Audit.*

Tip: in Settings set Automation to *Manual* to show that nothing runs without a click.

## Positioning
CyberSentinel does not replace SOC analysts; it investigates and automates safe repetitive work while humans approve high-impact decisions.
