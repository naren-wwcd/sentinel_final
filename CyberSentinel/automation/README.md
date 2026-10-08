# Automation (RPA)
`jobs.json` defines every RPA job (name + ordered steps). `backend/rpa.py` runs them through a provider:
- **SimulatedRPA** (default): executes each step and changes only *simulated* state in SQLite.
- **UiPathRPA** (optional): set `RPA_MODE=uipath` plus `UIPATH_URL`, `UIPATH_TOKEN`, `UIPATH_RELEASE_KEY` to start an Orchestrator job
  (input args: `action`, `target`). If UiPath is unreachable it falls back to the simulation so the demo never breaks.
To connect a real UiPath process, publish a process whose input arguments are `action` and `target` and use its release key.
