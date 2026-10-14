"""
Checks for benchmarks/pc.py: Foster integration against the isotropic closed form, Monte Carlo against
Foster, and the encounter-plane projection. Run from the repo root:  python -m unittest discover -s tests -v
"""
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.pc import (  # noqa: E402
    encounter_plane,
    mc_samples_needed,
    pc_foster,
    pc_isotropic_exact,
    pc_monte_carlo,
)


class FosterMatchesClosedForm(unittest.TestCase):
    def test_isotropic_cases(self):
        for miss, sigma, hbr in [(0.1, 1.0, 0.01), (1.0, 1.0, 0.01), (3.0, 1.0, 0.01),
                                 (0.005, 0.1, 0.01), (10.0, 2.0, 0.006), (0.0, 0.5, 0.02)]:
            with self.subTest(miss=miss, sigma=sigma, hbr=hbr):
                exact = pc_isotropic_exact(miss, sigma, hbr)
                foster = pc_foster(np.array([miss, 0.0]), np.eye(2) * sigma ** 2, hbr)
                self.assertAlmostEqual(foster / exact, 1.0, places=6)

    def test_anisotropic_rotation_invariance(self):
        # Rotating both the miss vector and the covariance must not change Pc (the disc is symmetric).
        cov = np.array([[4.0, 0.0], [0.0, 0.04]])
        miss = np.array([0.3, 0.1])
        th = 0.7
        R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]])
        a = pc_foster(miss, cov, 0.02)
        b = pc_foster(R @ miss, R @ cov @ R.T, 0.02)
        self.assertAlmostEqual(a / b, 1.0, places=8)

    def test_zero_radius(self):
        self.assertEqual(pc_foster(np.array([0.1, 0.0]), np.eye(2), 0.0), 0.0)


class MonteCarloAgreesWithFoster(unittest.TestCase):
    def test_within_interval(self):
        miss, cov, hbr = np.array([0.05, 0.02]), np.array([[0.01, 0.002], [0.002, 0.0025]]), 0.02
        foster = pc_foster(miss, cov, hbr)
        res = pc_monte_carlo(miss, cov, hbr, 400_000, rng=np.random.default_rng(1), confidence=0.999)
        self.assertGreater(res.hits, 100)
        self.assertLessEqual(res.ci_low, foster)
        self.assertGreaterEqual(res.ci_high, foster)

    def test_zero_hits_interval(self):
        res = pc_monte_carlo(np.array([50.0, 0.0]), np.eye(2), 0.01, 10_000, rng=np.random.default_rng(2))
        self.assertEqual(res.hits, 0)
        self.assertEqual(res.ci_low, 0.0)
        self.assertGreater(res.ci_high, 0.0)

    def test_samples_needed(self):
        # Pc = 1e-6 at 10 % relative error needs about 1e8 draws.
        self.assertAlmostEqual(mc_samples_needed(1e-6, 0.1) / 1e8, 1.0, places=3)


class EncounterPlane(unittest.TestCase):
    def test_projection(self):
        v = np.array([0.0, 7.5, 0.0])
        r = np.array([0.3, 2.0, -0.4])  # the along-velocity part (2.0) must drop out
        cov3 = np.diag([1.0, 25.0, 0.04])
        miss, cov2 = encounter_plane(r, v, cov3)
        self.assertAlmostEqual(miss[0], 0.5, places=12)
        self.assertAlmostEqual(miss[1], 0.0, places=12)
        # In-plane covariance keeps the x/z variances and discards the along-track 25.0.
        self.assertAlmostEqual(np.trace(cov2), 1.04, places=12)

    def test_parallel_miss(self):
        miss, _ = encounter_plane(np.array([0.0, 3.0, 0.0]), np.array([0.0, 1.0, 0.0]), np.eye(3))
        self.assertAlmostEqual(np.linalg.norm(miss), 0.0, places=12)


if __name__ == "__main__":
    unittest.main()
