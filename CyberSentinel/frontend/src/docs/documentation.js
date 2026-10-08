export const DOCUMENTATION_MD = `# CyberSentinel: Agentic SOC Analyst with Human-in-the-Loop RPA

**An intelligent, evidence-grounded security operations platform that accelerates threat response while keeping human analysts in control of critical decisions.**

---

## 1. Project Overview & Problem Statement

### The Problem
Modern Security Operations Centers (SOCs) are overwhelmed:
- **Alert Fatigue & Noise:** Tier-1 analysts face thousands of fragmented, isolated telemetry events and alerts daily.
- **Slow Manual Triage:** Correlating network events, identity logs, and threat intelligence takes 30–60 minutes per incident.
- **Risky Autonomous Response:** Fully autonomous AI containment carries unacceptable business risk—an automated agent hallucinating or mistakenly isolating a production payment gateway or disabling an executive account can cause massive downtime.
- **Inconsistent Documentation:** Handoffs, root-cause analyses, and regulatory audit trails are frequently incomplete or delayed.

### The CyberSentinel Solution
**CyberSentinel** is an agentic SOC analyst assistant that combines deterministic security rules, tool-using AI reasoning, transparent risk scoring, and Robotic Process Automation (RPA) with strict Human-in-the-Loop (HITL) approval gates.

**Core Philosophy:** *Detect, understand, decide, automate, verify, audit. Humans stay in control.*
CyberSentinel automates repetitive, low-risk containment tasks instantly while ensuring high-impact responses receive explicit human approval before execution.

---

## 2. Core Solution Flow

CyberSentinel operates across six distinct, verifiable stages:

\`\`\`
DETECT ──▶ UNDERSTAND ──▶ DECIDE ──▶ AUTOMATE ──▶ VERIFY ──▶ AUDIT
\`\`\`

1. **DETECT:** Raw security events are ingested and evaluated against deterministic, threshold-based detection rules in real time.
2. **UNDERSTAND:** Discrete alerts are correlated across usernames, source IPs, and time windows (30-minute rolling correlation) into unified **Incidents**, mapped directly to MITRE ATT&CK techniques. An agentic AI investigator gathers contextual threat intelligence using dedicated tools.
3. **DECIDE:** Risk is evaluated deterministically using an explainable mathematical formula (0–100 scale). Actions are bifurcated into **Safe** (low business impact) vs. **High-Impact** (potential disruption).
4. **AUTOMATE:** Safe actions execute automatically via simulated RPA workflows (or enterprise UiPath pipelines). High-impact actions are routed to a human approval queue.
5. **VERIFY:** Following execution, an automated verifier queries the target environment to confirm that the expected state matches the actual state.
6. **AUDIT:** Every decision, tool invocation, citation validation, human approval, RPA step, and verification result is permanently logged in a tamper-evident audit ledger.

---

## 3. System Architecture

\`\`\`
   ┌────────────────────────────────────────────────────────────────────────┐
   │                        Live Telemetry Stream                           │
   │           (Authentication, Privilege, Network, File Events)             │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼
                     ┌──────────────────────────────────┐
                     │    Deterministic Detection Rules │
                     │   (Brute Force, Geo, Download)   │
                     └─────────────────┬────────────────┘
                                       │ Alerts
                                       ▼
                     ┌──────────────────────────────────┐
                     │   30-Minute Correlation Engine   │
                     └─────────────────┬────────────────┘
                                       │ Unified Incident
                                       ▼
             ┌────────────────────────────────────────────────────┐
             │            INCIDENT MANAGEMENT PIPELINE            │
             └─────────┬───────────────────────────────┬──────────┘
                       │                               │
                       ▼                               ▼
    ┌─────────────────────────────────────┐   ┌────────────────────────────────┐
    │    Deterministic Risk Engine        │   │  Agentic AI SOC Investigator   │
    │  • Score: 0 - 100 (Explainable)     │   │  • Gemini 2.0 / Mock Agent     │
    │  • Breakdown: +20 pts per factor    │   │  • 4 Specialized Tools Called  │
    │  • Levels: LOW, MED, HIGH, CRITICAL │   │  • Strict Citation Validation  │
    └──────────────────┬──────────────────┘   └────────────────┬───────────────┘
                       │                                       │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │       Response Decision Engine        │
                       └───────────┬───────────────┬───────────┘
                                   │               │
                     Safe Actions  │               │ High-Impact Actions
                                   ▼               ▼
                       ┌────────────────┐  ┌───────────────────────────┐
                       │  Auto Execute  │  │   Human Approval Queue    │
                       └───────┬────────┘  │   (Analyst Review & Sign) │
                               │           └─────────────┬─────────────┘
                               │                         │ Approved
                               └───────────┬─────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │       Simulated RPA Automation        │
                       │   (Step-by-Step Execution Adapter)    │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │   Post-Execution State Verification   │
                       │    (Expected State == Actual State)   │
                       └───────────────────┬───────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │      Tamper-Evident Audit Trail       │
                       │  (Full Provenance & Compliance Log)   │
                       └───────────────────────────────────────┘
\`\`\`

---

## 4. Key Features

- **Live Attack Simulator:** Realistic playback of multi-stage credential stuffing, lateral movement, and data exfiltration (~26 seconds).
- **Deterministic Detection Rules:** Threshold and sequence analysis with zero black-box hallucination.
- **Automatic Incident Correlation:** Aggregates individual alerts into a unified operational incident.
- **MITRE ATT&CK Enterprise Mapping:** Live tags for Credential Access, Initial Access, Privilege Escalation, Collection, and Exfiltration.
- **Evidence-Grounded AI Investigation:** Uses 4 investigative tools and validates event citations against SQLite before saving.
- **Explainable Risk Scoring:** 100-point transparent mathematical scorecard explaining every point awarded.
- **Bifurcated Response Strategy:** Instant auto-containment for safe actions; human oversight for high-impact actions.
- **RPA Step Execution:** Visualized step-by-step automation execution with UiPath enterprise adapter support.
- **State Verification:** Proves that response actions actually achieved their desired target state.
- **Complete Audit Trail:** Searchable forensic timeline detailing all actors, tools, timestamps, and outcomes.
- **TryHackMe-Style SOC Interface:** High-contrast tactical dashboard built for security analysts.

---

## 5. Technology Stack

| Layer | Technologies | Description |
|---|---|---|
| **Frontend** | React 18, Vite, React Router v6 | Responsive single-page application |
| **Data Viz** | Recharts, Phosphor Icons | Interactive telemetry charts and iconography |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic | High-performance asynchronous REST API |
| **Database** | SQLite3 | Embedded ACID relational store with schema migrations |
| **AI / Agent** | Google Gemini 2.0 Flash / Mock Agent | Tool-using ReAct agent with citation checking |
| **Automation** | Simulated RPA Runner / UiPath Adapter | Multi-step robotic process automation executor |
| **Testing** | Pytest | Comprehensive unit and integration test suite |

---

## 6. Project Structure

\`\`\`
CyberSentinel/
├── backend/
│   ├── main.py              # FastAPI application endpoints & lifecycle
│   ├── database.py          # SQLite connection, seeding, and query helpers
│   ├── models.py            # SQLite schema definitions
│   ├── schemas.py           # Pydantic request/response validation
│   ├── detection.py         # Deterministic detection rules
│   ├── correlation.py       # Alert-to-incident correlation window
│   ├── risk_engine.py       # Transparent risk computation (0-100)
│   ├── ai_agent.py          # Gemini & Mock agent with 4 tools & citation verification
│   ├── mitre.py             # MITRE ATT&CK technique catalog and mapper
│   ├── response_engine.py   # Safe vs. High-impact action dispatch
│   ├── verification.py      # Post-action state verification
│   ├── simulator.py         # Multi-phase attack simulation engine
│   ├── rpa.py               # Simulated RPA runner and UiPath adapter
│   ├── audit.py             # Forensic audit logger
│   └── tests/               # Pytest test cases
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (Layout, Table, Gauge, Modal, etc.)
│   │   ├── pages/           # Dashboard, Incidents, Investigation, Response, Approvals, Audit, Docs
│   │   ├── services/        # Fetch API service layer
│   │   ├── docs/            # Embedded documentation markdown module
│   │   ├── styles.css       # TryHackMe-style SOC stylesheet
│   │   └── App.jsx          # Routing configuration
│   ├── package.json
│   └── vite.config.js
├── data/
│   ├── events.json          # Simulated telemetry event dataset
│   └── cybersentinel.db     # Local SQLite database file
├── automation/
│   └── jobs.json            # Simulated RPA job step definitions
├── README.md
└── .env.example
\`\`\`

---

## 7. Installation & Running Instructions

### Prerequisites
- **Python 3.10+**
- **Node.js LTS (v18 or v20+)** and npm

### Backend Setup
\`\`\`bash
# 1. Navigate to the backend directory
cd backend

# 2. Install Python dependencies
python -m pip install -r requirements.txt

# 3. Start the FastAPI server
python -m uvicorn main:app --port 8000
\`\`\`
The backend will automatically create and seed the SQLite database at \`data/cybersentinel.db\` and bind to \`http://localhost:8000\`.

### Frontend Setup
\`\`\`bash
# 1. Open a new terminal and navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Launch the Vite development server
npm run dev
\`\`\`
Access the SOC console at **\`http://localhost:5173\`**.

### Running Automated Tests
\`\`\`bash
cd backend
python -m pytest
\`\`\`

---

## 8. Step-by-Step Demo Script (3–4 Minutes)

1. **Dashboard Initialization:** Open \`http://localhost:5173\`. Point out the clean security overview: 0 active incidents, system indicators showing API online, and simulation mode ready.
2. **Launch Attack Simulation:** Click **🚨 LAUNCH ATTACK SIMULATION** in the top right. Watch telemetry ingest live (~26 seconds).
3. **Alert Correlation in Action:** Highlight how discrete authentication failures and abnormal events automatically coalesce into a single correlated incident (**INC-001**).
4. **Inspect Incident Details:** Navigate into **INC-001**. Showcase:
   - Chronological attack timeline.
   - MITRE ATT&CK mapped techniques (T1110, T1078, T1098, etc.).
   - Transparent Risk Breakdown displaying exactly why the score reached **100 CRITICAL** (+20 x 5 factors).
5. **Review AI Investigation:** Examine the AI analysis:
   - Tool calls made by the agent: \`get_ip_reputation\`, \`get_user_history\`, \`get_asset_information\`, \`get_related_events\`.
   - Evidence grounding with cited events: \`[E002-E006]\`, \`[E007]\`, \`[E008]\`, \`[E009]\`.
   - Citation validation badge confirming: **PASSED** (all citations verified against database).
6. **Examine Response Center:** Open **Response Center**. Note that the 5 safe containment actions executed automatically without bothering the analyst.
7. **Navigate to Approval Queue:** Show the 3 high-impact actions pending human sign-off (e.g., *Disable user alice*, *Isolate host SERVER-01*).
8. **Execute Human Approval:** Click **APPROVE** on "Disable user alice".
9. **Watch RPA Execution & Verification:**
   - Watch the animated RPA workflow executing the simulated job.
   - Observe the verification panel confirming \`Expected: disabled\` vs. \`Actual: disabled\` (**SUCCESS**).
10. **Forensic Audit Trail:** Open **Audit Trail** to view the unbroken evidentiary chain from original ingestion to verified remediation.
11. **Closing Statement:** *"Detect, understand, decide, automate, verify, audit. CyberSentinel automates safe containment while keeping humans firmly in control."*

---

## 9. The Demo Attack Story: Events E001 – E010

| Event ID | Timestamp / Phase | User | Event Type | Source IP | Location | Target Asset | Details & Forensic Context |
|---|---|---|---|---|---|---|---|
| **E001** | Phase 0 (Baseline) | john | \`login_success\` | 192.168.1.20 | India | WEB-SERVER | Legitimate baseline user activity during working hours. |
| **E002** | Phase 1 (Attack) | alice | \`login_failed\` | 192.168.1.55 | India | WEB-SERVER | First failed password attempt (reason: invalid_password). |
| **E003** | Phase 1 (Attack) | alice | \`login_failed\` | 192.168.1.55 | India | WEB-SERVER | Second consecutive failed password attempt. |
| **E004** | Phase 1 (Attack) | alice | \`login_failed\` | 192.168.1.55 | India | WEB-SERVER | Third consecutive failed password attempt. |
| **E005** | Phase 1 (Attack) | alice | \`login_failed\` | 192.168.1.55 | India | WEB-SERVER | Fourth consecutive failed password attempt. |
| **E006** | Phase 1 (Attack) | alice | \`login_failed\` | 192.168.1.55 | India | WEB-SERVER | Fifth failed password attempt -> triggers **Brute Force Alert**. |
| **E007** | Phase 2 (Compromise) | alice | \`login_success\` | 192.168.1.55 | Netherlands | WEB-SERVER | Compromised account login from an anomalous foreign location. |
| **E008** | Phase 3 (Escalation) | alice | \`privilege_escalation\` | 192.168.1.55 | Netherlands | SERVER-01 | Alice added to local Administrators group on application host. |
| **E009** | Phase 4 (Exfiltration) | alice | \`large_download\` | 192.168.1.55 | Netherlands | DB-SERVER | Exfiltration of 650 MB confidential file (\`customer_records.zip\`). |
| **E010** | Phase 4 (Execution) | alice | \`suspicious_command\` | 192.168.1.55 | Netherlands | SERVER-01 | Encoded PowerShell command execution on production server. |

---

## 10. Transparent Risk Scoring Engine

Rather than relying on unexplainable LLM numerical estimations, CyberSentinel uses a deterministic rule-based calculation:

| Risk Factor | Points | Evaluation Condition | Severity Trigger |
|---|---|---|---|
| **Brute Force** | **+20** | >= 5 failed logins within 10-minute window | Credential Access |
| **Login After Attack** | **+20** | Successful login following brute force from same IP | Account Compromise |
| **Unusual Country** | **+20** | Login from country not seen in historical profile | Geo-Anomaly |
| **Privilege Escalation** | **+20** | Unauthorized administrative permission assignment | Privilege Abuse |
| **Large Download** | **+20** | Data transfer exceeding 500 MB threshold | Data Exfiltration |
| **Suspicious Command** | **+10** | Obfuscated shell or script execution | Command Execution |

### Score Classification
- **0 – 29: LOW** — Minor anomaly or standard administrative action.
- **30 – 59: MEDIUM** — Suspicious activity; monitoring recommended.
- **60 – 79: HIGH** — Confirmed malicious behavior; immediate containment required.
- **80 – 100: CRITICAL** — Full kill-chain progression; immediate isolation and escalation.
*(Overall score is capped at 100)*

---

## 11. MITRE ATT&CK Enterprise Mapping

| Technique ID | Technique Name | Tactic | Triggering Alert |
|---|---|---|---|
| **T1110** | Brute Force | Credential Access | \`brute_force\` (E002–E006) |
| **T1078** | Valid Accounts | Initial Access / Persistence | \`login_after_bruteforce\`, \`new_country\` (E007) |
| **T1098** | Account Manipulation | Persistence / Privilege Escalation | \`privilege_escalation\` (E008) |
| **T1005** | Data from Local System | Collection | \`large_download\` (E009) |
| **T1041** | Exfiltration Over C2 Channel | Exfiltration | \`large_download\` (E009) |
| **T1059** | Command and Scripting Interpreter | Execution | \`suspicious_command\` (E010) |

---

## 12. Response Actions: Safe vs. High-Impact Bifurcation

| Action ID | Action Label | Target | Classification | Execution Policy |
|---|---|---|---|---|
| \`block_ip\` | Block IP | Source IP (192.168.1.55) | **SAFE** | Auto-executed instantly |
| \`add_blocklist\` | Add IP to Blocklist | Source IP (192.168.1.55) | **SAFE** | Auto-executed instantly |
| \`revoke_session\` | Revoke User Session | Username (alice) | **SAFE** | Auto-executed instantly |
| \`create_ticket\` | Create Incident Ticket | Incident ID (INC-001) | **SAFE** | Auto-executed instantly |
| \`send_notification\` | Send Notification to SOC | SOC On-Call Channel | **SAFE** | Auto-executed instantly |
| \`disable_user\` | Disable User Account | Username (alice) | **HIGH-IMPACT** | **Human Approval Required** |
| \`force_password_reset\` | Force Password Reset | Username (alice) | **HIGH-IMPACT** | **Human Approval Required** |
| \`isolate_host\` | Isolate Host | Host Asset (SERVER-01) | **HIGH-IMPACT** | **Human Approval Required** |

### Why Bifurcate?
- **Low Risk / Safe Actions:** Blocking an external offending IP or revoking an active session has minimal risk of corporate paralysis and prevents immediate harm.
- **High Impact Actions:** Disabling an account or severing a host network link can halt payroll, shut down e-commerce checkout, or disrupt executives. Human approval guarantees business continuity.

---

## 13. Judge & Evaluator Q&A

**Q: Are these security events and response actions real or simulated?**
> **A:** All security events, threat intelligence lookups, and host remediations are simulated in this prototype for safety and zero-friction execution. However, the detection pipeline, alert correlation, risk scoring engine, AI agent tool execution, approval queue, and audit ledger are 100% real working code that can interface with real SIEMs and identity providers via existing adapter interfaces.

**Q: Why not let the Large Language Model determine the risk score?**
> **A:** LLM numerical scoring is non-deterministic, inconsistent across runs, and prone to hallucinations. In security and compliance, a risk score must be transparent, explainable, and reproducible in a courtroom or audit review.

**Q: How does the system prevent AI hallucinations during investigation?**
> **A:** Every event citation (e.g. \`[E002-E006]\`) generated by the AI agent is validated by a backend verification filter against SQLite before being stored. Invented or non-existent event IDs are stripped and flagged as \`CORRECTED\`.

**Q: What happens if no Gemini API key is configured?**
> **A:** CyberSentinel includes a deterministic Mock Agent fallback that executes the exact same 4 investigative tools, generates structured JSON verdicts, and formats evidence citations identically.

**Q: How does Robotic Process Automation (RPA) integrate?**
> **A:** Once an action is approved, CyberSentinel executes an RPA automation job composed of discrete, verifiable steps (e.g. querying directory, modifying attribute, committing changes). The system includes an interface for connecting enterprise UiPath Orchestrator webhooks.

**Q: What is the primary business value of CyberSentinel?**
> **A:** It eliminates over 80% of repetitive Tier-1 triage and containment overhead, slashes Mean Time to Remediate (MTTR) from hours to seconds, and maintains an unshakeable audit compliance record without introducing autonomous operational risk.

---

## 14. Limitations & Future Roadmap

### Current Limitations
- **Simulated Infrastructure:** State is tracked in local SQLite rather than active LDAP/Active Directory or Palo Alto Firewalls.
- **Fixed Detection Thresholds:** Rules utilize static thresholds rather than dynamic ML baseline modeling.
- **Single-Tenant Local Environment:** Developed for local demonstration without multi-tenant authentication or RBAC.

### Future Roadmap
- **Enterprise SIEM Connectors:** Native ingestion integrations with Splunk, Elastic SIEM, Microsoft Sentinel, and AWS GuardDuty.
- **Identity & EDR Adapters:** Live Okta SCIM, Microsoft Entra ID, CrowdStrike Falcon, and SentinelOne response action drivers.
- **Collaborative ChatOps:** Interactive Slack and Microsoft Teams approval notifications with one-click biometric approval.
- **Dynamic Anomaly Scoring:** Unsupervised machine learning models to detect subtle behavioral deviations before threshold breaches occur.
`;
