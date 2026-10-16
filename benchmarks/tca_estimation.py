"""
Exp 3 of the research brief: TCA estimation.

Uses the reference encounters from an Exp 2b run (screening_recall.py) and the same SGP4 propagator,
so only the TCA algorithm differs.

3a, local: each encounter's reference TCA t_ref is re-solved with Brent root-finding of the range rate
to 1e-6 s. A coarse sample time t_c = t_ref + U(-30, 30) s (fixed seed) stands in for what a 60 s screen
would hand over, and every method searches [t_c - 60, t_c + 60]. Reported: TCA error (s), miss-distance
error (m, estimate minus reference), pair evaluations and time per encounter.

3b, global (ORCA's refinement): for every pair with a reference encounter, emulate ORCA: sample the pair
hourly over the window, keep the closest sample within 100 km as t_c, then run bounded Brent on the
distance over t_c +- 6 h (scipy's default xatol, 1e-5 h). Compare with a range-rate root-find of every
minimum on a 60 s grid over the same window. Truth: the distance sampled every 10 s over the window,
every grid minimum within v_max*5 s = 80 km of the smallest one refined, the closest kept.

Run from the repo root:  python benchmarks/tca_estimation.py [--recall-dir <Exp 2b results folder>]
Writes benchmarks/results/tca_<tag>/{local.csv, local_summary.csv, global.csv, global_summary.csv, run.json}.
"""
import argparse
import csv
import json
import math
import os
import platform
import sys
import time
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Sequence

import numpy as np
import scipy
import sgp4
from scipy.optimize import brentq, minimize_scalar
from sgp4.api import SatrecArray, jday

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import DATA_DIR, load_snapshot, snapshot_sha256  # noqa: E402
from benchmarks.tca import (  # noqa: E402
    PropagationError,
    SGP4Pair,
    all_minima_root,
    brent_min,
    brent_root,
    grid_min,
    grid_quadratic,
)

RESULTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
V_BANDS = [(0.0, 0.1), (0.1, 1.0), (1.0, 5.0), (5.0, 10.0), (10.0, math.inf)]

LOCAL_METHODS = [
    ("grid_1s", lambda p, lo, hi: grid_min(p, lo, hi, 1.0)),
    ("grid_5s", lambda p, lo, hi: grid_min(p, lo, hi, 5.0)),
    ("grid_10s", lambda p, lo, hi: grid_min(p, lo, hi, 10.0)),
    ("grid_30s", lambda p, lo, hi: grid_min(p, lo, hi, 30.0)),
    ("grid_60s", lambda p, lo, hi: grid_min(p, lo, hi, 60.0)),
    ("grid_quadratic_60s", lambda p, lo, hi: grid_quadratic(p, lo, hi, 60.0)),
    ("grid_quadratic_10s", lambda p, lo, hi: grid_quadratic(p, lo, hi, 10.0)),
    ("brent_min", lambda p, lo, hi: brent_min(p, lo, hi, 1e-3)),
    ("brent_root_60s", lambda p, lo, hi: brent_root(p, lo, hi, 60.0, 1e-3)),
]


def band_label(v: float) -> str:
    for lo, hi in V_BANDS:
        if lo <= v < hi:
            return f"{lo:g}-{hi:g}" if math.isfinite(hi) else f">={lo:g}"
    return "?"


def reference_tca(pair: SGP4Pair, t_guess: float):
    """Range-rate root to 1e-6 s near t_guess (the Exp 2b TCA); bounded Brent if there is no sign change."""
    lo, hi = t_guess - 10.0, t_guess + 10.0
    f_lo, f_hi = pair.rdot(lo), pair.rdot(hi)
    if f_lo < 0.0 <= f_hi:
        t = brentq(pair.rdot, lo, hi, xtol=1e-6, rtol=4 * np.finfo(float).eps)
    else:
        t = minimize_scalar(pair.dist, bounds=(lo, hi), method="bounded", options={"xatol": 1e-6}).x
    return float(t), pair.dist(t)


