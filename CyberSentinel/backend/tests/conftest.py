import os, tempfile
os.environ["CS_DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ.pop("GEMINI_API_KEY", None)
import pytest
import database, simulator

@pytest.fixture(autouse=True)
def fresh():
    database.init_db(); simulator.reset_all(); database.set_setting("automation_mode", "safe_auto")
    yield
