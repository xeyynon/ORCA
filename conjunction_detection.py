"""
Conjunction screening and collision probability for ORCA.

Rebuilt in 2026-10 from the benchmark results in MD/research_paper_brief.md. ORCA as built before that (1 h
snapshot screening, a two-body propagator, a single +-6 h Brent refinement, a 2D Pc formula off by 1/alpha^2)
is frozen in benchmarks/legacy/ and tagged orca-as-built-2026-10-14.

Method:
1. Propagation: SGP4 (sgp4 package) for every object on a fixed grid of STEP_S seconds.
2. Screening: at each grid time a KD-tree finds every pair closer than R = report_km + v_max * STEP_S / 2.
   v_max bounds the relative speed of any two catalog objects (twice the fastest perigee speed), so an approach
   closer than report_km always has a grid sample inside R: none falls between samples (Exp 2b of the brief).
3. Closest approach: at each grid local minimum of the separation, the vertex of a parabola through d^2 at the
   three samples around it locates the time (d^2 is exactly quadratic for straight-line relative motion). Both
   objects are then propagated exactly at that time, one range-rate (Newton) step corrects it, and the miss
   distance, relative velocity and states are taken from SGP4 at the corrected time (Exp 3).
4. Collision probability: the 2D Gaussian of the relative position, integrated over the combined hard-body disc
   in the encounter plane (Foster). Closed small-radius form when the radius is well below the uncertainty,
   numerical quadrature otherwise. Each object's uncertainty comes from CovarianceModel (measured, see there).
5. Risk tiers: Pc above 1e-4 / 1e-5 / 1e-6 / 1e-7. NASA's CA Handbook (NASA/SP-20205011318, 2020) recommends
   mitigation above 1e-4.

Limits that travel with every result: TLEs carry no covariance, so every Pc is conditional on the assumed
uncertainty; NASA does not recommend TLE-based conjunction assessment for operations; encounters slower than
LONG_ENCOUNTER_KMS are long encounters, where the straight-line 2D model is unreliable, and are flagged.
"""

import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy import integrate
from scipy.special import erfc
from scipy.spatial import cKDTree
from sgp4.api import SatrecArray, jday

from orbit_mech_engine import OrbitalElement, satrec_from_elements

STEP_S = 20.0                 # screening grid step, seconds
REPORT_KM = 10.0              # report every approach closer than this
LONG_ENCOUNTER_KMS = 0.1      # below this relative speed the 2D (short-encounter) Pc is unreliable
MU = 398600.4418              # km^3/s^2
_CHUNK = 120                  # grid steps propagated per batch (memory: objects x 120 x 3 doubles)
_ESTIMATE_MARGIN_KM = 5.0     # the parabola locates TCA well but its minimum value is approximate: cut late

METHOD = {
    "propagator": "SGP4, the standard model for public TLEs (the sgp4 package, which follows Vallado et al. 2006). "
                  "Positions are in the TEME reference frame.",
    "screening": "Every object's position is calculated every {step:g} s and nearby pairs are picked out with a KD-tree. "
                 "The search radius is the report distance plus how far a fast object can move in half a step, so no "
                 "approach closer than the report distance can slip between two samples.",
    "closest_approach": "For each close pair, a parabola fitted to the squared distance at the three samples around the "
                        "minimum gives the time of closest approach. SGP4 is then run exactly at that time, with one "
                        "correction for how fast the distance is still changing.",
    "collision_probability": "Foster's 2D method: the chance that the objects' uncertain (Gaussian) relative position falls "
                             "inside their combined hard-body disc, seen in the plane of the encounter. A closed-form "
                             "formula is used when the disc is small, numerical integration otherwise.",
    "uncertainty": "Each object gets a radial, in-track and cross-track position uncertainty that grows with TLE age. The "
                   "values are measured from successive public TLEs (LEO, 2026-10-14) and never fall below ESA's "
                   "published uncertainty at TLE epoch.",
    "risk_tiers": "CRITICAL above 1e-4, HIGH above 1e-5, MEDIUM above 1e-6, LOW above 1e-7, otherwise NEGLIGIBLE. "
                  "NASA's CA Handbook (2020) recommends mitigation above 1e-4.",
    "limits": [
        "TLEs come with no error estimate, so every Pc and tier depends on the assumed uncertainty above.",
        "NASA does not recommend TLE-based conjunction assessment for operational decisions.",
        "Encounters slower than {long:g} km/s are long encounters. Their 2D Pc is unreliable, so they are flagged.",
        "Public Starlink TLEs are about 15 times less accurate in-track than other LEO TLEs of the same age.",
    ],
}


