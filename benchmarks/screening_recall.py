"""
Exp 2b of the research brief: how many close approaches does snapshot screening miss?

ORCA screens positions sampled every search_step_hours (1 h) with a fixed radius (100 km). An encounter
is only seen if a sample happens to fall while the pair is inside the radius, so fast encounters slip
between samples. This script measures that recall against a dense-time reference.

Reference: every object propagated with SGP4 (sgp4 package) on a fine grid (ref_step, default 10 s).
At each step a KD-tree collects all pairs within radius_query. Any encounter whose true miss distance is
below event_km has a sample within ref_step/2 of its TCA, at distance <= event_km + v_max*ref_step/2, so
it appears as a grid local minimum below that bound. Each such minimum is refined with bounded Brent
over +-ref_step (relative motion is effectively straight over 20 s, so the function is unimodal there).
The guarantee needs v_max to bound the relative speed, hence the LEO-only filter (apogee <= 2000 km,
so |v_rel| < 16 km/s).

Screens: the same samples, taken every `step` seconds (a multiple of ref_step), with radius r.
  event recall: the screen flags a sample during the encounter's own pass (a maximal run of
                consecutive samples of that pair inside the query radius)
  pair recall:  the pair is flagged at any time in the window (what ORCA keeps: one row per pair)
The propagator is the same everywhere, so the result isolates sampling, not propagation error.

Run from the repo root (snapshot first with benchmarks/snapshot_catalog.py):
  python benchmarks/screening_recall.py --n 2000 --hours 24
Writes benchmarks/results/screening_recall_<tag>/{events.csv, recall.csv, run.json}.
"""
import argparse
import csv
import json
import math
import os
import platform
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import scipy
import sgp4
from scipy.optimize import minimize_scalar
from scipy.spatial import cKDTree
from sgp4.api import SatrecArray, jday

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import (  # noqa: E402
    fresh_only,
    latest_snapshot,
    leo_only,
    load_snapshot,
    snapshot_sha256,
    subset,
)

V_BANDS: List[Tuple[float, float]] = [(0.0, 0.1), (0.1, 1.0), (1.0, 5.0), (5.0, 10.0), (10.0, math.inf)]
DEFAULT_STEPS = [3600, 1800, 600, 300, 60, 20]
DEFAULT_RADII = [10.0, 25.0, 50.0, 100.0, 200.0]


# ---------------------------------------------------------------------------
# Reference: dense-time close pairs
# ---------------------------------------------------------------------------
def close_pair_rows(sats, jd0: float, fr0: float, nt: int, step_s: float, radius_km: float,
                    chunk: int = 360):
    """
    Propagate all satellites on t_k = k*step_s (k < nt) and return every (i, j, k, d) with d <= radius_km.
    States sgp4 cannot compute (decay, bad elements) are parked far away so they never pair.
    """
    arr = SatrecArray(sats)
    n = len(sats)
    far = np.column_stack([1e9 + 1e5 * np.arange(n), np.zeros(n), np.zeros(n)])
    I, J, K, D = [], [], [], []
    bad_states = 0
    for k0 in range(0, nt, chunk):
        ks = np.arange(k0, min(k0 + chunk, nt))
        fr = fr0 + ks * step_s / 86400.0
        e, r, _ = arr.sgp4(np.full(fr.shape, jd0), fr)
        bad = e != 0
        if bad.any():
            bad_states += int(bad.sum())
            r = np.where(bad[:, :, None], far[:, None, :], r)
        for c, k in enumerate(ks):
            pos = r[:, c, :]
            p = cKDTree(pos).query_pairs(radius_km, output_type="ndarray")
            if len(p) == 0:
                continue
            I.append(p[:, 0].astype(np.int32))
            J.append(p[:, 1].astype(np.int32))
            K.append(np.full(len(p), k, dtype=np.int32))
            D.append(np.linalg.norm(pos[p[:, 0]] - pos[p[:, 1]], axis=1))
    if not I:
        empty = np.empty(0, dtype=np.int32)
        return empty, empty, empty, np.empty(0), bad_states
    return np.concatenate(I), np.concatenate(J), np.concatenate(K), np.concatenate(D), bad_states


