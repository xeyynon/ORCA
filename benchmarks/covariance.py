"""
Measured TLE position uncertainty for Exp 4 and Exp 5, from Exp 1 (covariance_model.json).

Exp 1 R2 measures the robust spread of TLE-to-TLE errors per radial / in-track / cross-track axis in
horizon bins, for LEO Starlink and non-Starlink objects. Here each object's sigma at a given TLE age is
interpolated between the bin medians in log-log space: the growth is far from linear (non-Starlink in-track:
0.16 km at 0.3 d, 14.6 km at 6.3 d), so the straight-line fit also stored in the file is not used.
Outside the measured range the end values are held, not extrapolated. Only bins with at least `min_n`
objects count, and a group needs two of them; otherwise it falls back to "all", and with no usable group
this raises, so nothing silently falls back to an assumed shape.
"""
import json
import math
from typing import Dict, List, Tuple

import numpy as np

from benchmarks.pc import ric_covariance

Point = Tuple[float, float, float, float]  # (horizon_days, sigma_R, sigma_I, sigma_C)


class MeasuredCovariance:
    def __init__(self, path: str, min_n: int = 100):
        with open(path, encoding="utf-8") as f:
            model = json.load(f)
        self.points: Dict[str, List[Point]] = {}
        for gp in ("starlink", "other", "all"):
            bins = (model.get(f"LEO_{gp}") or {}).get("bins") or []
            pts = sorted((b["horizon_days_median"], b["R_sigma_km"], b["I_sigma_km"], b["C_sigma_km"])
                         for b in bins if b.get("n", 0) >= min_n and b["horizon_days_median"] > 0)
            if len(pts) >= 2:
                self.points[gp] = pts
        if not self.points:
            raise ValueError(f"{path} has fewer than two LEO horizon bins with n >= {min_n}: take more snapshots "
                             "and rerun benchmarks/propagation_accuracy.py --snapshots ...")
        self.path = path

    def sigmas(self, name: str, age_days: float) -> Tuple[float, float, float]:
        """(radial, in-track, cross-track) 1-sigma in km for one object at this TLE age."""
        gp = "starlink" if "STARLINK" in (name or "").upper() else "other"
        pts = self.points.get(gp) or self.points.get("all") or next(iter(self.points.values()))
        h = abs(age_days)
        if h <= pts[0][0]:
            return pts[0][1:]
        if h >= pts[-1][0]:
            return pts[-1][1:]
        for lo, hi in zip(pts[:-1], pts[1:]):
            if lo[0] <= h <= hi[0]:
                w = (math.log(h) - math.log(lo[0])) / (math.log(hi[0]) - math.log(lo[0]))
                return tuple(math.exp((1 - w) * math.log(a) + w * math.log(b)) for a, b in zip(lo[1:], hi[1:]))
        return pts[-1][1:]

    def cov3(self, r: np.ndarray, v: np.ndarray, name: str, age_days: float) -> np.ndarray:
        s_r, s_i, s_c = self.sigmas(name, age_days)
        return ric_covariance(r, v, s_r, s_i, s_c)
