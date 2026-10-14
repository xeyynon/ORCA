"""
Exp 4, part 2: does the short-term (straight-line) encounter assumption hold for ORCA's encounters?

For each encounter, Foster 2D assumes the relative path is a straight line through the encounter plane.
Here the actual SGP4 relative path around the TCA is integrated instead (benchmarks.pc.pc_line_integral),
with the same covariance (frozen at TCA) and hard-body radius:

  li_pass    the pass containing the TCA only: tests curvature within one encounter
  li_window  every pass within +-window_h of the TCA: shows what a single-pass model leaves out

Both are reported as ratios to small-radius Foster at the TCA. A ratio near 1 means the straight-line
model is adequate; far from 1 means it is not. The line integral is the expected number of hard-body
tube crossings (an upper bound on Pc where passes overlap). Covariances: ORCA's isotropic one, and the
volume-preserving in-track-dominant A = 10 variant from pc_comparison.py.

Which encounters: every one with relative velocity below --slow-kms, plus --fast-sample others as a
control (straight-line motion is expected there, so their ratio should be ~1).

Path sampling: a coarse 10 s grid over +-window_h; segments whose straight chord passes within
miss + 8 sigma_max + 1 km of the origin are subdivided so each piece is at most sigma_min / 20 long.

Run from the repo root:  python benchmarks/encounter_curvature.py [--recall-dir <Exp 2b results folder>]
Writes benchmarks/results/curvature_<tag>/{events.csv, summary.json}.
"""
import argparse
import csv
import json
import math
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional, Sequence

import numpy as np
from sgp4.api import SatrecArray, jday

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import DATA_DIR, load_snapshot, snapshot_sha256  # noqa: E402
from benchmarks.pc import encounter_plane, pc_foster, pc_line_integral, ric_covariance  # noqa: E402
from conjunction_detection import CovarianceModel, HardBodyRadiusModel  # noqa: E402

RESULTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
V_BANDS = [(0.0, 0.1), (0.1, 1.0), (1.0, 5.0), (5.0, 10.0), (10.0, math.inf)]


def band(v: float) -> str:
    for lo, hi in V_BANDS:
        if lo <= v < hi:
            return f"{lo:g}-{hi:g}" if math.isfinite(hi) else f">={lo:g}"
    return "?"


def rel_positions(sats, jd0: float, fr: np.ndarray) -> np.ndarray:
    e, r, _ = SatrecArray(sats).sgp4(np.full(fr.shape, jd0), fr)
    if (e != 0).any():
        raise ValueError("propagation error on the path")
    return r[1] - r[0]


def chord_min_dist(p: np.ndarray, q: np.ndarray) -> np.ndarray:
    """Distance from the origin to each segment p_k -> q_k."""
    d = q - p
    dd = np.einsum("ij,ij->i", d, d)
    s = np.clip(-np.einsum("ij,ij->i", p, d) / np.where(dd > 0, dd, 1.0), 0.0, 1.0)
    c = p + s[:, None] * d
    return np.sqrt(np.einsum("ij,ij->i", c, c))


def path_measures(sats, jd0, fr_tca, cov3, hbr, window_s, coarse_s=10.0, max_pts_per_seg=200_000):
    """(li_pass, li_window, passes_in_window, pass_truncated) for one covariance."""
    eig = np.linalg.eigvalsh(cov3)
    s_min, s_max = math.sqrt(eig[0]), math.sqrt(eig[-1])
    t = np.arange(-window_s, window_s + 1e-9, coarse_s)
    i0 = int(np.argmin(np.abs(t)))
    t[i0] = 0.0
    r = rel_positions(sats, jd0, fr_tca + t / 86400.0)
    miss = float(np.linalg.norm(r[i0]))
    near = chord_min_dist(r[:-1], r[1:]) <= miss + 8.0 * s_max + 1.0

    li_seg = np.zeros(len(near))
    for k in np.flatnonzero(near):
        n = int(min(max_pts_per_seg, math.ceil(np.linalg.norm(r[k + 1] - r[k]) / (s_min / 20.0)) + 1))
        tt = np.linspace(t[k], t[k + 1], max(n, 2))
        li_seg[k] = pc_line_integral(rel_positions(sats, jd0, fr_tca + tt / 86400.0), cov3, hbr)

    # The pass containing the TCA: the run of near segments touching node i0
    lo = i0 - 1 if i0 > 0 and near[i0 - 1] else i0
    hi = i0 if i0 < len(near) and near[i0] else i0 - 1
    while lo > 0 and near[lo - 1]:
        lo -= 1
    while hi + 1 < len(near) and near[hi + 1]:
        hi += 1
    li_pass = float(li_seg[lo:hi + 1].sum())
    runs = int(np.sum(near[1:] & ~near[:-1]) + near[0]) if len(near) else 0
    truncated = lo == 0 or hi == len(near) - 1
    return li_pass, float(li_seg.sum()), runs, truncated


