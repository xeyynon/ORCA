"""
The TLE database must hand back exactly the element set it was given, and ingest a catalog in one transaction.

- A reloaded TLE lost the sub-second part of its epoch, which moved every object along its track by up to ~7 km
  (the engine propagates from the epoch it is handed, while SGP4 on the original lines does not).
- insert_batch opened a connection and committed once per row: ~3 minutes for the 16,000-object catalog.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import sqlite3
import sys
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
from sgp4.api import Satrec, jday  # noqa: E402

from orbit_mech_engine import SGP4Propagator  # noqa: E402
from parser_pipeline import TLEDatabase, TLEParser  # noqa: E402

ISS = (
    "ISS (ZARYA)",
    "1 25544U 98067A   26292.51782528  .00016717  00000-0  10270-3 0  9006",
    "2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50000000    10",
)


def _tle(norad: int, day_fraction: str = "51782528"):
    """An ISS-like element set with its own NORAD id and epoch fraction."""
    name, l1, l2 = ISS
    l1 = f"1 {norad:05d}U 98067A   26292.{day_fraction}" + l1[32:]
    l2 = f"2 {norad:05d}" + l2[7:]
    tle = TLEParser.parse_lines(f"OBJ {norad}", l1, l2)
    assert tle is not None
    return tle


class _DbCase(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.db = TLEDatabase(str(Path(tmp.name) / "t.db"))


class EpochRoundTripTests(_DbCase):
    def test_a_reloaded_tle_keeps_its_epoch_to_the_millisecond(self):
        tle = _tle(25544)
        self.assertNotEqual(tle.epoch.microsecond, 0)  # the case under test: a fractional second
        self.db.insert_tle(tle)
        for loaded in (self.db.get_tle("25544"), self.db.get_all_tles()[0], self.db.search_tles("25544")[0]):
            self.assertLess(abs((loaded.epoch - tle.epoch).total_seconds()), 1e-3)

    def test_the_engine_path_agrees_with_sgp4_on_the_original_lines(self):
        tle = _tle(25544)
        self.db.insert_tle(tle)
        reference = Satrec.twoline2rv(tle.line1, tle.line2)
        propagator = SGP4Propagator(self.db.get_tle("25544").to_orbital_element())
        for hours in (0, 6, 24):
            t = tle.epoch + timedelta(hours=hours)
            jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)
            _, r_ref, _ = reference.sgp4(jd, fr)
            error_km = float(np.linalg.norm(propagator.propagate(t).r - np.array(r_ref)))
            self.assertLess(error_km, 0.001, f"{hours} h after epoch: {error_km:.3f} km")


class BatchInsertTests(_DbCase):
    def test_a_batch_uses_one_connection(self):
        tles = [_tle(40000 + k, f"{51782528 + k * 137:08d}") for k in range(50)]
        with mock.patch("parser_pipeline.sqlite3.connect", wraps=sqlite3.connect) as connect:
            self.db.insert_batch(tles)
        self.assertEqual(connect.call_count, 1)
        self.assertEqual(self.db.count_tles(), 50)

    def test_replace_overwrites_and_no_replace_keeps_the_first(self):
        first, second = _tle(40001, "10000000"), _tle(40001, "20000000")
        self.db.insert_batch([first])
        self.db.insert_batch([second], replace=False)
        self.assertEqual(self.db.count_tles(), 1)
        self.assertLess(abs((self.db.get_tle("40001").epoch - first.epoch).total_seconds()), 1e-3)
        self.db.insert_batch([second], replace=True)
        self.assertEqual(self.db.count_tles(), 1)
        self.assertLess(abs((self.db.get_tle("40001").epoch - second.epoch).total_seconds()), 1e-3)

    def test_a_failed_batch_leaves_the_catalog_as_it_was(self):
        self.db.insert_batch([_tle(40001)])
        broken = _tle(40002)
        broken.object_name = object()  # sqlite cannot bind this, so the batch fails part-way through
        with self.assertRaises(Exception):
            self.db.insert_batch([_tle(40003), broken])
        self.assertEqual(self.db.count_tles(), 1)


if __name__ == "__main__":
    unittest.main()
