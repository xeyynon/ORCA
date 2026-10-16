"""
Exp 2a of the research brief: brute-force vs KD-tree screening runtime.

Both methods answer the same question on the same snapshot positions: which pairs are within radius r
at this instant? cKDTree.query_pairs is an exact fixed-radius search, so the pair sets must be identical
(checked on every size); only runtime can differ.

  brute_numpy  vectorised all-pairs (block Gram-matrix distances, exact recheck at the boundary)
  kdtree       scipy cKDTree build + query_pairs, as ORCA does per time step
  brute_python ORCA's pure-Python fallback loop, timed only at small sizes (it is O(n^2) in Python)

Positions: SGP4 (sgp4 package) at `--steps` hourly instants for every object whose TLE is at most
--max-age-days old at the start (all regimes, not just LEO). Sizes are random subsets (fixed seed).
Timing: one warm-up, then --repeats repetitions; the figure is seconds per time step, mean +- sd over
repetitions. Single process. Hardware and versions go to run.json.

Run from the repo root:  python benchmarks/screening_runtime.py
Writes benchmarks/results/screening_runtime_<tag>/{runtime.csv, run.json}.
"""
import argparse
import csv
import json
import os
import platform
import sys
import time
from datetime import datetime, timedelta
from typing import Optional, Sequence

import numpy as np
import scipy
import sgp4
from scipy.spatial import cKDTree
from sgp4.api import SatrecArray, jday

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import fresh_only, latest_snapshot, load_snapshot, snapshot_sha256, subset  # noqa: E402

RESULTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")


def brute_numpy(pos: np.ndarray, radius: float, block: int = 512) -> np.ndarray:
    """All pairs (i < j) with |p_i - p_j| <= radius, as an (m, 2) array sorted by (i, j)."""
    n = len(pos)
    sq = np.einsum("ij,ij->i", pos, pos)
    r2 = radius * radius
    loose = r2 * (1 + 1e-9) + 1e-6  # Gram distances lose a few ulps; recheck these exactly
    out = []
    for a in range(0, n, block):
        b = min(a + block, n)
        d2 = sq[a:b, None] + sq[None, a:] - 2.0 * (pos[a:b] @ pos[a:].T)
        ii, jj = np.nonzero(d2 <= loose)
        gi, gj = a + ii, a + jj
        keep = gj > gi
        gi, gj = gi[keep], gj[keep]
        exact = np.einsum("ij,ij->i", pos[gi] - pos[gj], pos[gi] - pos[gj]) <= r2
        out.append(np.column_stack([gi[exact], gj[exact]]))
    pairs = np.concatenate(out) if out else np.empty((0, 2), dtype=np.int64)
    return pairs[np.lexsort((pairs[:, 1], pairs[:, 0]))]


def kdtree_pairs(pos: np.ndarray, radius: float) -> np.ndarray:
    p = cKDTree(pos).query_pairs(radius, output_type="ndarray")
    return p[np.lexsort((p[:, 1], p[:, 0]))] if len(p) else p


def brute_python(pos: np.ndarray, radius: float) -> int:
    """ORCA's fallback (conjunction_detection.py, brute branch): Python double loop with np.linalg.norm."""
    n = len(pos)
    count = 0
    for i in range(n):
        for j in range(i + 1, n):
            if float(np.linalg.norm(pos[i] - pos[j])) <= radius:
                count += 1
    return count


def time_method(fn, snapshots, repeats: int):
    fn(snapshots[0])  # warm-up
    per_step = []
    for _ in range(repeats):
        t0 = time.perf_counter()
        for pos in snapshots:
            fn(pos)
        per_step.append((time.perf_counter() - t0) / len(snapshots))
    return float(np.mean(per_step)), float(np.std(per_step, ddof=1)) if repeats > 1 else 0.0


