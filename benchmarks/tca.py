"""
Time of closest approach (TCA) methods for Exp 3 of the research brief.

Every method works on a `pair` object with two calls, so the methods can be tested on synthetic motion:
  pair.dist(t)  -> |r_j - r_i| at t seconds (km)
  pair.rdot(t)  -> (r_j - r_i) . (v_j - v_i) at t; its sign is the sign of the range rate
Each call counts as one pair evaluation (two propagations). Methods return (tca_s, miss_km).

Local methods (a window known to contain one minimum):
  grid_min        sample the window at a fixed step, keep the smallest sample
  grid_quadratic  grid, then the vertex of a parabola through d^2 at the three samples around the
                  minimum. d^2 is exactly quadratic in t for straight-line relative motion; d is not.
  brent_min       bounded Brent minimisation of d (what ORCA uses)
  brent_root      Brent root-finding of the range rate inside a sign-change bracket

Global methods (a long window with many minima):
  all_minima_root sample the range rate on a grid, root-find every - to + sign change, keep the closest
"""
import math
from typing import List, Tuple

import numpy as np
from scipy.optimize import brentq, minimize_scalar


class PropagationError(Exception):
    pass


class SGP4Pair:
    """Two sgp4 Satrec objects, times in seconds from (jd0, fr0). Counts evaluations."""

    def __init__(self, sat_i, sat_j, jd0: float, fr0: float):
        self.si, self.sj, self.jd0, self.fr0 = sat_i, sat_j, jd0, fr0
        self.calls = 0

    def _rel(self, t: float):
        self.calls += 1
        fr = self.fr0 + t / 86400.0
        e1, r1, v1 = self.si.sgp4(self.jd0, fr)
        e2, r2, v2 = self.sj.sgp4(self.jd0, fr)
        if e1 or e2:
            raise PropagationError((e1, e2))
        return (r2[0] - r1[0], r2[1] - r1[1], r2[2] - r1[2]), (v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2])

    def dist(self, t: float) -> float:
        dr, _ = self._rel(t)
        return math.sqrt(dr[0] * dr[0] + dr[1] * dr[1] + dr[2] * dr[2])

    def rdot(self, t: float) -> float:
        dr, dv = self._rel(t)
        return dr[0] * dv[0] + dr[1] * dv[1] + dr[2] * dv[2]

    def vrel(self, t: float) -> float:
        _, dv = self._rel(t)
        return math.sqrt(dv[0] * dv[0] + dv[1] * dv[1] + dv[2] * dv[2])


def _grid(lo: float, hi: float, step: float) -> np.ndarray:
    n = int(math.floor((hi - lo) / step + 1e-9))
    return lo + step * np.arange(n + 1)


def grid_min(pair, lo: float, hi: float, step: float) -> Tuple[float, float]:
    ts = _grid(lo, hi, step)
    ds = [pair.dist(t) for t in ts]
    i = int(np.argmin(ds))
    return float(ts[i]), float(ds[i])


def grid_quadratic(pair, lo: float, hi: float, step: float) -> Tuple[float, float]:
    ts = _grid(lo, hi, step)
    ds = np.array([pair.dist(t) for t in ts])
    i = int(np.argmin(ds))
    if i == 0 or i == len(ts) - 1:
        return float(ts[i]), float(ds[i])
    y0, y1, y2 = ds[i - 1] ** 2, ds[i] ** 2, ds[i + 1] ** 2
    curv = y0 - 2.0 * y1 + y2
    if curv <= 0.0:
        return float(ts[i]), float(ds[i])
    t_v = float(ts[i] + 0.5 * step * (y0 - y2) / curv)
    d_v = pair.dist(t_v)
    return (t_v, d_v) if d_v < ds[i] else (float(ts[i]), float(ds[i]))


def brent_min(pair, lo: float, hi: float, xatol: float = 1e-3) -> Tuple[float, float]:
    res = minimize_scalar(pair.dist, bounds=(lo, hi), method="bounded", options={"xatol": xatol})
    return float(res.x), float(res.fun)


def brent_root(pair, lo: float, hi: float, step: float, xtol: float = 1e-3) -> Tuple[float, float]:
    """Sample the range rate at `step`, root-find the - to + change closest in distance; fall back to brent_min."""
    roots = _rdot_minima(pair, lo, hi, step, xtol)
    if not roots:
        return brent_min(pair, lo, hi, xtol)
    return min(roots, key=lambda r: r[1])


def all_minima_root(pair, lo: float, hi: float, step: float, xtol: float = 1e-3) -> Tuple[float, float]:
    roots = _rdot_minima(pair, lo, hi, step, xtol)
    if not roots:  # monotone over the window: the minimum is at an end
        d_lo, d_hi = pair.dist(lo), pair.dist(hi)
        return (lo, d_lo) if d_lo <= d_hi else (hi, d_hi)
    return min(roots, key=lambda r: r[1])


def _rdot_minima(pair, lo: float, hi: float, step: float, xtol: float) -> List[Tuple[float, float]]:
    ts = _grid(lo, hi, step)
    fs = [pair.rdot(t) for t in ts]
    out = []
    for a, b, fa, fb in zip(ts[:-1], ts[1:], fs[:-1], fs[1:]):
        if fa < 0.0 <= fb:
            t = brentq(pair.rdot, a, b, xtol=xtol)
            out.append((float(t), pair.dist(t)))
    return out
