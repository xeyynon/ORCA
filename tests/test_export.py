"""export_conjunctions must work without /tmp, keep non-ASCII names, and remove its temp directory after sending."""
import asyncio
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import api_server  # noqa: E402


class _Event:
    def to_dict(self):
        return {
            "sat1_id": "1", "sat1_name": "A", "sat2_id": "2", "sat2_name": "B\u00e9",
            "tca": "2026-10-03T00:00:00", "min_distance_km": 1.5, "mahalanobis_distance": 0.1,
            "probability_of_collision": 1e-6, "risk_level": "LOW", "combined_hbr_km": 0.005,
        }


class ExportTests(unittest.TestCase):
    def setUp(self):
        db = mock.Mock()
        db.get_all_tles.return_value = []
        search = mock.Mock(search_catalog=lambda elements, **kwargs: [_Event()])
        for patch in (
            mock.patch.object(api_server, "db", db),
            mock.patch.object(api_server, "ConjunctionSearch", return_value=search),
        ):
            patch.start()
            self.addCleanup(patch.stop)

    def export(self, fmt):
        response = api_server.export_conjunctions(format=fmt)
        self.addCleanup(lambda: asyncio.run(response.background()))  # runs the cleanup if a test fails early
        return response

    def test_json_export_has_the_events(self):
        response = self.export("json")
        data = json.loads(Path(response.path).read_text(encoding="utf-8"))
        self.assertEqual(data[0]["risk_level"], "LOW")
        self.assertEqual(response.media_type, "application/json")

    def test_csv_export_keeps_non_ascii_names(self):
        response = self.export("csv")
        self.assertIn("B\u00e9", Path(response.path).read_text(encoding="utf-8"))

    def test_the_temp_directory_is_removed_after_sending(self):
        response = self.export("json")
        folder = Path(response.path).parent
        self.assertTrue(folder.exists())
        asyncio.run(response.background())
        self.assertFalse(folder.exists())

    def test_two_exports_do_not_share_a_file(self):
        self.assertNotEqual(self.export("json").path, self.export("json").path)

    def test_it_is_a_plain_def_so_the_search_runs_off_the_event_loop(self):
        self.assertFalse(asyncio.iscoroutinefunction(api_server.export_conjunctions))


if __name__ == "__main__":
    unittest.main()
