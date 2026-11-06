"""
/api/catalog-distributions: per-object columns for the WHOLE stored catalog (the Analytics charts used to be drawn from
the first 5,000 rows only). Raw values, not bins, so the browser's tested lib code stays the one place that bins.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import api_server  # noqa: E402
from Analytics import catalog_columns  # noqa: E402

COLUMNS = ("name", "epoch_unix_s", "inclination_deg", "eccentricity", "mean_motion_rev_per_day")


def tle(name="ISS (ZARYA)", epoch=datetime(2026, 11, 1, 12, 0, 0), incl=51.6416, ecc=0.0007536, mm=15.49484232):
    return SimpleNamespace(object_name=name, epoch=epoch, inclination=incl, eccentricity=ecc, mean_motion=mm)


class ColumnTests(unittest.TestCase):
    def test_columns_are_parallel_and_carry_units_in_their_names(self):
        out = catalog_columns([tle(), tle("STARLINK-1", incl=53.0, ecc=0.0001, mm=15.06)])
        self.assertEqual(out["count"], 2)
        for c in COLUMNS:
            self.assertEqual(len(out[c]), 2, c)
        self.assertEqual(out["name"], ["ISS (ZARYA)", "STARLINK-1"])
        self.assertEqual(out["inclination_deg"], [51.6416, 53.0])
        self.assertEqual(out["mean_motion_rev_per_day"][1], 15.06)

    def test_epoch_is_unix_seconds_utc(self):
        want = int(datetime(2026, 11, 1, 12, 0, 0, tzinfo=timezone.utc).timestamp())
        self.assertEqual(catalog_columns([tle()])["epoch_unix_s"], [want])

    def test_an_aware_epoch_is_converted_to_utc_not_read_as_local(self):
        aware = datetime.fromisoformat("2026-11-01T14:00:00+02:00")  # 12:00 UTC
        self.assertEqual(catalog_columns([tle(epoch=aware)])["epoch_unix_s"], catalog_columns([tle()])["epoch_unix_s"])

    def test_values_are_rounded_to_tle_precision(self):
        out = catalog_columns([tle(incl=51.641612345, ecc=0.000753612345, mm=15.494842321234)])
        self.assertEqual(out["inclination_deg"], [51.6416])
        self.assertEqual(out["eccentricity"], [0.0007536])
        self.assertEqual(out["mean_motion_rev_per_day"], [15.49484232])

    def test_an_empty_catalog_gives_empty_columns(self):
        out = catalog_columns([])
        self.assertEqual(out["count"], 0)
        self.assertTrue(all(out[c] == [] for c in COLUMNS))


class EndpointTests(unittest.TestCase):
    def setUp(self):
        api_server._distributions_cache.clear()
        self.addCleanup(api_server._distributions_cache.clear)
        self.db = mock.Mock()
        self.db.count_tles.return_value = 6000
        self.db.get_cache.return_value = "2026-11-01T00:00:00"
        self.db.get_all_tles.return_value = [tle(f"SAT-{k}") for k in range(6000)]
        patch = mock.patch.object(api_server, "db", self.db)
        patch.start()
        self.addCleanup(patch.stop)

    def test_it_covers_the_whole_catalog_not_the_first_5000(self):
        out = api_server.catalog_distributions()
        self.assertEqual(out["count"], 6000)
        self.assertEqual(len(out["name"]), 6000)
        self.db.get_all_tles.assert_called_once_with()  # no limit passed

    def test_it_is_cached_per_catalog_version(self):
        api_server.catalog_distributions()
        api_server.catalog_distributions()
        self.assertEqual(self.db.get_all_tles.call_count, 1)
        self.db.count_tles.return_value = 6001  # the catalog changed
        api_server.catalog_distributions()
        self.assertEqual(self.db.get_all_tles.call_count, 2)

    def test_it_is_behind_the_login_guard(self):
        route = next(r for r in api_server.app.routes if getattr(r, "path", "") == "/api/catalog-distributions")
        self.assertNotIn(route.path, api_server.PUBLIC_PATHS)
        self.assertIn(api_server.require_auth, [d.dependency for d in api_server.app.router.dependencies])


if __name__ == "__main__":
    unittest.main()
