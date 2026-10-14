"""
Regression test: a catalog conjunction search must look FORWARD from now, not from the TLE epoch.

Bug: ConjunctionSearch.search_catalog used the first object's TLE epoch as the search start, so with
a stale catalog the whole "7-day horizon" lay in the past (and disagreed with assess_pair, which
already defaulted to utcnow). The engine now records the window it searched (last_window), which is what
these tests check. Run from the repo root:  python -m unittest discover -s tests -v
"""
import math
import os
import sys
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import conjunction_detection as cd  # noqa: E402
from orbit_mech_engine import OrbitalElement  # noqa: E402


def make_elements(epoch: datetime, n: int = 3):
    """A few LEO objects on slightly different orbits, all with the given (possibly stale) epoch."""
    out = {}
    for k in range(n):
        a = 6778.0 + 3.0 * k
        out[str(1000 + k)] = (
            OrbitalElement(
                a=a, e=0.0005, i=math.radians(51.6), omega=0.0, Omega=math.radians(10.0 * k),
                M=math.radians(30.0 * k), n=math.sqrt(398600.4418 / a ** 3), epoch=epoch, bstar=1e-5,
            ),
            f"SAT-{k}",
        )
    return out


class SearchStartTest(unittest.TestCase):
    def _search(self, **kwargs):
        search = cd.ConjunctionSearch(cd.ConjunctionDetector(time_horizon_days=1))
        search.search_catalog(make_elements(datetime.utcnow() - timedelta(days=5)), **kwargs)
        return search.last_window

    def test_default_start_is_now_not_the_tle_epoch(self):
        before = datetime.utcnow()
        start, end = self._search()
        # With 5-day-old TLEs the old behaviour started 5 days ago. It must start at 'now'.
        self.assertGreaterEqual(start, before - timedelta(seconds=1))
        self.assertLessEqual(start, datetime.utcnow() + timedelta(seconds=1))
        self.assertEqual(end - start, timedelta(days=1))

    def test_explicit_start_epoch_is_respected(self):
        start = datetime(2026, 1, 1, 12, 0, 0)
        self.assertEqual(self._search(start_epoch=start)[0], start)


if __name__ == "__main__":
    unittest.main()
