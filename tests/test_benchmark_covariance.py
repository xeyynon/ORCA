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


FITTED = {
    "LEO_starlink": {"fit": {"R": [0.5, 0.5], "I": [5.0, 20.0], "C": [0.3, 0.0]}},
    "LEO_other": {"fit": {"R": [0.1, 0.02], "I": [1.0, 2.0], "C": [-0.5, 0.1]}},
}


class Measured(unittest.TestCase):
    def setUp(self):
        self.path = model_file(FITTED)

    def tearDown(self):
        os.unlink(self.path)

    def test_group_and_age(self):
        m = MeasuredCovariance(self.path)
        self.assertEqual(m.sigmas("STARLINK-1234", 2.0), (1.5, 45.0, 0.3))
        r, i, c = m.sigmas("ISS (ZARYA)", 3.0)
        self.assertAlmostEqual(r, 0.16)
        self.assertAlmostEqual(i, 7.0)
        self.assertAlmostEqual(c, 0.01)  # -0.5 + 0.3 is below the floor

    def test_cov3_is_ric(self):
        m = MeasuredCovariance(self.path)
        cov = m.cov3(np.array([7000.0, 0, 0]), np.array([0, 7.5, 0]), "STARLINK-1", 1.0)
        np.testing.assert_allclose(np.diag(cov), [1.0, 625.0, 0.09])

    def test_no_fit_refuses(self):
        p = model_file({"LEO_all": {"fit": None, "reason": "one bin"}})
        try:
            with self.assertRaises(ValueError):
                MeasuredCovariance(p)
        finally:
            os.unlink(p)


if __name__ == "__main__":
    unittest.main()