def parse_args(argv: Optional[Sequence[str]] = None):
    ap = argparse.ArgumentParser(description="Exp 4b: straight-line vs curved-path collision measure")
    ap.add_argument("--recall-dir", default=os.path.join(RESULTS, "screening_recall_n2000_h24_ref10s_seed1"))
    ap.add_argument("--slow-kms", type=float, default=1.0)
    ap.add_argument("--fast-sample", type=int, default=200)
    ap.add_argument("--window-h", type=float, default=3.0)
    ap.add_argument("--aspect", type=float, default=10.0)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--tag")
    return ap.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> str:
    a = parse_args(argv)
    t_all = time.perf_counter()
    with open(os.path.join(a.recall_dir, "run.json"), encoding="utf-8") as f:
        run2b = json.load(f)
    catalog = os.path.join(DATA_DIR, run2b["catalog"])
    if snapshot_sha256(catalog) != run2b["catalog_sha256"]:
        raise SystemExit(f"{catalog} does not match the snapshot the Exp 2b run used")
    objs = {o.norad_id: o for o in load_snapshot(catalog)}
    start = datetime.fromisoformat(run2b["window_start_utc"])
    jd0, fr0 = jday(start.year, start.month, start.day, start.hour, start.minute,
                    start.second + start.microsecond / 1e6)
    with open(os.path.join(a.recall_dir, "events.csv"), encoding="utf-8") as f:
        events = [r for r in csv.DictReader(f) if r["persistent_pair"] == "0"]

    slow = [e for e in events if float(e["relative_velocity_kms"]) < a.slow_kms]
    fast = [e for e in events if float(e["relative_velocity_kms"]) >= a.slow_kms]
    rng = np.random.default_rng(a.seed)
    fast = [fast[i] for i in sorted(rng.choice(len(fast), size=min(a.fast_sample, len(fast)), replace=False))]

    rows: List[Dict] = []
    failed = 0
    for e in slow + fast:
        o1, o2 = objs[e["sat1_id"]], objs[e["sat2_id"]]
        tca = datetime.fromisoformat(e["tca_utc"])
        fr = fr0 + (tca - start).total_seconds() / 86400.0
        _, r1, v1 = o1.satrec.sgp4(jd0, fr)
        _, r2, v2 = o2.satrec.sgp4(jd0, fr)
        r1, v1, r2, v2 = map(np.array, (r1, v1, r2, v2))
        hbr = HardBodyRadiusModel.estimate(o1.name) + HardBodyRadiusModel.estimate(o2.name)
        s1 = CovarianceModel.position_covariance((tca - o1.epoch).total_seconds())
        s2 = CovarianceModel.position_covariance((tca - o2.epoch).total_seconds())
        A = a.aspect
        covs = {
            "iso": np.eye(3) * (s1 * s1 + s2 * s2),
            f"a{A:g}": (ric_covariance(r1, v1, s1 * A ** (-1 / 3), s1 * A ** (2 / 3), s1 * A ** (-1 / 3))
                        + ric_covariance(r2, v2, s2 * A ** (-1 / 3), s2 * A ** (2 / 3), s2 * A ** (-1 / 3))),
        }
        vrel = float(np.linalg.norm(v2 - v1))
        row = {"sat1_id": o1.norad_id, "sat1_name": o1.name, "sat2_id": o2.norad_id, "sat2_name": o2.name,
               "tca_utc": e["tca_utc"], "miss_km": float(np.linalg.norm(r2 - r1)), "vrel_kms": vrel,
               "vrel_band": band(vrel), "hbr_km": hbr}
        try:
            for name, cov3 in covs.items():
                m2, c2 = encounter_plane(r2 - r1, v2 - v1, cov3)
                foster = pc_foster(m2, c2, hbr)
                li_pass, li_win, runs, trunc = path_measures([o1.satrec, o2.satrec], jd0, fr, cov3, hbr,
                                                             a.window_h * 3600.0)
                row.update({f"foster_{name}": foster, f"li_pass_{name}": li_pass, f"li_window_{name}": li_win,
                            f"ratio_pass_{name}": li_pass / foster if foster > 0 else "",
                            f"ratio_window_{name}": li_win / foster if foster > 0 else "",
                            f"passes_in_window_{name}": runs, f"pass_truncated_{name}": int(trunc)})
        except ValueError:
            failed += 1
            continue
        rows.append(row)

    tag = a.tag or os.path.basename(os.path.normpath(a.recall_dir)).replace("screening_recall_", "")
    out_dir = os.path.join(RESULTS, f"curvature_{tag}")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "events.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    summary = {"events": len(rows), "slow_events": len(slow), "fast_control": len(fast), "failed": failed,
               "by_band": {}}
    print(f"{len(slow)} slow (< {a.slow_kms:g} km/s) + {len(fast)} fast control encounters, "
          f"+-{a.window_h:g} h window ({failed} failed)")
    print(f"{'band km/s':>10} {'cov':>5} {'n':>5} {'pass ratio med':>15} {'[p5, p95]':>20} "
          f"{'window ratio med':>17} {'[p5, p95]':>20} {'truncated':>10}")
    for lo, hi in V_BANDS:
        b = band(lo)
        for name in ("iso", f"a{a.aspect:g}"):
            sel = [r for r in rows if r["vrel_band"] == b and r[f"ratio_pass_{name}"] != ""]
            if not sel:
                continue
            rp = np.array([r[f"ratio_pass_{name}"] for r in sel])
            rw = np.array([r[f"ratio_window_{name}"] for r in sel])
            tr = sum(r[f"pass_truncated_{name}"] for r in sel)
            stats = {"n": len(sel),
                     "pass_ratio_median": float(np.median(rp)), "pass_ratio_p5": float(np.percentile(rp, 5)),
                     "pass_ratio_p95": float(np.percentile(rp, 95)),
                     "window_ratio_median": float(np.median(rw)), "window_ratio_p5": float(np.percentile(rw, 5)),
                     "window_ratio_p95": float(np.percentile(rw, 95)),
                     "share_pass_ratio_off_by_2x": float(np.mean((rp > 2) | (rp < 0.5))),
                     "pass_truncated": tr}
            summary["by_band"][f"{b}|{name}"] = stats
            print(f"{b:>10} {name:>5} {len(sel):>5} {stats['pass_ratio_median']:>15.3g} "
                  f"{'[%.3g, %.3g]' % (stats['pass_ratio_p5'], stats['pass_ratio_p95']):>20} "
                  f"{stats['window_ratio_median']:>17.3g} "
                  f"{'[%.3g, %.3g]' % (stats['window_ratio_p5'], stats['window_ratio_p95']):>20} {tr:>10}")
    summary["run"] = {"args": vars(a), "exp2b_run": os.path.basename(os.path.normpath(a.recall_dir)),
                      "catalog": run2b["catalog"], "seconds": time.perf_counter() - t_all}
    with open(os.path.join(out_dir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"wrote {out_dir}")
    return out_dir


if __name__ == "__main__":
    main()
