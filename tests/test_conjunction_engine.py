"""
Checks for the corrected conjunction engine (conjunction_detection.py) and the real SGP4 propagator.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import math
import os
import sys
import unittest
from datetime import datetime, timedelta

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import conjunction_detection as cd  # noqa: E402
from orbit_mech_engine import OrbitalElement, SGP4Propagator  # noqa: E402
from parser_pipeline import TLEParser  # noqa: E402
from sgp4.api import Satrec, jday  # noqa: E402

EPOCH = datetime(2026, 10, 10, 0, 0, 0)
A = 6928.0  # km, ~550 km altitude
N = math.sqrt(398600.4418 / A ** 3)


def element(inc_deg: float, raan_deg: float = 40.0) -> OrbitalElement:
    """Near-circular orbit at the ascending node at EPOCH."""
    return OrbitalElement(a=A, e=0.0001, i=math.radians(inc_deg), omega=0.0, Omega=math.radians(raan_deg),
                          M=0.0, n=N, epoch=EPOCH, bstar=0.0)


def crossing_pair(inc2_deg: float):
    """Two objects that are both at the same ascending node at EPOCH: they meet there."""
    return {"1": (element(53.0), "SAT-A"), "2": (element(inc2_deg), "SAT-B")}


class SGP4PropagatorIsSGP4(unittest.TestCase):
    def test_matches_twoline2rv(self):
        l1 = "1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927"
        l2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"
        oe = TLEParser.parse_lines("ISS", l1, l2).to_orbital_element()
        ref, prop = Satrec.twoline2rv(l1, l2), SGP4Propagator(oe)
        for h in (0, 24, 168):
            t = oe.epoch + timedelta(hours=h)
            _, r, _ = ref.sgp4(*jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6))
            self.assertLess(np.linalg.norm(prop.propagate(t).r - np.array(r)), 1e-3)  # under a metre


class FindsTheEncounter(unittest.TestCase):
    def test_fast_crossing(self):
        search = cd.ConjunctionSearch(cd.ConjunctionDetector(time_horizon_days=0.25))
        events = search.search_catalog(crossing_pair(97.0), start_epoch=EPOCH - timedelta(hours=1))
        near = [e for e in events if abs((e.tca - EPOCH).total_seconds()) < 120]
        self.assertTrue(near, f"no event near the planted crossing; stats {search.last_stats}")
        ev = min(near, key=lambda e: e.min_distance)
        self.assertLess(ev.min_distance, cd.REPORT_KM)
        # Crossing angle 44 deg at ~7.6 km/s: |dv| = 2 v sin(22 deg) ~ 5.7 km/s
        self.assertAlmostEqual(ev.relative_velocity_kms, 2 * 7.59 * math.sin(math.radians(22.0)), delta=0.3)
        self.assertFalse(ev.long_encounter)
        self.assertEqual(ev.risk_level, cd.risk_level(ev.probability_of_collision))
        self.assertGreater(ev.uncertainty_km, 0)
        self.assertEqual(search.last_stats["total_events"], len(events))

    def test_slow_encounter_is_flagged_and_reported_once(self):
        # Nearly the same orbit: a slow, co-moving encounter that repeats every half orbit
        search = cd.ConjunctionSearch(cd.ConjunctionDetector(time_horizon_days=0.25))
        events = search.search_catalog(crossing_pair(53.001), start_epoch=EPOCH - timedelta(hours=1))
        slow = [e for e in events if e.long_encounter]
        self.assertTrue(slow)
        self.assertEqual(len(slow), 1)  # one row per co-moving pair, its closest approach
        self.assertLess(slow[0].relative_velocity_kms, cd.LONG_ENCOUNTER_KMS)

    def test_assess_pair_agrees_with_the_search(self):
        pair = crossing_pair(97.0)
        start = EPOCH - timedelta(hours=1)
        det = cd.ConjunctionDetector(time_horizon_days=0.25)
        ev = det.assess_pair(pair["1"][0], pair["2"][0], "SAT-A", "SAT-B", "1", "2", start_epoch=start)
        best = min(cd.ConjunctionSearch(det).search_catalog(pair, start_epoch=start), key=lambda e: e.min_distance)
        self.assertIsNotNone(ev)
        self.assertAlmostEqual(ev.min_distance, best.min_distance, places=6)

    def test_far_apart_objects_give_nothing(self):
        far = {"1": (element(53.0, 0.0), "A"), "2": (element(53.0, 0.0), "B")}
        far["2"][0].a, far["2"][0].n = 42164.0, math.sqrt(398600.4418 / 42164.0 ** 3)  # GEO vs LEO
        self.assertEqual(cd.ConjunctionSearch(cd.ConjunctionDetector(time_horizon_days=0.25))
                         .search_catalog(far, start_epoch=EPOCH), [])


class ProbabilityAndUncertainty(unittest.TestCase):
    def test_vectorised_pc_matches_quadrature(self):
        rng = np.random.default_rng(3)
        for _ in range(20):
            sx, sy = rng.uniform(0.1, 3.0, 2)
            th = rng.uniform(0, math.pi)
            R = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
            cov = R @ np.diag([sx ** 2, sy ** 2]) @ R.T
            miss = rng.uniform(-2, 2, 2)
            hbr = 0.01
            pc, _, _ = cd.collision_probability(miss[None], cov[None], np.array([hbr]))
            # Vectorised Gauss-Legendre against adaptive quadrature, including misses many sigma away
            self.assertAlmostEqual(pc[0] / cd.pc_foster(miss, cov, hbr), 1.0, places=5)

    def test_quadrature_used_when_radius_is_not_small(self):
        pc, _, _ = cd.collision_probability(np.array([[0.0, 0.0]]), np.eye(2)[None] * 1e-4, np.array([0.05]))
        # sigma 10 m, radius 50 m, centred: almost certain hit, which the small-radius form would get badly wrong
        self.assertAlmostEqual(pc[0], 1 - math.exp(-0.5 * (0.05 / 0.01) ** 2), places=6)

    def test_uncertainty_floor_and_growth(self):
        floor = cd.CovarianceModel.FLOOR
        young = cd.CovarianceModel.sigmas("ISS (ZARYA)", 0.1)
        old = cd.CovarianceModel.sigmas("ISS (ZARYA)", 6.0)
        self.assertTrue(all(a >= f for a, f in zip(young, floor)))
        self.assertGreater(old[1], young[1])
        self.assertGreater(cd.CovarianceModel.sigmas("STARLINK-1", 6.0)[1], old[1])

    def test_tiers(self):
        self.assertEqual([cd.risk_level(p) for p in (2e-4, 2e-5, 2e-6, 2e-7, 1e-9)],
                         ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NEGLIGIBLE"])

    def test_method_description_is_filled_in(self):
        d = cd.method_description()
        self.assertEqual(d["step_s"], cd.STEP_S)
        self.assertNotIn("{", d["screening"] + " ".join(d["limits"]))


if __name__ == "__main__":
    unittest.main()
