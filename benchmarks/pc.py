"""
Collision probability (Pc) methods for Exp 4 of the research brief.

All methods share the short-term encounter model: straight-line relative motion near TCA, so the
problem reduces to a 2D Gaussian in the encounter plane (perpendicular to the relative velocity)
integrated over a disc of radius = combined hard-body radius. Units: km for positions and radii.

- encounter_plane      project a 3D miss vector and 3x3 covariance into the encounter plane
- pc_foster            numerical 2D integration over the disc (Foster-style, any 2x2 covariance)
- pc_isotropic_exact   closed form when the 2D covariance is sigma^2 * I (non-central chi-square)
- pc_monte_carlo       2D sampling with a Clopper-Pearson interval
- mc_samples_needed    samples for a target relative standard error at a given Pc
"""
from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np
from scipy import integrate
from scipy.stats import beta as beta_dist
from scipy.stats import ncx2, norm


def encounter_plane(
    r_rel: np.ndarray, v_rel: np.ndarray, cov3: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Return (miss_2d, cov_2d) in the plane perpendicular to v_rel.

    Basis: e1 along the component of r_rel perpendicular to v_rel (so miss_2d = [|r_perp|, 0]),
    e2 = v_hat x e1. If r_rel is (nearly) parallel to v_rel, e1 is any unit vector perpendicular to v_rel.
    """
    r_rel = np.asarray(r_rel, dtype=float)
    v_rel = np.asarray(v_rel, dtype=float)
    v_norm = np.linalg.norm(v_rel)
    if v_norm == 0.0:
        raise ValueError("relative velocity is zero: the encounter plane is undefined")
    v_hat = v_rel / v_norm

    r_perp = r_rel - (r_rel @ v_hat) * v_hat
    if np.linalg.norm(r_perp) > 1e-12:
        e1 = r_perp / np.linalg.norm(r_perp)
    else:
        trial = np.array([1.0, 0.0, 0.0]) if abs(v_hat[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
        e1 = np.cross(v_hat, trial)
        e1 /= np.linalg.norm(e1)
    e2 = np.cross(v_hat, e1)

    B = np.vstack([e1, e2])
    return B @ r_rel, B @ np.asarray(cov3, dtype=float) @ B.T


def pc_foster(miss_2d: np.ndarray, cov_2d: np.ndarray, hbr: float) -> float:
    """
    Integrate the 2D Gaussian N(miss_2d, cov_2d) over the disc |x| <= hbr centred at the origin.

    Rotates to the covariance principal axes, then integrates in one dimension:
    Pc = int_{-R}^{R} phi(x; mx, sx) * [Phi((h(x) - my)/sy) - Phi((-h(x) - my)/sy)] dx,  h(x) = sqrt(R^2 - x^2).
    The disc is rotation invariant, so only the mean is rotated.
    """
    if hbr <= 0.0:
        return 0.0
    eigval, eigvec = np.linalg.eigh(np.asarray(cov_2d, dtype=float))
    if np.any(eigval <= 0.0):
        raise ValueError("2D covariance must be positive definite")
    mx, my = eigvec.T @ np.asarray(miss_2d, dtype=float)
    sx, sy = np.sqrt(eigval)

    def integrand(x: float) -> float:
        h = np.sqrt(max(hbr * hbr - x * x, 0.0))
        return norm.pdf(x, mx, sx) * (norm.cdf((h - my) / sy) - norm.cdf((-h - my) / sy))

    pc, _ = integrate.quad(integrand, -hbr, hbr, epsabs=0.0, epsrel=1e-10, limit=200)
    return float(min(max(pc, 0.0), 1.0))


def pc_isotropic_exact(miss: float, sigma: float, hbr: float) -> float:
    """
    Exact Pc for an isotropic 2D covariance sigma^2 * I: |X|^2 / sigma^2 is non-central chi-square
    with 2 degrees of freedom and non-centrality (miss/sigma)^2, so Pc = P(|X| <= hbr).
    """
    if hbr <= 0.0:
        return 0.0
    return float(ncx2.cdf((hbr / sigma) ** 2, 2, (miss / sigma) ** 2))


@dataclass
class MonteCarloResult:
    pc: float
    hits: int
    samples: int
    ci_low: float
    ci_high: float
    confidence: float


def pc_monte_carlo(
    miss_2d: np.ndarray,
    cov_2d: np.ndarray,
    hbr: float,
    samples: int,
    rng: Optional[np.random.Generator] = None,
    confidence: float = 0.95,
    batch: int = 1_000_000,
) -> MonteCarloResult:
    """
    Sample the relative position from N(miss_2d, cov_2d) and count draws inside the disc.
    The interval is Clopper-Pearson (exact binomial), which stays valid when hits == 0.
    """
    rng = rng or np.random.default_rng()
    L = np.linalg.cholesky(np.asarray(cov_2d, dtype=float))
    mean = np.asarray(miss_2d, dtype=float)
    r2 = hbr * hbr

    hits = 0
    remaining = samples
    while remaining > 0:
        n = min(batch, remaining)
        pts = mean + rng.standard_normal((n, 2)) @ L.T
        hits += int(np.count_nonzero(np.einsum("ij,ij->i", pts, pts) <= r2))
        remaining -= n

    a = 1.0 - confidence
    lo = 0.0 if hits == 0 else float(beta_dist.ppf(a / 2, hits, samples - hits + 1))
    hi = 1.0 if hits == samples else float(beta_dist.ppf(1 - a / 2, hits + 1, samples - hits))
    return MonteCarloResult(hits / samples, hits, samples, lo, hi, confidence)


def mc_samples_needed(pc: float, rel_std_error: float) -> int:
    """Samples so that std(pc_hat)/pc = rel_std_error: N = (1 - pc) / (pc * rel_std_error^2)."""
    if not 0.0 < pc < 1.0:
        raise ValueError("pc must be in (0, 1)")
    return int(np.ceil((1.0 - pc) / (pc * rel_std_error ** 2)))