def dense_truth(si, sj, jd0: float, fr0: float, lo: float, hi: float, step: float = 10.0, vmax: float = 16.0):
    """Closest approach over [lo, hi]: 10 s grid, then refine every grid minimum that could be the closest."""
    ts = np.arange(lo, hi + 1e-9, step)
    e, r, _ = SatrecArray([si, sj]).sgp4(np.full(ts.shape, jd0), fr0 + ts / 86400.0)
    ok = (e[0] == 0) & (e[1] == 0)
    d = np.where(ok, np.linalg.norm(r[1] - r[0], axis=1), np.inf)
    is_min = np.r_[True, d[1:] < d[:-1]] & np.r_[d[:-1] <= d[1:], True]
    idx = np.flatnonzero(is_min & np.isfinite(d))
    if len(idx) == 0:
        return None
    idx = idx[d[idx] <= d[idx].min() + vmax * step / 2.0]
    pair = SGP4Pair(si, sj, jd0, fr0)
    best = None
    for i in idx:
        a, b = max(lo, ts[i] - step), min(hi, ts[i] + step)
        try:
            res = minimize_scalar(pair.dist, bounds=(a, b), method="bounded", options={"xatol": 1e-4})
        except PropagationError:
            continue
        if best is None or res.fun < best[1]:
            best = (float(res.x), float(res.fun))
    return best


def summarize(values: List[float]) -> Dict[str, float]:
    a = np.abs(np.asarray(values, dtype=float))
    if len(a) == 0:
        return {"median": "", "p95": "", "max": ""}
    return {"median": float(np.median(a)), "p95": float(np.percentile(a, 95)), "max": float(a.max())}


