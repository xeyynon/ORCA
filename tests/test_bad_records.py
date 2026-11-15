"""
One unusable element set in the catalog must not take the catalog-wide endpoints down with it
(/api/statistics, /api/conjunctions, /api/export/conjunctions): the record is skipped and the rest is served.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import asyncio
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import api_server  # noqa: E402
from parser_pipeline import TLEParser  # noqa: E402

GOOD = (
    "ISS (ZARYA)",
    "1 25544U 98067A   26292.51782528  .00016717  00000-0  10270-3 0  9006",
    "2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50000000    10",
)
# Same object with a mean motion of zero: Kepler's third law cannot give it a size.
NO_MOTION = (
    "ZERO MOTION",
    "1 99999U 98067A   26292.51782528  .00016717  00000-0  10270-3 0  9006",
    "2 99999  51.6400 208.9163 0006317  69.9862  25.2906  0.00000000    10",
)
OTHER = (
    "SECOND OBJECT",
    "1 25545U 98067A   26292.51782528  .00016717  00000-0  10270-3 0  9006",
    "2 25545  97.6400 108.9163 0006317  69.9862 125.2906 14.90000000    10",
)


def _tle(parts):
    tle = TLEParser.parse_lines(*parts)
    assert tle is not None
    return tle


class BadRecordTests(unittest.TestCase):
    def setUp(self):
        db = mock.Mock()
        db.get_all_tles.return_value = [_tle(GOOD), _tle(NO_MOTION), _tle(OTHER)]
        patch = mock.patch.object(api_server, "db", db)
        patch.start()
        self.addCleanup(patch.stop)

    def test_statistics_skip_the_unusable_record(self):
        body = asyncio.run(api_server.catalog_statistics())
        self.assertEqual(body["statistics"]["total_objects"], 2)

    def test_the_conjunction_search_screens_the_usable_records(self):
        body = api_server.search_conjunctions(time_horizon_days=1, limit=10, search_step_hours=None)
        self.assertEqual(body.objects, 2)

    def test_the_export_screens_the_usable_records(self):
        response = api_server.export_conjunctions(format="json")
        self.addCleanup(lambda: asyncio.run(response.background()))
        self.assertTrue(Path(response.path).exists())


if __name__ == "__main__":
    unittest.main()