# ===========================================
# DATA STRUCTURE
# ===========================================
@dataclass
class ConjunctionEvent:
    """One close approach between two objects."""
    sat1_id: str
    sat1_name: str
    sat2_id: str
    sat2_name: str
    tca: datetime  # Time of closest approach (UTC, naive)
    min_distance: float  # Miss distance (km)
    mahalanobis_distance: float  # Miss distance in units of the encounter-plane uncertainty
    probability_of_collision: float  # Collision probability [0, 1], conditional on the uncertainty model
    risk_level: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW", "NEGLIGIBLE"
    sat1_hbr: float  # Hard-body radius (km)
    sat2_hbr: float  # Hard-body radius (km)
    combined_hbr: float  # Sum of hard-body radii
    relative_velocity_kms: float = 0.0  # |v1 - v2| at TCA (km/s)
    tle_age_days: float = 0.0  # Age of the older of the two TLEs at TCA
    uncertainty_km: float = 0.0  # 1-sigma of the combined uncertainty along its widest axis in the encounter plane
    long_encounter: bool = False  # Relative speed below LONG_ENCOUNTER_KMS: the 2D Pc is unreliable

    def to_dict(self) -> Dict:
        return {
            'sat1_id': self.sat1_id,
            'sat1_name': self.sat1_name,
            'sat2_id': self.sat2_id,
            'sat2_name': self.sat2_name,
            'tca': self.tca.isoformat(),
            'min_distance_km': round(self.min_distance, 6),
            'mahalanobis_distance': round(self.mahalanobis_distance, 3),
            'probability_of_collision': float(f"{self.probability_of_collision:.6g}"),
            'risk_level': self.risk_level,
            'combined_hbr_km': round(self.combined_hbr, 4),
            'relative_velocity_kms': round(self.relative_velocity_kms, 4),
            'tle_age_days': round(self.tle_age_days, 3),
            'uncertainty_km': round(self.uncertainty_km, 4),
            'long_encounter': self.long_encounter,
        }


# ===========================================
# HARD-BODY RADIUS MODELS
# ===========================================
class HardBodyRadiusModel:
    """
    Estimates hard-body radius (collision avoidance radius) based on satellite class.
    """
    MODELS = {
        'starlink': 0.00565,   # km
        'oneweb': 0.00400,
        'iridium': 0.00390,
        'cubesat': 0.00050,
        'debris': 0.00010,
        'generic': 0.00300,
    }

    @classmethod
    def estimate(cls, object_name: str, norad_id: Optional[str] = None) -> float:
        name_lower = (object_name or "").lower()
        for keyword, hbr in cls.MODELS.items():
            if keyword in name_lower:
                return hbr
        return cls.MODELS['generic']