def parse_args(argv: Optional[Sequence[str]] = None):
    ap = argparse.ArgumentParser(description="Exp 3: TCA estimation")
    ap.add_argument("--recall-dir", default=os.path.join(RESULTS, "screening_recall_n2000_h24_ref10s_seed1"),
                    help="Exp 2b results folder (events.csv + run.json)")
    ap.add_argument("--seed", type=int, default=1, help="seed for the coarse-sample offsets in 3a")
    ap.add_argument("--max-events", type=int, default=0, help="cap on 3a encounters (0 = all)")
    ap.add_argument("--orca-step-h", type=float, default=1.0, help="ORCA search_step_hours")
    ap.add_argument("--orca-screen-km", type=float, default=100.0, help="ORCA initial_screen_km")
    ap.add_argument("--orca-window-h", type=float, default=6.0, help="ORCA refine_window_hours")
    ap.add_argument("--tag", help="results folder suffix (default: from the Exp 2b folder name)")
    return ap.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> str:
    a = parse_args(argv)
    t_all = time.perf_counter()
    with open(os.path.join(a.recall_dir, "run.json"), encoding="utf-8") as f:
        run2b = json.load(f)
    catalog = os.path.join(DATA_DIR, run2b["catalog"])
    if snapshot_sha256(catalog) != run2b["catalog_sha256"]:
        raise SystemExit(f"{catalog} does not match the snapshot the Exp 2b run used")
    sats = {o.norad_id: o.satrec for o in load_snapshot(catalog)}
    start = datetime.fromisoformat(run2b["window_start_utc"])
    window_s = float(run2b["args"]["hours"]) * 3600.0
    jd0, fr0 = jday(start.year, start.month, start.day, start.hour, start.minute,
                    start.second + start.microsecond / 1e6)

    with open(os.path.join(a.recall_dir, "events.csv"), encoding="utf-8") as f:
        events = [r for r in csv.DictReader(f) if r["persistent_pair"] == "0"]
    for e in events:
        e["t_s"] = (datetime.fromisoformat(e["tca_utc"]) - start).total_seconds()

    tag = a.tag or os.path.basename(os.path.normpath(a.recall_dir)).replace("screening_recall_", "")
    out_dir = os.path.join(RESULTS, f"tca_{tag}")
    os.makedirs(out_dir, exist_ok=True)

    # ---------------- 3a: local accuracy ----------------
    rng = np.random.default_rng(a.seed)
    local_events = events if not a.max_events else events[: a.max_events]
    local_rows = []
    skipped_local = 0
    t0 = time.perf_counter()
    for e in local_events:
        pair = SGP4Pair(sats[e["sat1_id"]], sats[e["sat2_id"]], jd0, fr0)
        try:
            t_ref, d_ref = reference_tca(pair, e["t_s"])
        except PropagationError:
            skipped_local += 1
            continue
        vrel = float(e["relative_velocity_kms"])
        t_c = t_ref + rng.uniform(-30.0, 30.0)
        lo, hi = t_c - 60.0, t_c + 60.0
        for name, fn in LOCAL_METHODS:
            pair.calls = 0
            tic = time.perf_counter()
            try:
                t_est, d_est = fn(pair, lo, hi)
            except PropagationError:
                continue
            us = (time.perf_counter() - tic) * 1e6
            local_rows.append({
                "sat1_id": e["sat1_id"], "sat2_id": e["sat2_id"], "vrel_kms": vrel, "band": band_label(vrel),
                "ref_miss_km": d_ref, "method": name, "tca_error_s": t_est - t_ref,
                "miss_error_m": (d_est - d_ref) * 1000.0, "evaluations": pair.calls, "microseconds": us,
            })
    t_local = time.perf_counter() - t0
    _write_csv(os.path.join(out_dir, "local.csv"), local_rows)

    groups = defaultdict(list)
    for r in local_rows:
        groups[(r["method"], "all")].append(r)
        groups[(r["method"], r["band"])].append(r)
    local_summary = []
    for (method, band), rs in groups.items():
        te, me = summarize([r["tca_error_s"] for r in rs]), summarize([r["miss_error_m"] for r in rs])
        local_summary.append({
            "method": method, "band": band, "n": len(rs),
            "tca_err_s_median": te["median"], "tca_err_s_p95": te["p95"], "tca_err_s_max": te["max"],
            "miss_err_m_median": me["median"], "miss_err_m_p95": me["p95"], "miss_err_m_max": me["max"],
            "evaluations_mean": float(np.mean([r["evaluations"] for r in rs])),
            "microseconds_mean": float(np.mean([r["microseconds"] for r in rs])),
        })
    order = {m: k for k, (m, _) in enumerate(LOCAL_METHODS)}
    local_summary.sort(key=lambda r: (order[r["method"]], r["band"] != "all", r["band"]))
    _write_csv(os.path.join(out_dir, "local_summary.csv"), local_summary)

    # ---------------- 3b: ORCA's global refinement ----------------
    by_pair = defaultdict(list)
    for e in events:
        by_pair[(e["sat1_id"], e["sat2_id"])].append(e)
    step_s, win_s = a.orca_step_h * 3600.0, a.orca_window_h * 3600.0
    n_steps = int(window_s // step_s) + 1
    global_rows = []
    not_flagged = 0
    t0 = time.perf_counter()
    for (id1, id2), evs in by_pair.items():
        si, sj = sats[id1], sats[id2]
        pair = SGP4Pair(si, sj, jd0, fr0)
        try:
            ds = [(pair.dist(k * step_s), k * step_s) for k in range(n_steps)]
        except PropagationError:
            continue
        flagged = [x for x in ds if x[0] <= a.orca_screen_km]
        if not flagged:
            not_flagged += 1
            continue
        t_c = min(flagged)[1]
        lo, hi = t_c - win_s, t_c + win_s
        truth = dense_truth(si, sj, jd0, fr0, lo, hi)
        if truth is None:
            continue
        row = {"sat1_id": id1, "sat2_id": id2, "candidate_s": t_c,
               "truth_tca_s": truth[0], "truth_miss_km": truth[1],
               "ref_events_in_pair": len(evs),
               "ref_event_in_window": int(any(lo <= e["t_s"] <= hi for e in evs)),
               "ref_min_miss_km": min(float(e["miss_km"]) for e in evs)}
        for name, fn in (("orca_brent", lambda p: brent_min(p, lo, hi, 1e-5 * 3600.0)),
                         ("root_all_minima_60s", lambda p: all_minima_root(p, lo, hi, 60.0, 1e-3))):
            pair.calls = 0
            tic = time.perf_counter()
            try:
                t_est, d_est = fn(pair)
            except PropagationError:
                t_est, d_est = float("nan"), float("nan")
            row[f"{name}_tca_s"] = t_est
            row[f"{name}_miss_km"] = d_est
            row[f"{name}_found_closest"] = int(abs(t_est - truth[0]) <= 1.0)
            row[f"{name}_outside_window"] = int(not 0.0 <= t_est <= window_s)
            row[f"{name}_evaluations"] = pair.calls
            row[f"{name}_microseconds"] = (time.perf_counter() - tic) * 1e6
        global_rows.append(row)
    t_global = time.perf_counter() - t0
    _write_csv(os.path.join(out_dir, "global.csv"), global_rows)

    global_summary = []
    for name in ("orca_brent", "root_all_minima_60s"):
        g = global_rows
        miss_err = [(r[f"{name}_miss_km"] - r["truth_miss_km"]) for r in g]
        global_summary.append({
            "method": name, "pairs": len(g),
            "found_closest_share": float(np.mean([r[f"{name}_found_closest"] for r in g])) if g else "",
            "reported_below_10km_share": float(np.mean([r[f"{name}_miss_km"] < 10.0 for r in g])) if g else "",
            "outside_window_share": float(np.mean([r[f"{name}_outside_window"] for r in g])) if g else "",
            "miss_err_km_median": summarize(miss_err)["median"], "miss_err_km_p95": summarize(miss_err)["p95"],
            "evaluations_mean": float(np.mean([r[f"{name}_evaluations"] for r in g])) if g else "",
            "microseconds_mean": float(np.mean([r[f"{name}_microseconds"] for r in g])) if g else "",
        })
    _write_csv(os.path.join(out_dir, "global_summary.csv"), global_summary)

    run = {
        "experiment": "exp3_tca",
        "args": vars(a),
        "exp2b_run": os.path.basename(os.path.normpath(a.recall_dir)),
        "catalog": run2b["catalog"], "catalog_sha256": run2b["catalog_sha256"],
        "window_start_utc": run2b["window_start_utc"], "window_hours": run2b["args"]["hours"],
        "local_events": len(local_events), "local_skipped_propagation": skipped_local,
        "global_pairs_with_reference_event": len(by_pair), "global_pairs_not_flagged_by_orca_screen": not_flagged,
        "global_pairs_evaluated": len(global_rows),
        "truth_below_10km_share": float(np.mean([r["truth_miss_km"] < 10.0 for r in global_rows])) if global_rows else None,
        "ref_event_in_window_share": float(np.mean([r["ref_event_in_window"] for r in global_rows])) if global_rows else None,
        "seconds": {"local": t_local, "global": t_global, "total": time.perf_counter() - t_all},
        "versions": {"python": platform.python_version(), "numpy": np.__version__,
                     "scipy": scipy.__version__, "sgp4": sgp4.__version__},
        "platform": {"system": platform.platform(), "processor": platform.processor(),
                     "cpu_count": os.cpu_count()},
    }
    with open(os.path.join(out_dir, "run.json"), "w", encoding="utf-8") as f:
        json.dump(run, f, indent=2, default=str)

    _print(local_summary, global_summary, run)
    print(f"wrote {out_dir}")
    return out_dir


def _write_csv(path: str, rows: List[Dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        if not rows:
            return
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def _print(local_summary, global_summary, run) -> None:
    print(f"\n3a local, {run['local_events']} encounters (window t_c +- 60 s)")
    print(f"{'method':<20}{'|dTCA| med s':>13}{'p95 s':>10}{'miss err med m':>16}{'p95 m':>10}{'evals':>8}{'us':>9}")
    for r in local_summary:
        if r["band"] != "all":
            continue
        print(f"{r['method']:<20}{r['tca_err_s_median']:>13.4g}{r['tca_err_s_p95']:>10.4g}"
              f"{r['miss_err_m_median']:>16.4g}{r['miss_err_m_p95']:>10.4g}"
              f"{r['evaluations_mean']:>8.1f}{r['microseconds_mean']:>9.0f}")
    print(f"\n3b global, {run['global_pairs_evaluated']} pairs flagged by the ORCA screen "
          f"({run['global_pairs_not_flagged_by_orca_screen']} of {run['global_pairs_with_reference_event']} "
          f"pairs with a <10 km encounter were not flagged)")
    print(f"  window contains a <10 km reference encounter: {run['ref_event_in_window_share']:.1%}; "
          f"true closest approach in window < 10 km: {run['truth_below_10km_share']:.1%}")
    for r in global_summary:
        print(f"  {r['method']:<20} found closest {r['found_closest_share']:.1%}  reports <10 km "
              f"{r['reported_below_10km_share']:.1%}  outside window {r['outside_window_share']:.1%}  "
              f"miss err median {r['miss_err_km_median']:.3g} km, p95 {r['miss_err_km_p95']:.3g} km  "
              f"evals {r['evaluations_mean']:.0f}")


if __name__ == "__main__":
    main()
