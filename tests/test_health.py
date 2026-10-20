"""/health says which Celestrak group the refresh button pulls, so the UI never has to guess (no network used)."""
import asyncio
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class HealthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        os.environ["ORCA_DB_PATH"] = str(Path(cls._tmp.name) / "health.db")
        os.environ["ORCA_TLE_GROUP"] = "stations"
        import api_server  # imported late: it reads the environment and opens the TLE database
        cls.api_server = api_server

    @classmethod
    def tearDownClass(cls):
        os.environ.pop("ORCA_DB_PATH", None)
        os.environ.pop("ORCA_TLE_GROUP", None)
        cls._tmp.cleanup()

    def test_reports_the_configured_group(self):
        body = asyncio.run(self.api_server.health_check())
        self.assertEqual(body["database"]["tle_group"], self.api_server.TLE_GROUP)

    def test_keeps_the_fields_clients_already_read(self):
        db = asyncio.run(self.api_server.health_check())["database"]
        for key in ("tles_count", "last_update", "last_fetch"):
            self.assertIn(key, db)


if __name__ == "__main__":
    unittest.main()
