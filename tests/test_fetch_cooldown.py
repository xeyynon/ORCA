"""POST /api/update-tles must not start a second Celestrak fetch inside the cooldown."""
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import api_server  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from fastapi import BackgroundTasks  # noqa: E402
import asyncio  # noqa: E402


class CooldownTests(unittest.TestCase):
    def setUp(self):
        self.cache = {}
        self.db = mock.Mock()
        self.db.get_cache.side_effect = self.cache.get
        self.db.set_cache.side_effect = self.cache.__setitem__
        patcher = mock.patch.object(api_server, "db", self.db)
        patcher.start()
        self.addCleanup(patcher.stop)

    def call(self):
        return asyncio.run(api_server.update_tles(BackgroundTasks()))

    def test_first_request_starts_and_stamps(self):
        self.assertEqual(self.call()["status"], "update started")
        self.assertIn("tle_fetch_started", self.cache)

    def test_second_request_inside_cooldown_is_429(self):
        self.call()
        with self.assertRaises(HTTPException) as ctx:
            self.call()
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Retry-After", ctx.exception.headers)

    def test_request_after_cooldown_starts_again(self):
        old = datetime.utcnow() - timedelta(seconds=api_server.FETCH_COOLDOWN_S + 5)
        self.cache["tle_fetch_started"] = old.isoformat()
        self.assertEqual(self.call()["status"], "update started")

    def test_a_corrupt_stamp_does_not_block(self):
        self.cache["tle_fetch_started"] = "not a date"
        self.assertEqual(self.call()["status"], "update started")


if __name__ == "__main__":
    unittest.main()
