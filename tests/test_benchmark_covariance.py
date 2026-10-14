"""
Checks for benchmarks/covariance.py with hand-written covariance_model.json files.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import json
import os
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.covariance import MeasuredCovariance  # noqa: E402


def model_file(content):
    f = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
    json.dump(content, f)
    f.close()
    return f.name


def b(h, r, i, c, n=500):
    return {"horizon_days_median": h, "n": n, "R_sigma_km": r, "I_sigma_km": i, "C_sigma_km": c}


MODEL = {
    "LEO_starlink": {"bins": [b(0.5, 0.1, 2.0, 0.1), b(6.0, 4.0, 160.0, 0.5)]},
    "LEO_other": {"bins": [b(0.25, 0.01, 0.1, 0.01), b(1.0, 0.04, 0.4, 0.04), b(4.0, 0.16, 6.4, 0.16),
                           b(2.0, 99.0, 99.0, 99.0, n=10)]},  # too few objects: ignored
}


class Measured(unittest.TestCase):
    def setUp(self):
        self.path = model_file(MODEL)
        self.m = MeasuredCovariance(self.path)

    def tearDown(self):
        os.unlink(self.path)

    def test_hits_bin_values(self):
        np.testing.assert_allclose(self.m.sigmas("STARLINK-1234", 6.0), (4.0, 160.0, 0.5))
        np.testing.assert_allclose(self.m.sigmas("ISS (ZARYA)", 1.0), (0.04, 0.4, 0.04))

    def test_log_log_interpolation(self):
        # Halfway between 1 and 4 days in log time is 2 days; in-track 0.4 -> 6.4 gives the geometric mean 1.6.
        r, i, c = self.m.sigmas("ISS (ZARYA)", 2.0)
        self.assertAlmostEqual(r, 0.08)
        self.assertAlmostEqual(i, 1.6)

    def test_holds_ends(self):
        np.testing.assert_allclose(self.m.sigmas("ISS", 0.01), (0.01, 0.1, 0.01))
        np.testing.assert_allclose(self.m.sigmas("ISS", 30.0), (0.16, 6.4, 0.16))
        np.testing.assert_allclose(self.m.sigmas("ISS", -1.0), (0.04, 0.4, 0.04))  # age sign ignored

    def test_floor_bounds_each_axis(self):
        floored = MeasuredCovariance(self.path, floor=(0.102, 0.471, 0.126))
        np.testing.assert_allclose(floored.sigmas("ISS", 0.01), (0.102, 0.471, 0.126))   # all below the floor
        np.testing.assert_allclose(floored.sigmas("ISS", 30.0), (0.16, 6.4, 0.16))       # all above it
        np.testing.assert_allclose(floored.sigmas("STARLINK-1", 6.0), (4.0, 160.0, 0.5))

    def test_cov3_is_ric(self):
        cov = self.m.cov3(np.array([7000.0, 0, 0]), np.array([0, 7.5, 0]), "STARLINK-1", 6.0)
        np.testing.assert_allclose(np.diag(cov), [16.0, 25600.0, 0.25])

    def test_too_few_bins_refuses(self):
        p = model_file({"LEO_all": {"fit": None, "bins": [b(6.0, 1.0, 50.0, 1.0)]}})
        try:
            with self.assertRaises(ValueError):
                MeasuredCovariance(p)
        finally:
            os.unlink(p)


if __name__ == "__main__":
    unittest.main()