# ===========================================
# UNCERTAINTY MODEL
# ===========================================
class CovarianceModel:
    """
    Per-object 1-sigma position uncertainty (km) along radial, in-track and cross-track, by TLE age.

    Measured: robust spread of SGP4 TLE-to-TLE errors for LEO objects across three CelesTrak snapshots taken on
    2026-10-14 (benchmarks/results/propagation_20261014T064759Z_to_20261014T174434Z_3snap). Values are interpolated
    in log-log space between horizon bins, held at the ends, and made non-decreasing with age.
    Floored at ESA's at-epoch LEO TLE uncertainties (Flohrer et al. 2009, ESA SP-672: 0.102 / 0.471 / 0.126 km),
    because TLE-to-TLE comparison underestimates error near epoch (Kelso 2007, AAS 07-127).
    Starlink and other objects differ ~15x in-track and are kept apart. Only LEO was measured; other regimes reuse it.
    To update: rerun benchmarks/refresh_measured.ps1 and copy the bins from its covariance_model.json.
    """
    # (age_days, radial, in-track, cross-track)
    MEASURED = {
        'starlink': [(0.327, 0.1116, 2.657, 0.0789), (0.716, 0.1545, 7.259, 0.1117), (1.046, 0.2751, 20.25, 0.1320),
                     (6.333, 3.923, 172.2, 0.4934), (7.178, 2.110, 130.9, 0.3675)],
        'other': [(0.331, 0.01369, 0.1603, 0.01424), (0.674, 0.02995, 0.3109, 0.04412),
                  (6.288, 0.1363, 14.63, 0.2063)],
    }
    FLOOR = (0.102, 0.471, 0.126)

    @classmethod
    def group(cls, name: str) -> str:
        return 'starlink' if 'STARLINK' in (name or '').upper() else 'other'

    @classmethod
    def _curve(cls, group: str, age_days: np.ndarray) -> np.ndarray:
        pts = cls.MEASURED[group]
        ages = np.array([p[0] for p in pts])
        vals = np.maximum.accumulate(np.array([p[1:] for p in pts]), axis=0)
        h = np.clip(np.abs(age_days), ages[0], ages[-1])
        out = np.column_stack([np.exp(np.interp(np.log(h), np.log(ages), np.log(vals[:, c]))) for c in range(3)])
        return np.maximum(out, np.array(cls.FLOOR))

    @classmethod
    def sigmas(cls, name: str, age_days: float) -> Tuple[float, float, float]:
        return tuple(float(x) for x in cls._curve(cls.group(name), np.array([age_days]))[0])

    @classmethod
    def sigmas_array(cls, is_starlink: np.ndarray, age_days: np.ndarray) -> np.ndarray:
        """(m,3) sigmas for m objects at the given ages; is_starlink selects the curve per object."""
        out = cls._curve('other', age_days)
        if np.any(is_starlink):
            out[is_starlink] = cls._curve('starlink', age_days[is_starlink])
        return out


# ===========================================
# COLLISION PROBABILITY
# ===========================================
def _unit(v: np.ndarray) -> np.ndarray:
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def _ric_covariance(r: np.ndarray, v: np.ndarray, sig: np.ndarray) -> np.ndarray:
    """(m,3,3) covariance from (m,3) positions, velocities and radial / in-track / cross-track sigmas."""
    R = _unit(r)
    C = _unit(np.cross(r, v))
    I = np.cross(C, R)
    Q = np.stack([R, I, C], axis=-1)  # columns are the RIC axes
    return np.einsum('mik,mk,mjk->mij', Q, sig ** 2, Q)


def _encounter_plane(r_rel: np.ndarray, v_rel: np.ndarray, cov3: np.ndarray):
    """Project (m,3) miss vectors and (m,3,3) covariances onto the plane normal to the relative velocity."""
    vhat = _unit(v_rel)
    r_perp = r_rel - np.sum(r_rel * vhat, axis=-1, keepdims=True) * vhat
    norm = np.linalg.norm(r_perp, axis=-1, keepdims=True)
    trial = np.where(np.abs(vhat[:, :1]) < 0.9, np.array([[1.0, 0.0, 0.0]]), np.array([[0.0, 1.0, 0.0]]))
    e1 = np.where(norm > 1e-12, r_perp / np.where(norm > 0, norm, 1.0), _unit(np.cross(vhat, trial)))
    e2 = np.cross(vhat, e1)
    B = np.stack([e1, e2], axis=1)  # (m,2,3)
    miss2 = np.einsum('mij,mj->mi', B, r_rel)
    cov2 = np.einsum('mij,mjk,mlk->mil', B, cov3, B)
    return miss2, cov2