def grid_local_minima(I: np.ndarray, J: np.ndarray, K: np.ndarray, D: np.ndarray, n: int, nt: int):
    """
    Per pair, the samples whose distance is a local minimum along k. A missing neighbour sample means
    the pair was outside the query radius there, i.e. farther away. Plateaus count once (first sample).

    A pass ("run") is a maximal stretch of consecutive samples of one pair inside the query radius.
    Returns (minima, rows):
      minima: dict of arrays (key, i, j, k, d, run, edge, persistent)
      rows:   dict of arrays (key, k, d, run) for every sample, sorted by key then k
    persistent: the pair stayed inside the query radius for the whole window (e.g. docked vehicles).
    """
    key = I.astype(np.int64) * n + J
    order = np.lexsort((K, key))
    key, I, J, K, D = key[order], I[order], J[order], K[order], D[order]

    m = len(key)
    linked = np.zeros(m + 1, dtype=bool)  # linked[p] -> sample p-1 is the same pair at k-1
    if m > 1:
        linked[1:m] = (key[1:] == key[:-1]) & (K[1:] == K[:-1] + 1)
    run = np.cumsum(~linked[:m]) - 1
    prev_d = np.r_[np.inf, D[:-1]]
    next_d = np.r_[D[1:], np.inf]
    left_ok = ~linked[:m] | (prev_d > D)
    right_ok = ~linked[1:m + 1] | (next_d >= D)
    is_min = left_ok & right_ok

    uniq, counts = np.unique(key, return_counts=True)
    persistent_keys = uniq[counts == nt]

    sel = np.flatnonzero(is_min)
    minima = {
        "key": key[sel], "i": I[sel], "j": J[sel], "k": K[sel], "d": D[sel], "run": run[sel],
        "edge": (K[sel] == 0) | (K[sel] == nt - 1),
        "persistent": np.isin(key[sel], persistent_keys),
    }
    return minima, {"key": key, "k": K, "d": D, "run": run}


def refine(sat_i, sat_j, jd0: float, fr0: float, t_center_s: float, half_s: float):
    """Bounded Brent on |r_i - r_j| over [t_center - half, t_center + half]. Returns (tca_s, miss_km, vrel_kms, at_bound) or None."""
    def state(sat, t):
        e, r, v = sat.sgp4(jd0, fr0 + t / 86400.0)
        if e != 0:
            raise ValueError(e)
        return np.array(r), np.array(v)

    def sep(t):
        ri, _ = state(sat_i, t)
        rj, _ = state(sat_j, t)
        return float(np.linalg.norm(ri - rj))

    lo, hi = t_center_s - half_s, t_center_s + half_s
    try:
        res = minimize_scalar(sep, bounds=(lo, hi), method="bounded", options={"xatol": 1e-3})
        ri, vi = state(sat_i, res.x)
        rj, vj = state(sat_j, res.x)
    except ValueError:
        return None
    at_bound = min(res.x - lo, hi - res.x) < 0.01 * half_s
    return float(res.x), float(np.linalg.norm(ri - rj)), float(np.linalg.norm(vi - vj)), bool(at_bound)


# ---------------------------------------------------------------------------
# Screens
# ---------------------------------------------------------------------------
def evaluate_screen(rows: Dict[str, np.ndarray], ref_step: float, step: float, radius: float,
                    ev_key: np.ndarray, ev_run: np.ndarray):
    """
    Screen = samples with k % (step/ref_step) == 0 and d <= radius.
    An event counts as detected when the screen flags a sample in the event's own pass (run), so a
    flag from an earlier or later pass of the same pair does not count. A run is defined at the query
    radius, which is at least the screen radius, so a slow pair that never leaves the query radius is one
    long pass (lenient for co-orbital pairs; they are reported in their own velocity band).
    Returns (event_detected[bool per event], pair_detected[bool per event], candidate_pairs, flagged_samples).
    """
    m = int(round(step / ref_step))
    if m < 1 or abs(m * ref_step - step) > 1e-9:
        raise ValueError("screen step must be a positive multiple of the reference step")
    mask = (rows["k"] % m == 0) & (rows["d"] <= radius)
    flagged_pairs = np.unique(rows["key"][mask])
    flagged_runs = np.unique(rows["run"][mask])
    ev_det = np.isin(ev_run, flagged_runs)
    pair_det = np.isin(ev_key, flagged_pairs)
    return ev_det, pair_det, int(len(flagged_pairs)), int(mask.sum())


