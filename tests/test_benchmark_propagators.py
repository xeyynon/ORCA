"""
Checks for benchmarks/propagators.py on an ISS-like TLE.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import math
import os
import sys
import unittest
from datetime import timedelta

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import CatalogObject, _jd_to_datetime  # noqa: E402
from benchmarks.propagators import J2Secular, OrcaEngine, ric_components, sgp4_state  # noqa: E402
from sgp4.api import Satrec  # noqa: E402

# ISS (ZARYA) element set in the standard TLE format (checksums valid)
L1 = "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927"
L2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"


def iss():
    sat = Satrec.twoline2rv(L1, L2)
    return CatalogObject("25544", "ISS (ZARYA)", L1, L2, sat, _jd_to_datetime(sat.jdsatepoch, sat.jdsatepochF))


class J2Rates(unittest.TestCase):
    def test_iss_nodal_regression(self):
        # ISS-like orbits regress about -5 degrees per day under J2.
        p = J2Secular(iss())
        self.assertAlmostEqual(math.degrees(p.raan_dot) * 86400.0, -5.0, delta=0.3)

    def test_rates_match_sgp4_secular_rates(self):
        # SGP4 exposes its own secular rates (rad/min); first-order J2 should agree closely.
        o = iss()
        p = J2Secular(o)
        self.assertAlmostEqual(p.m_dot * 60.0 / o.satrec.mdot, 1.0, delta=1e-5)
        self.assertAlmostEqual(p.raan_dot * 60.0 / o.satrec.nodedot, 1.0, delta=1e-2)
        self.assertAlmostEqual(p.argp_dot * 60.0 / o.satrec.argpdot, 1.0, delta=1e-2)

    def test_close_to_sgp4_at_epoch_and_drifts_slowly(self):
        o = iss()
        p = J2Secular(o)
        d0 = np.linalg.norm(p.state(o.epoch)[0] - sgp4_state(o, o.epoch)[0])
        d1 = np.linalg.norm(p.state(o.epoch + timedelta(hours=24))[0]
                            - sgp4_state(o, o.epoch + timedelta(hours=24))[0])
        self.assertLess(d0, 30.0)       # mean vs osculating elements: tens of km at most
        self.assertLess(d1, 300.0)      # J2 secular keeps the plane: far below two-body drift

    def test_energy_consistent_velocity(self):
        o = iss()
        r, v = J2Secular(o).state(o.epoch)
        a = 1.0 / (2.0 / np.linalg.norm(r) - v @ v / 398600.8)
        self.assertAlmostEqual(a, J2Secular(o).a, delta=1e-6)


class OrcaAdapter(unittest.TestCase):
    def test_runs_and_is_near_sgp4_at_epoch(self):
        o = iss()
        r, _ = OrcaEngine(o).state(o.epoch)
        self.assertLess(np.linalg.norm(r - sgp4_state(o, o.epoch)[0]), 250.0)


class RIC(unittest.TestCase):
    def test_axes(self):
        r, v = np.array([7000.0, 0, 0]), np.array([0, 7.5, 0])
        self.assertEqual(ric_components(np.array([1.0, 2.0, 3.0]), r, v), (1.0, 2.0, 3.0))


if __name__ == "__main__":
    unittest.main()
