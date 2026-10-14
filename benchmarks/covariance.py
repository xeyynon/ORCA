"""
Measured TLE position uncertainty for Exp 4 and Exp 5, from the Exp 1 fit (covariance_model.json).

Exp 1 R2 fits sigma(h) = s0 + s1 * h per radial / in-track / cross-track axis, where h is the time since the
TLE epoch in days, for LEO Starlink and non-Starlink objects separately. Here h is each object's TLE age at
the TCA. A fit is only written when enough horizon bins exist (several snapshots); until then this raises,
so nothing silently falls back to an assumed shape.
"""
import json
from typing import Dict, List, Tuple

import numpy as np

from benchmarks.pc import ric_covariance


class MeasuredCovariance:
    def __init__(self, path: str, floor_km: float = 0.01):
        with open(path, encoding="utf-8") as f:
            model = json.load(f)
        self.fits: Dict[str, Dict[str, List[float]]] = {}
        for gp in ("starlink", "other", "all"):
            entry = model.get(f"LEO_{gp}") or {}
            if entry.get("fit"):
                self.fits[gp] = entry["fit"]
        if not self.fits:
            raise ValueError(f"{path} has no fitted LEO covariance yet: take more snapshots and rerun "
                             "benchmarks/propagation_accuracy.py --snapshots ...")
        self.path = path
        self.floor_km = floor_km  # a fitted line can go below zero at short ages

    def sigmas(self, name: str, age_days: float) -> Tuple[float, float, float]:
        """(radial, in-track, cross-track) 1-sigma in km for one object."""
        gp = "starlink" if "STARLINK" in (name or "").upper() else "other"
        fit = self.fits.get(gp) or self.fits.get("all") or next(iter(self.fits.values()))
        h = abs(age_days)
        return tuple(max(fit[c][0] + fit[c][1] * h, self.floor_km) for c in "RIC")

    def cov3(self, r: np.ndarray, v: np.ndarray, name: str, age_days: float) -> np.ndarray:
        s_r, s_i, s_c = self.sigmas(name, age_days)
        return ric_covariance(r, v, s_r, s_i, s_c)
