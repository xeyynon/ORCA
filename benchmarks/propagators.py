"""
Propagators compared in Exp 1 of the research brief. Each maps (CatalogObject, datetime) -> (r, v) in km,
km/s, in the TLE's own frame (TEME), so they can be differenced directly.

  orca_engine  orbit_mech_engine.SGP4Propagator as ORCA's conjunction search uses it: two-body plus an
               exponential drag term, built from the TLE through parser_pipeline (the production path)
  j2_secular   two-body with first-order J2 secular rates of node, perigee and mean anomaly
               (a fair middle tier: the dominant LEO perturbation, nothing else)
  sgp4         the sgp4 package, the model TLEs are fitted for

J2 constants are WGS-72 (sgp4's defaults) so the elements are read as they were fitted.
"""
import math
from datetime import datetime

import numpy as np
from sgp4.api import jday

from benchmarks.legacy.orbit_mech_engine_as_built import SGP4Propagator  # ORCA as built (tag orca-as-built-2026-10-14)
from parser_pipeline import TLEParser

MU = 398600.8         # km^3/s^2, WGS-72
RE = 6378.135         # km, WGS-72
J2 = 0.001082616      # WGS-72


def sgp4_state(obj, t: datetime):
    jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)
    e, r, v = obj.satrec.sgp4(jd, fr)
    if e != 0:
        raise ValueError(f"sgp4 error {e}")
    return np.array(r), np.array(v)


class OrcaEngine:
    def __init__(self, obj):
        tle = TLEParser.parse_lines(obj.name, obj.line1, obj.line2)
        if tle is None:
            raise ValueError("ORCA's parser rejected the TLE")
        self.prop = SGP4Propagator(tle.to_orbital_element())

    def state(self, t: datetime):
        s = self.prop.propagate(t)
        return np.asarray(s.r, dtype=float), np.asarray(s.v, dtype=float)


class J2Secular:
    def __init__(self, obj):
        sat = obj.satrec
        self.epoch = obj.epoch
        # Brouwer semi-major axis and mean motion, as SGP4 uses internally (sat.a is in Earth radii).
        # The TLE's Kozai mean motion already contains part of the J2 effect, so adding J2 secular rates
        # to it double-counts (measured: ~270 km in-track error per day).
        self.a = sat.a * RE
        self.n = math.sqrt(MU / self.a ** 3)              # rad/s
        self.e, self.i = sat.ecco, sat.inclo
        self.raan0, self.argp0, self.m0 = sat.nodeo, sat.argpo, sat.mo
        p = self.a * (1.0 - self.e ** 2)
        k = 1.5 * J2 * (RE / p) ** 2 * self.n
        ci = math.cos(self.i)
        self.raan_dot = -k * ci
        self.argp_dot = 0.5 * k * (5.0 * ci * ci - 1.0)
        self.m_dot = self.n + 0.5 * k * math.sqrt(1.0 - self.e ** 2) * (3.0 * ci * ci - 1.0)

    def state(self, t: datetime):
        dt = (t - self.epoch).total_seconds()
        raan = self.raan0 + self.raan_dot * dt
        argp = self.argp0 + self.argp_dot * dt
        M = (self.m0 + self.m_dot * dt) % (2.0 * math.pi)
        e = self.e
        E = M if e < 0.8 else math.pi
        for _ in range(50):
            dE = (E - e * math.sin(E) - M) / (1.0 - e * math.cos(E))
            E -= dE
            if abs(dE) < 1e-13:
                break
        cE, sE = math.cos(E), math.sin(E)
        fac = math.sqrt(1.0 - e * e)
        r_pf = np.array([self.a * (cE - e), self.a * fac * sE, 0.0])
        rdot = math.sqrt(MU * self.a) / (self.a * (1.0 - e * cE))
        v_pf = np.array([-rdot * sE, rdot * fac * cE, 0.0])
        cO, sO, cw, sw = math.cos(raan), math.sin(raan), math.cos(argp), math.sin(argp)
        ci, si = math.cos(self.i), math.sin(self.i)
        Q = np.array([
            [cO * cw - sO * sw * ci, -cO * sw - sO * cw * ci, sO * si],
            [sO * cw + cO * sw * ci, -sO * sw + cO * cw * ci, -cO * si],
            [sw * si, cw * si, ci],
        ])
        return Q @ r_pf, Q @ v_pf


def ric_components(dr: np.ndarray, r_ref: np.ndarray, v_ref: np.ndarray):
    """Split an error vector into radial, in-track and cross-track parts of the reference state."""
    R = r_ref / np.linalg.norm(r_ref)
    C = np.cross(r_ref, v_ref)
    C /= np.linalg.norm(C)
    I = np.cross(C, R)
    return float(dr @ R), float(dr @ I), float(dr @ C)
