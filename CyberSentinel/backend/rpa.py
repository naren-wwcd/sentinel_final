"""RPA layer. SimulatedRPA is the default; UiPathRPA is an optional adapter (Orchestrator REST) that falls back to simulation.
Job definitions live in ../automation/jobs.json. NOTHING here touches real systems."""
import json, os, time, urllib.request
from database import set_state, now
from verification import STATE_MAP

JOBS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "automation", "jobs.json")))

class RPAProvider:
    name = "base"
    def run(self, action, target):
        raise NotImplementedError

class SimulatedRPA(RPAProvider):
    name = "Simulated"
    def run(self, action, target):
        job = JOBS[action]
        kind, expected, _ = STATE_MAP[action]
        steps = []
        for i, (text, apply) in enumerate(job["steps"], 1):
            time.sleep(0.03)
            if apply:
                set_state(kind, target, expected)   # simulated state change only
            steps.append({"step": i, "text": text.format(target=target), "status": "success", "ts": now()})
        return job["job"], steps

class UiPathRPA(RPAProvider):
    """Starts a UiPath Orchestrator job (env: UIPATH_URL, UIPATH_TOKEN, UIPATH_RELEASE_KEY, UIPATH_FOLDER_ID).
    On any failure it falls back to the simulated engine so the demo never breaks."""
    name = "UiPath"
    def run(self, action, target):
        try:
            body = json.dumps({"startInfo": {"ReleaseKey": os.environ["UIPATH_RELEASE_KEY"], "Strategy": "ModernJobsCount", "JobsCount": 1,
                               "InputArguments": json.dumps({"action": action, "target": target})}}).encode()
            req = urllib.request.Request(os.environ["UIPATH_URL"].rstrip("/") + "/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs",
                body, {"Content-Type": "application/json", "Authorization": "Bearer " + os.environ["UIPATH_TOKEN"],
                       "X-UIPATH-OrganizationUnitId": os.environ.get("UIPATH_FOLDER_ID", "")})
            urllib.request.urlopen(req, timeout=10).read()
            job, steps = SimulatedRPA().run(action, target)
            steps.insert(0, {"step": 0, "text": "UiPath Orchestrator job started", "status": "success", "ts": now()})
            return job, steps
        except Exception as e:
            job, steps = SimulatedRPA().run(action, target)
            steps.insert(0, {"step": 0, "text": f"UiPath unavailable ({type(e).__name__}); used simulated engine", "status": "success", "ts": now()})
            return job, steps

def get_provider():
    if os.environ.get("RPA_MODE", "simulated").lower() == "uipath" and os.environ.get("UIPATH_URL"):
        return UiPathRPA()
    return SimulatedRPA()

def mode():
    return get_provider().name