def parse_args(argv: Optional[Sequence[str]] = None):
    ap = argparse.ArgumentParser(description="Exp 2a: brute-force vs KD-tree screening runtime")
    ap.add_argument("--catalog")
    ap.add_argument("--sizes", type=int, nargs="+", default=[1000, 2000, 4000, 8000, 0], help="0 = all")
    ap.add_argument("--radius", type=float, default=100.0, help="km (ORCA's initial_screen_km)")
    ap.add_argument("--steps", type=int, default=12, help="hourly snapshots per repetition")
    ap.add_argument("--repeats", type=int, default=5)
    ap.add_argument("--python-max-n", type=int, default=2000, help="largest size for the pure-Python loop")
    ap.add_argument("--max-age-days", type=float, default=7.0)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--tag", default="r100km")
    return ap.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> str:
    a = parse_args(argv)
    catalog = a.catalog or latest_snapshot()
    objs_all = load_snapshot(catalog)
    start = (max(o.epoch for o in objs_all) + timedelta(minutes=1)).replace(second=0, microsecond=0)
    pool = fresh_only(objs_all, start, a.max_age_days)

    jd0, fr0 = jday(start.year, start.month, start.day, start.hour, start.minute, 0.0)
    hours = np.arange(a.steps, dtype=float)
    e, r, _ = SatrecArray([o.satrec for o in pool]).sgp4(np.full(a.steps, jd0), fr0 + hours / 24.0)
    ok = (e == 0).all(axis=1)  # keep objects that propagate at every snapshot
    pool = [o for o, k in zip(pool, ok) if k]
    r = r[ok]
    print(f"{len(pool)} objects propagate cleanly at {a.steps} hourly snapshots from {start.isoformat()}Z")

    rows = []
    for n_req in a.sizes:
        n = len(pool) if n_req == 0 or n_req > len(pool) else n_req
        idx = np.sort(np.random.default_rng(a.seed).choice(len(pool), size=n, replace=False))
        snaps = [np.ascontiguousarray(r[idx, k, :]) for k in range(a.steps)]

        candidates = []
        for pos in snaps:
            pb, pk = brute_numpy(pos, a.radius), kdtree_pairs(pos, a.radius)
            if not np.array_equal(pb, pk):
                raise SystemExit(f"n={n}: brute force and KD-tree pair sets differ")
            candidates.append(len(pk))

        results = {"brute_numpy": time_method(lambda p: brute_numpy(p, a.radius), snaps, a.repeats),
                   "kdtree": time_method(lambda p: kdtree_pairs(p, a.radius), snaps, a.repeats)}
        if n <= a.python_max_n:
            results["brute_python"] = time_method(lambda p: brute_python(p, a.radius), snaps[:1], 1)
        base = results["brute_numpy"][0]
        for method, (mean, sd) in results.items():
            rows.append({"n": n, "method": method, "seconds_per_step_mean": mean, "seconds_per_step_sd": sd,
                         "repeats": a.repeats if method != "brute_python" else 1,
                         "steps": a.steps if method != "brute_python" else 1,
                         "pair_distance_evaluations_per_step": n * (n - 1) // 2 if method.startswith("brute") else "",
                         "candidate_pairs_per_step_mean": float(np.mean(candidates)),
                         "speedup_vs_brute_numpy": base / mean})
        line = "  ".join(f"{m} {v[0] * 1e3:9.2f} ms" for m, v in results.items())
        print(f"n={n:>6}  identical pair sets  candidates/step {np.mean(candidates):8.1f}  {line}")

    out_dir = os.path.join(RESULTS, f"screening_runtime_{a.tag}")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "runtime.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(out_dir, "run.json"), "w", encoding="utf-8") as f:
        json.dump({
            "experiment": "exp2a_screening_runtime", "args": vars(a),
            "catalog": os.path.basename(catalog), "catalog_sha256": snapshot_sha256(catalog),
            "start_utc": start.isoformat(), "objects_available": len(pool),
            "versions": {"python": platform.python_version(), "numpy": np.__version__,
                         "scipy": scipy.__version__, "sgp4": sgp4.__version__},
            "platform": {"system": platform.platform(), "processor": platform.processor(),
                         "cpu_count": os.cpu_count()},
        }, f, indent=2, default=str)
    print(f"wrote {out_dir}")
    return out_dir


if __name__ == "__main__":
    main()