def pc_foster(miss2: np.ndarray, cov2: np.ndarray, hbr: float) -> float:
    """Exact 2D Pc: Gaussian N(miss2, cov2) over the disc |x| <= hbr, by 1D quadrature on the principal axes."""
    eigval, eigvec = np.linalg.eigh(cov2)
    mx, my = (float(c) for c in eigvec.T @ miss2)
    sx, sy = (float(c) for c in np.sqrt(eigval))
    k = 1.0 / (sx * math.sqrt(2.0 * math.pi))
    r2 = 1.0 / math.sqrt(2.0)

    def integrand(x: float) -> float:
        h = math.sqrt(max(hbr * hbr - x * x, 0.0))
        lo, hi = (-h - my) / sy, (h - my) / sy
        if lo + hi <= 0.0:
            mass = 0.5 * (math.erfc(-hi * r2) - math.erfc(-lo * r2))
        else:
            mass = 0.5 * (math.erfc(lo * r2) - math.erfc(hi * r2))
        z = (x - mx) / sx
        return k * math.exp(-0.5 * z * z) * mass

    pc, _ = integrate.quad(integrand, -hbr, hbr, epsabs=0.0, epsrel=1e-10, limit=200)
    return float(min(max(pc, 0.0), 1.0))


_GL_X, _GL_W = np.polynomial.legendre.leggauss(32)


def _pc_foster_gl(miss2: np.ndarray, cov2: np.ndarray, hbr: np.ndarray) -> np.ndarray:
    """
    Foster's 1D integral, vectorised: on the covariance principal axes,
    Pc = int_{-R}^{R} phi(x; mx, sx) [Phi((h - my)/sy) - Phi((-h - my)/sy)] dx,  h = sqrt(R^2 - x^2),
    with x = R sin(theta) so the integrand is smooth, and 32-point Gauss-Legendre in theta. Accurate to
    ~1e-6 relative when the radius is small against the uncertainty, at any miss distance.
    """
    eigval, eigvec = np.linalg.eigh(cov2)                       # ascending; columns are the axes
    mu = np.einsum('mji,mj->mi', eigvec, miss2)                 # miss on the principal axes
    sx, sy = np.sqrt(eigval[:, 0])[:, None], np.sqrt(eigval[:, 1])[:, None]
    mx, my = mu[:, :1], mu[:, 1:]
    R = hbr[:, None]
    th = 0.5 * math.pi * _GL_X[None, :]                        # nodes on [-pi/2, pi/2]
    x, h = R * np.sin(th), R * np.cos(th)
    lo, hi = (-h - my) / sy, (h - my) / sy
    r2 = 1.0 / math.sqrt(2.0)
    mass = np.where(lo + hi <= 0.0,
                    0.5 * (erfc(-hi * r2) - erfc(-lo * r2)),
                    0.5 * (erfc(lo * r2) - erfc(hi * r2)))      # tail form: no cancellation
    z = (x - mx) / sx
    f = np.exp(-0.5 * z * z) / (sx * math.sqrt(2.0 * math.pi)) * mass * R * np.cos(th)
    return 0.5 * math.pi * np.sum(f * _GL_W[None, :], axis=1)


def collision_probability(miss2: np.ndarray, cov2: np.ndarray, hbr: np.ndarray):
    """Vectorised Pc, Mahalanobis distance and widest 1-sigma for (m,2) misses and (m,2,2) covariances."""
    det = cov2[:, 0, 0] * cov2[:, 1, 1] - cov2[:, 0, 1] * cov2[:, 1, 0]
    inv = np.stack([np.stack([cov2[:, 1, 1], -cov2[:, 0, 1]], -1),
                    np.stack([-cov2[:, 1, 0], cov2[:, 0, 0]], -1)], 1) / det[:, None, None]
    maha2 = np.einsum('mi,mij,mj->m', miss2, inv, miss2)
    eig = np.linalg.eigvalsh(cov2)
    pc = _pc_foster_gl(miss2, cov2, hbr)
    # Radius not small against the uncertainty: the fixed rule is not enough, use adaptive quadrature
    for m in np.flatnonzero(hbr > 0.1 * np.sqrt(eig[:, 0])):
        pc[m] = pc_foster(miss2[m], cov2[m], float(hbr[m]))
    return np.clip(pc, 0.0, 1.0), np.sqrt(maha2), np.sqrt(eig[:, 1])