def band_label(lo: float, hi: float) -> str:
    return f"{lo:g}-{hi:g}" if math.isfinite(hi) else f">={lo:g}"


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------
def parse_args(argv: Optional[Sequence[str]] = None):
    ap = argparse.ArgumentParser(description="Exp 2b: snapshot screening recall vs a dense-time reference")
    ap.add_argument("--catalog", help="3-line TLE snapshot (default: newest benchmarks/data/catalog_*.tle)")
    ap.add_argument("--n", type=int, default=2000, help="random LEO objects to use (default 2000; 0 = all)")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--hours", type=float, default=24.0, help="window length")
    ap.add_argument("--start", help="window start, ISO UTC (default: newest TLE epoch, rounded up to the minute)")
    ap.add_argument("--max-age-days", type=float, default=7.0, help="drop TLEs older than this at the start")
    ap.add_argument("--ref-step", type=float, default=10.0, help="reference grid step, s")
    ap.add_argument("--event-km", type=float, default=10.0, help="reference encounters: true miss below this")
    ap.add_argument("--thresholds", type=float, nargs="+", default=[1.0, 5.0, 10.0],
                    help="miss-distance cuts reported in recall.csv (each <= --event-km)")
    ap.add_argument("--vmax", type=float, default=16.0, help="bound on LEO relative speed, km/s")
    ap.add_argument("--steps", type=float, nargs="+", default=DEFAULT_STEPS, help="screen steps, s")
    ap.add_argument("--radii", type=float, nargs="+", default=DEFAULT_RADII, help="screen radii, km")
    ap.add_argument("--tag", help="results folder suffix (default: derived from the arguments)")
    return ap.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> str:
    a = parse_args(argv)
    t_start = time.perf_counter()

    catalog = a.catalog or latest_snapshot()
    if not catalog:
        raise SystemExit("No snapshot found. Run: python benchmarks/snapshot_catalog.py")
    if max(a.thresholds) > a.event_km:
        raise SystemExit("--thresholds must not exceed --event-km")

    objs_all = load_snapshot(catalog)
    if a.start:
        start = datetime.fromisoformat(a.start.replace("Z", ""))
    else:
        newest = max(o.epoch for o in objs_all)
        start = (newest + timedelta(minutes=1)).replace(second=0, microsecond=0)
    objs = subset(fresh_only(leo_only(objs_all), start, a.max_age_days), a.n or None, a.seed)
    n = len(objs)
    if n < 2:
        raise SystemExit("Fewer than two objects after filtering")

    ref_step = float(a.ref_step)
    nt = int(round(a.hours * 3600.0 / ref_step)) + 1
    capture_km = a.event_km + a.vmax * ref_step / 2.0
    radius_query = max(max(a.radii), capture_km)
    jd0, fr0 = jday(start.year, start.month, start.day, start.hour, start.minute,
                    start.second + start.microsecond / 1e6)
    sats = [o.satrec for o in objs]

    print(f"{n} LEO objects, {nt} steps of {ref_step:g} s from {start.isoformat()}Z, "
          f"query radius {radius_query:g} km (capture bound {capture_km:g} km)")

    t0 = time.perf_counter()
    I, J, K, D, bad_states = close_pair_rows(sats, jd0, fr0, nt, ref_step, radius_query)
    t_rows = time.perf_counter() - t0
    print(f"reference grid: {len(I):,} close samples in {t_rows:.1f} s ({bad_states} failed states)")

    mins, rows = grid_local_minima(I, J, K, D, n, nt)
    cand = np.flatnonzero(~mins["edge"] & (mins["d"] <= capture_km))
    t0 = time.perf_counter()
    events = []
    failed = 0
    for p in cand:
        i, j, k = int(mins["i"][p]), int(mins["j"][p]), int(mins["k"][p])
        res = refine(sats[i], sats[j], jd0, fr0, k * ref_step, ref_step)
        if res is None:
            failed += 1
            continue
        tca_s, miss, vrel, at_bound = res
        if miss < a.event_km:
            events.append((int(mins["key"][p]), i, j, tca_s, miss, vrel, at_bound, bool(mins["persistent"][p]),
                           int(mins["run"][p])))
    t_ref = time.perf_counter() - t0
    print(f"refined {len(cand):,} grid minima in {t_ref:.1f} s -> {len(events):,} encounters "
          f"below {a.event_km:g} km ({failed} refinements failed)")

    ev_key = np.array([e[0] for e in events], dtype=np.int64)
    ev_run = np.array([e[8] for e in events], dtype=np.int64)
    ev_miss = np.array([e[4] for e in events], dtype=float)
    ev_vrel = np.array([e[5] for e in events], dtype=float)
    ev_pers = np.array([e[7] for e in events], dtype=bool)

    tag = a.tag or f"n{n}_h{a.hours:g}_ref{ref_step:g}s_seed{a.seed}"
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results", f"screening_recall_{tag}")
    os.makedirs(out_dir, exist_ok=True)

    with open(os.path.join(out_dir, "events.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["sat1_id", "sat1_name", "sat2_id", "sat2_name", "tca_utc", "miss_km",
                    "relative_velocity_kms", "persistent_pair", "refine_at_bound"])
        for key, i, j, tca_s, miss, vrel, at_bound, pers, _run in events:
            w.writerow([objs[i].norad_id, objs[i].name, objs[j].norad_id, objs[j].name,
                        (start + timedelta(seconds=tca_s)).isoformat(timespec="milliseconds"),
                        f"{miss:.6f}", f"{vrel:.6f}", int(pers), int(at_bound)])

    t0 = time.perf_counter()
    recall_rows = []
    total_pairs = n * (n - 1) // 2
    populations = {"non_persistent": ~ev_pers, "all": np.ones(len(events), dtype=bool)}
    bands = [("all", 0.0, math.inf)] + [(band_label(lo, hi), lo, hi) for lo, hi in V_BANDS]
    for step in a.steps:
        for radius in a.radii:
            ev_det, pair_det, n_cand, n_flag = evaluate_screen(rows, ref_step, step, radius, ev_key, ev_run)
            for pop_name, pop in populations.items():
                for thr in a.thresholds:
                    for bname, lo, hi in bands:
                        sel = pop & (ev_miss < thr) & (ev_vrel >= lo) & (ev_vrel < hi)
                        n_ev = int(sel.sum())
                        recall_rows.append({
                            "step_s": step, "radius_km": radius, "population": pop_name,
                            "miss_below_km": thr, "vrel_band_kms": bname, "events": n_ev,
                            "event_detected": int(ev_det[sel].sum()), "pair_detected": int(pair_det[sel].sum()),
                            "event_recall": (ev_det[sel].sum() / n_ev) if n_ev else "",
                            "pair_recall": (pair_det[sel].sum() / n_ev) if n_ev else "",
                            "candidate_pairs": n_cand, "flagged_samples": n_flag, "total_pairs": total_pairs,
                        })
    t_eval = time.perf_counter() - t0

    with open(os.path.join(out_dir, "recall.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(recall_rows[0].keys()))
        w.writeheader()
        w.writerows(recall_rows)

    run = {
        "experiment": "exp2b_screening_recall",
        "args": vars(a),
        "catalog": os.path.basename(catalog),
        "catalog_sha256": snapshot_sha256(catalog),
        "objects_in_catalog": len(objs_all),
        "objects_used": n,
        "window_start_utc": start.isoformat(),
        "steps_in_reference": nt,
        "query_radius_km": radius_query,
        "capture_bound_km": capture_km,
        "close_samples": int(len(I)),
        "failed_states": bad_states,
        "grid_minima": int(len(mins["key"])),
        "grid_minima_at_window_edge": int(mins["edge"].sum()),
        "refined": int(len(cand)),
        "refine_failed": failed,
        "events": len(events),
        "events_persistent_pair": int(ev_pers.sum()),
        "events_refine_at_bound": int(sum(e[6] for e in events)),
        "seconds": {"reference_grid": t_rows, "refinement": t_ref, "screens": t_eval,
                    "total": time.perf_counter() - t_start},
        "versions": {"python": platform.python_version(), "numpy": np.__version__,
                     "scipy": scipy.__version__, "sgp4": sgp4.__version__},
        "platform": {"system": platform.platform(), "processor": platform.processor(),
                     "cpu_count": os.cpu_count()},
    }
    with open(os.path.join(out_dir, "run.json"), "w", encoding="utf-8") as f:
        json.dump(run, f, indent=2, default=str)

    _print_summary(recall_rows, a, ev_pers)
    print(f"wrote {out_dir}")
    return out_dir


def _print_summary(rows: List[Dict], a, ev_pers: np.ndarray) -> None:
    thr = max(a.thresholds)
    pick = {(r["step_s"], r["radius_km"]): r for r in rows
            if r["population"] == "non_persistent" and r["miss_below_km"] == thr and r["vrel_band_kms"] == "all"}
    if not pick:
        return
    n_ev = next(iter(pick.values()))["events"]
    print(f"\nEvent recall, non-persistent encounters with miss < {thr:g} km (n = {n_ev}; "
          f"{int(ev_pers.sum())} persistent-pair events excluded)")
    print("step_s \\ radius_km " + "".join(f"{r:>9g}" for r in a.radii))
    for s in a.steps:
        cells = []
        for r in a.radii:
            v = pick[(s, r)]["event_recall"]
            cells.append(f"{v:9.1%}" if v != "" else f"{'-':>9}")
        print(f"{s:>18g} " + "".join(cells))

    orca = [r for r in rows if r["step_s"] == 3600 and r["radius_km"] == 100.0
            and r["population"] == "non_persistent" and r["miss_below_km"] == thr]
    if orca:
        print("\nORCA as built (3600 s, 100 km), by relative-velocity band:")
        for r in orca:
            rec = f"{r['event_recall']:.1%}" if r["event_recall"] != "" else "-"
            prec = f"{r['pair_recall']:.1%}" if r["pair_recall"] != "" else "-"
            print(f"  {r['vrel_band_kms']:>8} km/s  n={r['events']:<6} event recall {rec:>7}  pair recall {prec:>7}")


if __name__ == "__main__":
    main()
