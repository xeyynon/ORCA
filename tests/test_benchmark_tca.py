"""
Checks for benchmarks/tca.py on synthetic relative motion with a known closest approach.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import math
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.tca import (  # noqa: E402
    all_minima_root,
    brent_min,
    brent_root,
    grid_min,
    grid_quadratic,
)


class Line:
    """Straight-line relative motion: miss d0 at t0, speed v (km, s)."""

    def __init__(self, t0=12.3, d0=0.8, v=10.0):
        self.t0, self.d0, self.v = t0, d0, v
        self.calls = 0

    def _rel(self, t):
        self.calls += 1
        return np.array([self.d0, self.v * (t - self.t0), 0.0]), np.array([0.0, self.v, 0.0])

    def dist(self, t):
        return float(np.linalg.norm(self._rel(t)[0]))

    def rdot(self, t):
        dr, dv = self._rel(t)
        return float(dr @ dv)


class Wobble(Line):
    """Several minima: separation oscillates; the deepest one is at t = 3000 s."""

    def __init__(self):
        super().__init__()

    def _rel(self, t):
        self.calls += 1
        w = 2 * math.pi / 2700.0
        x = 50.0 * (1 - math.cos(w * t)) + 1.0 + 1e-3 * (t - 3000.0) ** 2 / 100.0
        dx = 50.0 * w * math.sin(w * t) + 2e-3 * (t - 3000.0) / 100.0
        return np.array([x, 0.0, 0.0]), np.array([dx, 0.0, 0.0])


class Local(unittest.TestCase):
    def test_grid_error_bounded_by_half_step(self):
        line = Line()
        t, d = grid_min(line, -60.0, 60.0, 10.0)
        self.assertLessEqual(abs(t - line.t0), 5.0 + 1e-9)
        self.assertGreaterEqual(d, line.d0)

    def test_quadratic_on_d_squared_is_exact_for_straight_line(self):
        line = Line()
        t, d = grid_quadratic(line, -60.0, 60.0, 60.0)
        self.assertAlmostEqual(t, line.t0, places=9)
        self.assertAlmostEqual(d, line.d0, places=9)

    def test_brent_methods(self):
        for fn in (lambda p: brent_min(p, -60.0, 60.0, 1e-4), lambda p: brent_root(p, -60.0, 60.0, 60.0, 1e-6)):
            line = Line()
            t, d = fn(line)
            self.assertAlmostEqual(t, line.t0, places=3)
            self.assertAlmostEqual(d, line.d0, places=6)


class Global(unittest.TestCase):
    def test_all_minima_finds_deepest(self):
        w = Wobble()
        t, d = all_minima_root(w, 0.0, 6000.0, 60.0, 1e-6)
        self.assertAlmostEqual(t, 2700.0 * round(3000.0 / 2700.0), delta=60.0)
        ts = np.arange(0.0, 6000.0, 1.0)
        self.assertLessEqual(d, min(w.dist(x) for x in ts) + 1e-6)

    def test_root_all_minima_never_worse_than_bounded_brent(self):
        # One bounded Brent run over a window with many minima returns some local minimum;
        # root-finding every minimum returns the deepest, so it can only be as close or closer.
        w = Wobble()
        t_root, d_root = all_minima_root(w, 0.0, 30000.0, 60.0, 1e-6)
        t_b, d_b = brent_min(w, 0.0, 30000.0, 1e-3)
        self.assertGreaterEqual(d_b, d_root - 1e-9)


if __name__ == "__main__":
    unittest.main()