def risk_level(pc: float) -> str:
    if pc > 1e-4:
        return "CRITICAL"
    if pc > 1e-5:
        return "HIGH"
    if pc > 1e-6:
        return "MEDIUM"
    if pc > 1e-7:
        return "LOW"
    return "NEGLIGIBLE"


# ===========================================
# SCREENING
# ===========================================
def _max_relative_speed(sats) -> float:
    """Twice the fastest perigee speed in the set: a bound on any pair's relative speed (km/s)."""
    best = 0.0
    for s in sats:
        a = s.a * s.radiusearthkm
        rp = a * (1.0 - s.ecco)
        if a > 0 and rp > 0:
            best = max(best, math.sqrt(max(MU * (2.0 / rp - 1.0 / a), 0.0)))
    return 2.0 * best


def _screen(sats: list, start: datetime, horizon_s: float, step_s: float, report_km: float):
    """
    Every approach closer than report_km between any two of `sats` in [start, start + horizon].
    Returns a dict of arrays (i, j, t_s, miss, r_rel, v_rel, r_i, v_i, r_j, v_j) and the screening stats.
    """
    n = len(sats)
    nt = int(horizon_s // step_s) + 1
    vmax = _max_relative_speed(sats)
    capture = report_km + vmax * step_s / 2.0
    radius = capture + 1.0
    jd0, fr0 = jday(start.year, start.month, start.day, start.hour, start.minute,
                    start.second + start.microsecond / 1e6)
    arr = SatrecArray(sats)
    far = np.column_stack([1e9 + 1e5 * np.arange(n), np.zeros(n), np.zeros(n)])
    out = {k: [] for k in ("i", "j", "t", "miss", "rrel", "vrel", "ri", "vi", "rj", "vj")}
    failed_states = 0

    for c0 in range(1, nt - 1, _CHUNK):
        c1 = min(c0 + _CHUNK, nt - 1)
        ks = np.arange(c0 - 1, c1 + 1)                 # one step of overlap on each side
        e, r, _ = arr.sgp4(np.full(ks.shape, jd0), fr0 + ks * step_s / 86400.0)
        bad = e != 0
        if bad.any():
            failed_states += int(bad.sum())
            r = np.where(bad[:, :, None], far[:, None, :], r)
        for col in range(1, len(ks) - 1):
            r0 = r[:, col, :]
            pairs = cKDTree(r0).query_pairs(radius, output_type="ndarray")
            if len(pairs) == 0:
                continue
            i, j = pairs[:, 0], pairs[:, 1]
            b = r0[j] - r0[i]
            y1 = np.einsum('ij,ij->i', b, b)
            keep = y1 <= capture * capture
            if not keep.any():
                continue
            i, j, b, y1 = i[keep], j[keep], b[keep], y1[keep]
            rm, rp = r[:, col - 1, :], r[:, col + 1, :]
            a = rm[j] - rm[i]
            c = rp[j] - rp[i]
            y0 = np.einsum('ij,ij->i', a, a)
            y2 = np.einsum('ij,ij->i', c, c)
            curv = y0 - 2.0 * y1 + y2
            is_min = (y1 <= y0) & (y1 < y2) & (curv > 0)
            if not is_min.any():
                continue
            sel = np.flatnonzero(is_min)
            tau = np.clip(0.5 * (y0[sel] - y2[sel]) / curv[sel], -1.0, 1.0)
            miss = np.sqrt(np.maximum(y1[sel] - (y0[sel] - y2[sel]) ** 2 / (8.0 * curv[sel]), 0.0))
            ok = miss < report_km + _ESTIMATE_MARGIN_KM
            if not ok.any():
                continue
            sel, tau, miss = sel[ok], tau[ok], miss[ok]
            A, Bv, Cv = a[sel], b[sel], c[sel]
            t2 = tau[:, None]
            out["i"].append(i[sel])
            out["j"].append(j[sel])
            out["t"].append((ks[col] + tau) * step_s)
            out["miss"].append(miss)
            out["rrel"].append(Bv + t2 * (Cv - A) / 2.0 + t2 ** 2 * (A - 2.0 * Bv + Cv) / 2.0)
            out["vrel"].append(((Cv - A) / 2.0 + t2 * (A - 2.0 * Bv + Cv)) / step_s)
            ii, jj = i[sel], j[sel]
            out["ri"].append(r0[ii])
            out["vi"].append((rp[ii] - rm[ii]) / (2.0 * step_s))
            out["rj"].append(r0[jj])
            out["vj"].append((rp[jj] - rm[jj]) / (2.0 * step_s))

    res = {k: (np.concatenate(v) if v else np.empty((0, 3) if k in ("rrel", "vrel", "ri", "vi", "rj", "vj") else 0))
           for k, v in out.items()}
    stats = {"objects": n, "grid_steps": nt, "step_s": step_s, "report_km": report_km, "v_max_kms": vmax,
             "screen_radius_km": radius, "failed_states": failed_states}
    return res, stats


def _refine_exact(sats: list, res: Dict[str, np.ndarray], start: datetime, report_km: float):
    """
    Replace the grid estimates by exact SGP4 states: propagate both objects at the estimated TCA, take one
    Newton step on the range rate (t -= r.v / v.v), propagate again, and keep approaches closer than report_km.
    Objects are evaluated in batches per object (Satrec.sgp4_array).
    """
    m = len(res["t"])
    if m == 0:
        return res
    jd0, fr0 = jday(start.year, start.month, start.day, start.hour, start.minute,
                    start.second + start.microsecond / 1e6)
    i, j = res["i"].astype(int), res["j"].astype(int)

    def states(t_s: np.ndarray):
        r_i = np.full((m, 3), np.nan)
        v_i = np.full((m, 3), np.nan)
        r_j = np.full((m, 3), np.nan)
        v_j = np.full((m, 3), np.nan)
        for idx_arr, r_out, v_out in ((i, r_i, v_i), (j, r_j, v_j)):
            order = np.argsort(idx_arr, kind="stable")
            bounds = np.flatnonzero(np.diff(idx_arr[order])) + 1
            for grp in np.split(order, bounds):
                if len(grp) == 0:
                    continue
                sat = sats[idx_arr[grp[0]]]
                e, r, v = sat.sgp4_array(np.full(len(grp), jd0), fr0 + t_s[grp] / 86400.0)
                good = e == 0
                r_out[grp[good]] = r[good]
                v_out[grp[good]] = v[good]
        return r_i, v_i, r_j, v_j

    t = res["t"].astype(float)
    r_i, v_i, r_j, v_j = states(t)
    rr, vv = r_j - r_i, v_j - v_i
    t = t - np.einsum('ij,ij->i', rr, vv) / np.einsum('ij,ij->i', vv, vv)
    r_i, v_i, r_j, v_j = states(t)
    rr, vv = r_j - r_i, v_j - v_i
    miss = np.linalg.norm(rr, axis=1)
    keep = np.isfinite(miss) & (miss < report_km)
    return {"i": i[keep], "j": j[keep], "t": t[keep], "miss": miss[keep], "rrel": rr[keep], "vrel": vv[keep],
            "ri": r_i[keep], "vi": v_i[keep], "rj": r_j[keep], "vj": v_j[keep]}


TIERS = ("CRITICAL", "HIGH", "MEDIUM", "LOW", "NEGLIGIBLE")
_TIER_EDGES = np.array([1e-7, 1e-6, 1e-5, 1e-4])  # NEGLIGIBLE | LOW | MEDIUM | HIGH | CRITICAL


def _build_events(res: Dict[str, np.ndarray], ids: List[str], names: List[str], epochs: List[datetime],
                  start: datetime, pc_min: float = 0.0, top: Optional[int] = None):
    """
    Pc and tiers for every approach (vectorised), most probable first. Only the first `top` become
    ConjunctionEvent objects; the summary counts all of them. Returns (events, summary).
    """
    summary = {"total_events": 0, "tier_counts": {t: 0 for t in TIERS}, "long_encounters": 0}
    m = len(res["miss"])
    if m == 0:
        return [], summary
    i, j = res["i"].astype(int), res["j"].astype(int)
    vrel = np.linalg.norm(res["vrel"], axis=1)

    # A long (co-moving) encounter repeats every orbit; keep only its closest approach per pair
    slow = np.flatnonzero(vrel < LONG_ENCOUNTER_KMS)
    keep = np.ones(m, dtype=bool)
    if len(slow):
        order = slow[np.lexsort((res["miss"][slow], j[slow], i[slow]))]
        dup = np.r_[False, (i[order][1:] == i[order][:-1]) & (j[order][1:] == j[order][:-1])]
        keep[order[dup]] = False
    sel = np.flatnonzero(keep)
    i, j, vrel = i[sel], j[sel], vrel[sel]
    t_s, miss = res["t"][sel], res["miss"][sel]

    epoch_days = np.array([(e - start).total_seconds() / 86400.0 for e in epochs])
    t_days = t_s / 86400.0
    age_i = np.abs(t_days - epoch_days[i])
    age_j = np.abs(t_days - epoch_days[j])
    starlink = np.array([CovarianceModel.group(nm) == 'starlink' for nm in names])
    hbr = np.array([HardBodyRadiusModel.estimate(nm) for nm in names])
    cov3 = (_ric_covariance(res["ri"][sel], res["vi"][sel], CovarianceModel.sigmas_array(starlink[i], age_i))
            + _ric_covariance(res["rj"][sel], res["vj"][sel], CovarianceModel.sigmas_array(starlink[j], age_j)))
    miss2, cov2 = _encounter_plane(res["rrel"][sel], res["vrel"][sel], cov3)
    pc, maha, widest = collision_probability(miss2, cov2, hbr[i] + hbr[j])

    ok = pc >= pc_min
    order = np.flatnonzero(ok)[np.lexsort((miss[ok], -pc[ok]))]
    tier_idx = np.searchsorted(_TIER_EDGES, pc[order], side="left")  # 0 = NEGLIGIBLE ... 4 = CRITICAL
    counts = np.bincount(tier_idx, minlength=5)
    summary = {"total_events": int(len(order)),
               "tier_counts": {t: int(counts[4 - k]) for k, t in enumerate(TIERS)},
               "long_encounters": int(np.sum(vrel[order] < LONG_ENCOUNTER_KMS))}

    events = []
    for k in order[:top] if top is not None else order:
        a, b = int(i[k]), int(j[k])
        p = float(pc[k])
        events.append(ConjunctionEvent(
            sat1_id=ids[a], sat1_name=names[a], sat2_id=ids[b], sat2_name=names[b],
            tca=start + timedelta(seconds=float(t_s[k])), min_distance=float(miss[k]),
            mahalanobis_distance=float(maha[k]), probability_of_collision=p, risk_level=risk_level(p),
            sat1_hbr=float(hbr[a]), sat2_hbr=float(hbr[b]), combined_hbr=float(hbr[a] + hbr[b]),
            relative_velocity_kms=float(vrel[k]), tle_age_days=float(max(age_i[k], age_j[k])),
            uncertainty_km=float(widest[k]), long_encounter=bool(vrel[k] < LONG_ENCOUNTER_KMS),
        ))
    return events, summary


# ===========================================
# PUBLIC API
# ===========================================
class ConjunctionDetector:
    """
    Settings for a search, and the single-pair assessment.
    search_step_hours and refine_window_hours are accepted for compatibility and ignored: the step is fixed at
    STEP_S so that screening cannot miss an approach, and refinement needs no window.
    """

    def __init__(
        self,
        time_horizon_days: float = 7,
        search_step_hours: Optional[float] = None,
        initial_screen_km: float = REPORT_KM,
        refine_window_hours: Optional[float] = None,
        pc_min_filter: float = 0.0,
        step_s: float = STEP_S,
    ):
        self.time_horizon_days = time_horizon_days
        self.report_km = initial_screen_km
        self.pc_min_filter = pc_min_filter
        self.step_s = step_s

    def assess_pair(
        self,
        oe1: OrbitalElement,
        oe2: OrbitalElement,
        name1: str,
        name2: str,
        id1: str,
        id2: str,
        start_epoch: Optional[datetime] = None,
        tca_candidate: Optional[datetime] = None,
    ) -> Optional[ConjunctionEvent]:
        """The closest approach of this pair below the report distance in the horizon, or None."""
        start = start_epoch or datetime.utcnow()
        sats = [satrec_from_elements(oe1, 1), satrec_from_elements(oe2, 2)]
        res, _ = _screen(sats, start, self.time_horizon_days * 86400.0, self.step_s, self.report_km)
        res = _refine_exact(sats, res, start, self.report_km)
        events, _ = _build_events(res, [id1, id2], [name1, name2], [oe1.epoch, oe2.epoch], start)
        if not events:
            return None
        return min(events, key=lambda ev: ev.min_distance)

    def _risk_level(self, pc: float) -> str:
        return risk_level(pc)


class ConjunctionSearch:
    """
    Catalog-wide search. `parallel`, `use_processes` and `max_workers` are accepted for compatibility: the
    screening is vectorised and runs in one process.
    """

    def __init__(self, detector: ConjunctionDetector, parallel: bool = True, use_processes: bool = True,
                 max_workers: Optional[int] = None):
        self.detector = detector
        self.last_window: Optional[Tuple[datetime, datetime]] = None
        self.last_stats: Dict = {}

    def search_catalog(
        self,
        orbital_elements: Dict[str, Tuple[OrbitalElement, str]],
        start_epoch: Optional[datetime] = None,
        top: Optional[int] = None,
    ) -> List[ConjunctionEvent]:
        """
        Every approach closer than the report distance over [start_epoch, start_epoch + time_horizon_days],
        most probable first; with `top`, only the first `top`. last_stats counts all of them (total_events,
        tier_counts, long_encounters). start_epoch defaults to now, so the horizon is a forecast. Pass an
        explicit start_epoch to reproduce a historical window.
        """
        ids = list(orbital_elements.keys())
        start = start_epoch or datetime.utcnow()
        horizon_s = self.detector.time_horizon_days * 86400.0
        self.last_window = (start, start + timedelta(seconds=horizon_s))
        self.last_stats = {}
        if len(ids) < 2:
            return []
        oes = [orbital_elements[k][0] for k in ids]
        names = [orbital_elements[k][1] for k in ids]
        sats = [satrec_from_elements(oe, n) for n, oe in enumerate(oes)]
        res, stats = _screen(sats, start, horizon_s, self.detector.step_s, self.detector.report_km)
        res = _refine_exact(sats, res, start, self.detector.report_km)
        events, summary = _build_events(res, ids, names, [oe.epoch for oe in oes], start,
                                        pc_min=self.detector.pc_min_filter, top=top)
        self.last_stats = {**stats, **summary}
        return events


def method_description() -> Dict:
    """The method and its limits, for the API and the UI, with the live constants filled in."""
    d = dict(METHOD)
    d["screening"] = d["screening"].format(step=STEP_S)
    d["limits"] = [s.format(long=LONG_ENCOUNTER_KMS) for s in d["limits"]]
    d.update({"step_s": STEP_S, "report_km": REPORT_KM, "long_encounter_kms": LONG_ENCOUNTER_KMS,
              "pc_thresholds": {"CRITICAL": 1e-4, "HIGH": 1e-5, "MEDIUM": 1e-6, "LOW": 1e-7}})
    return d


# ===========================================
# EXAMPLE USAGE
# ===========================================
if __name__ == "__main__":
    from parser_pipeline import TLEDatabase

    db = TLEDatabase()
    elements = {t.norad_cat_id: (t.to_orbital_element(), t.object_name) for t in db.get_all_tles()}
    search = ConjunctionSearch(ConjunctionDetector(time_horizon_days=1))
    found = search.search_catalog(elements)
    print(search.last_stats)
    for ev in found[:10]:
        print(f"{ev.sat1_name} <-> {ev.sat2_name}  TCA {ev.tca:%Y-%m-%d %H:%M:%S}  miss {ev.min_distance:.3f} km  "
              f"Pc {ev.probability_of_collision:.2e}  {ev.risk_level}{'  (long encounter)' if ev.long_encounter else ''}")
