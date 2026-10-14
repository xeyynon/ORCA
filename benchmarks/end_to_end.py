"""
Exp 5 of the research brief: ORCA as built vs a corrected pipeline, end to end.

Same objects and window as an Exp 2b run (LEO, TLE <= 7 days old, random subset, 24 h from the newest
epoch).

  A  ORCA as built: conjunction_detection.ConjunctionSearch on elements built through ORCA's own parser
     (engine propagator, 1 h grid, KD-tree at 100 km, bounded Brent over +-6 h, legacy Pc and tiers),
     single process.
  B  corrected: SGP4 (sgp4 package); KD-tree screen every 20 s at 200 km, which captures every encounter
     below 10 km (10 + 16 km/s x 10 s = 170 km <= 200 km); range-rate root-finding inside each pass;
     Foster Pc with ORCA's hard-body radii, under two covariances:
       B_iso  ORCA's isotropic sigma = 0.5 km + 2 km/day x TLE age per object (formula fixed, inputs not)
       B_ric  in-track sigma = ORCA's sigma, radial and cross-track = max(sigma / 100, 0.1 km): the shape
              measured in Exp 1 (in-track ~100x radial at ~6 days, radial 0.13 km), with ORCA's size, which
              matches the measured in-track spread at that horizon for non-Starlink objects. The floor keeps
              young TLEs from getting a radial sigma of a few metres; it is an assumption, not a measurement.
     B reports encounters with miss < 10 km.

A's events are checked against SGP4: the closest approach of that pair within +-10 min of the TCA that
A claims (true_miss_near_claim). B's events count as found by A if A reports the same pair within
+-10 min. Pc tiers use ORCA's thresholds for every pipeline.

Run from the repo root:  python benchmarks/end_to_end.py [--recall-dir <Exp 2b results folder>]
Writes benchmarks/results/end_to_end_<tag>/{events_a.csv, events_b.csv, summary.json}.
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
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Sequence

import numpy as np
import scipy
import sgp4
from scipy.stats import kendalltau
from sgp4.api import jday

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import DATA_DIR, fresh_only, leo_only, load_snapshot, snapshot_sha256, subset  # noqa: E402
from benchmarks.pc import encounter_plane, pc_foster, ric_covariance  # noqa: E402
from benchmarks.screening_recall import close_pair_rows, grid_local_minima  # noqa: E402
from benchmarks.tca import PropagationError, SGP4Pair, all_minima_root, brent_root  # noqa: E402
from conjunction_detection import (  # noqa: E402
    ConjunctionDetector,
    ConjunctionSearch,
    CovarianceModel,
    HardBodyRadiusModel,
)
from parser_pipeline import TLEParser  # noqa: E402

RESULTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
TIERS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NEGLIGIBLE"]
MATCH_S = 600.0


def parse_args(argv: Optional[Sequence[str]] = None):
    ap = argparse.ArgumentParser(description="Exp 5: ORCA as built vs corrected pipeline")
    ap.add_argument("--recall-dir", default=os.path.join(RESULTS, "screening_recall_n2000_h24_ref10s_seed1"),
                    help="Exp 2b run whose objects and window are reused")
    ap.add_argument("--b-step", type=float, default=20.0)
    ap.add_argument("--b-radius", type=float, default=200.0)
    ap.add_argument("--report-km", type=float, default=10.0)
    ap.add_argument("--vmax", type=float, default=16.0)
    ap.add_argument("--ric-ratio", type=float, default=100.0, help="in-track / radial (= cross-track) sigma")
    ap.add_argument("--ric-floor-km", type=float, default=0.1, help="lower bound on radial and cross-track sigma")
    ap.add_argument("--tag")
    return ap.parse_args(argv)


def b_covariances(r1, v1, r2, v2, s1, s2, ratio, floor):
    iso = np.eye(3) * (s1 * s1 + s2 * s2)
    q1, q2 = max(s1 / ratio, floor), max(s2 / ratio, floor)
    ric = ric_covariance(r1, v1, q1, s1, q1) + ric_covariance(r2, v2, q2, s2, q2)
    return iso, ric


def main(argv: Optional[Sequence[str]] = None) -> str:
    a = parse_args(argv)
    with open(os.path.join(a.recall_dir, "run.json"), encoding="utf-8") as f:
        run2b = json.load(f)
    args2b = run2b["args"]
    catalog = os.path.join(DATA_DIR, run2b["catalog"])
    if snapshot_sha256(catalog) != run2b["catalog_sha256"]:
        raise SystemExit(f"{catalog} does not match the snapshot the Exp 2b run used")
    start = datetime.fromisoformat(run2b["window_start_utc"])
    objs = subset(fresh_only(leo_only(load_snapshot(catalog)), start, args2b["max_age_days"]),
                  args2b["n"] or None, args2b["seed"])
    if len(objs) != run2b["objects_used"]:
        raise SystemExit("object selection does not reproduce the Exp 2b run")
    hours = float(args2b["hours"])
    window_s = hours * 3600.0
    jd0, fr0 = jday(start.year, start.month, start.day, start.hour, start.minute,
                    start.second + start.microsecond / 1e6)
    by_id = {o.norad_id: o for o in objs}
    det = ConjunctionDetector(time_horizon_days=hours / 24.0, search_step_hours=1.0, initial_screen_km=100.0,
                              refine_window_hours=6.0, pc_min_filter=1e-12)
    print(f"{len(objs)} objects, {hours:g} h from {start.isoformat()}Z")

    # ---------------- A: ORCA as built ----------------
    elements = {}
    for o in objs:
        tle = TLEParser.parse_lines(o.name, o.line1, o.line2)
        if tle is not None:
            elements[o.norad_id] = (tle.to_orbital_element(), o.name)
    t0 = time.perf_counter()
    ev_a = ConjunctionSearch(det, parallel=False).search_catalog(elements, start_epoch=start)
    t_a = time.perf_counter() - t0
    print(f"A (ORCA as built): {len(ev_a)} events in {t_a:.1f} s")

    # ---------------- B: corrected ----------------
    sats = [o.satrec for o in objs]
    n = len(objs)
    nt = int(round(window_s / a.b_step)) + 1
    capture = a.report_km + a.vmax * a.b_step / 2.0
    if capture > a.b_radius:
        raise SystemExit("B's radius does not guarantee capture at this step")
    t0 = time.perf_counter()
    I, J, K, D, _ = close_pair_rows(sats, jd0, fr0, nt, a.b_step, a.b_radius)
    mins, _ = grid_local_minima(I, J, K, D, n, nt)
    t_screen = time.perf_counter() - t0
    ev_b = []
    for p in np.flatnonzero(~mins["edge"] & (mins["d"] <= capture)):
        i, j, k = int(mins["i"][p]), int(mins["j"][p]), int(mins["k"][p])
        pair = SGP4Pair(sats[i], sats[j], jd0, fr0)
        try:
            tca, miss = brent_root(pair, (k - 1) * a.b_step, (k + 1) * a.b_step, a.b_step, 1e-3)
        except PropagationError:
            continue
        if miss < a.report_km:
            ev_b.append({"i": i, "j": j, "tca_s": tca, "miss_km": miss, "persistent": bool(mins["persistent"][p])})
    t_b = time.perf_counter() - t0

    rows_b = []
    for e in ev_b:
        o1, o2 = objs[e["i"]], objs[e["j"]]
        fr = fr0 + e["tca_s"] / 86400.0
        _, r1, v1 = o1.satrec.sgp4(jd0, fr)
        _, r2, v2 = o2.satrec.sgp4(jd0, fr)
        r1, v1, r2, v2 = map(np.array, (r1, v1, r2, v2))
        tca = start + timedelta(seconds=e["tca_s"])
        s1 = CovarianceModel.position_covariance((tca - o1.epoch).total_seconds())
        s2 = CovarianceModel.position_covariance((tca - o2.epoch).total_seconds())
        hbr = HardBodyRadiusModel.estimate(o1.name) + HardBodyRadiusModel.estimate(o2.name)
        iso, ric = b_covariances(r1, v1, r2, v2, s1, s2, a.ric_ratio, a.ric_floor_km)
        row = {"sat1_id": o1.norad_id, "sat1_name": o1.name, "sat2_id": o2.norad_id, "sat2_name": o2.name,
               "tca_utc": tca.isoformat(timespec="milliseconds"), "tca_s": e["tca_s"], "miss_km": e["miss_km"],
               "vrel_kms": float(np.linalg.norm(v2 - v1)), "persistent_pair": int(e["persistent"]), "hbr_km": hbr}
        for name, cov in (("iso", iso), ("ric", ric)):
            m2, c2 = encounter_plane(r2 - r1, v2 - v1, cov)
            pc = pc_foster(m2, c2, hbr)
            row[f"pc_{name}"], row[f"tier_{name}"] = pc, det._risk_level(pc)
        rows_b.append(row)
    t_b_total = time.perf_counter() - t0
    print(f"B (corrected): {len(rows_b)} encounters below {a.report_km:g} km; screen {t_screen:.1f} s, "
          f"+ refine {t_b - t_screen:.1f} s, + Pc {t_b_total - t_b:.1f} s")

    # ---------------- Check A against SGP4, and match ----------------
    b_by_pair = defaultdict(list)
    for r in rows_b:
        b_by_pair[tuple(sorted((r["sat1_id"], r["sat2_id"])))].append(r)
    rows_a = []
    for e in ev_a:
        key = tuple(sorted((e.sat1_id, e.sat2_id)))
        t_claim = (e.tca - start).total_seconds()
        pair = SGP4Pair(by_id[e.sat1_id].satrec, by_id[e.sat2_id].satrec, jd0, fr0)
        try:
            _, true_miss = all_minima_root(pair, t_claim - MATCH_S, t_claim + MATCH_S, 60.0, 1e-3)
        except PropagationError:
            true_miss = float("nan")
        matched = any(abs(b["tca_s"] - t_claim) <= MATCH_S for b in b_by_pair.get(key, []))
        rows_a.append({"sat1_id": e.sat1_id, "sat1_name": e.sat1_name, "sat2_id": e.sat2_id,
                       "sat2_name": e.sat2_name, "tca_utc": e.tca.isoformat(timespec="milliseconds"),
                       "claimed_miss_km": e.min_distance, "pc_legacy": e.probability_of_collision,
                       "tier_legacy": e.risk_level, "true_miss_near_claim_km": true_miss,
                       "matches_b_encounter": int(matched),
                       "tca_outside_window": int(not 0.0 <= t_claim <= window_s)})
    a_by_pair = defaultdict(list)
    for r in rows_a:
        a_by_pair[tuple(sorted((r["sat1_id"], r["sat2_id"])))].append(
            (datetime.fromisoformat(r["tca_utc"]) - start).total_seconds())
    for r in rows_b:
        key = tuple(sorted((r["sat1_id"], r["sat2_id"])))
        r["found_by_a"] = int(any(abs(t - r["tca_s"]) <= MATCH_S for t in a_by_pair.get(key, [])))

    tag = a.tag or os.path.basename(os.path.normpath(a.recall_dir)).replace("screening_recall_", "")
    out_dir = os.path.join(RESULTS, f"end_to_end_{tag}")
    os.makedirs(out_dir, exist_ok=True)
    _write_csv(os.path.join(out_dir, "events_a.csv"), rows_a)
    _write_csv(os.path.join(out_dir, "events_b.csv"), rows_b)

    def tau(miss, pc):
        return float(kendalltau(-np.asarray(miss), np.asarray(pc)).statistic) if len(miss) > 2 else None

    claimed = np.array([r["claimed_miss_km"] for r in rows_a])
    true_m = np.array([r["true_miss_near_claim_km"] for r in rows_a])
    np_b = [r for r in rows_b if not r["persistent_pair"]]
    summary = {
        "objects": n, "window_start_utc": start.isoformat(), "hours": hours,
        "A": {"events": len(rows_a), "seconds": t_a,
              "claimed_below_report_km": int(np.sum(claimed < a.report_km)),
              "claimed_below_report_km_and_true": int(np.sum((claimed < a.report_km) & (true_m < a.report_km))),
              "true_miss_near_claim_below_report_km": int(np.nansum(true_m < a.report_km)),
              "claimed_minus_true_miss_km_median": float(np.nanmedian(np.abs(claimed - true_m))) if len(rows_a) else None,
              "matches_a_b_encounter": int(sum(r["matches_b_encounter"] for r in rows_a)),
              "tca_outside_window": int(sum(r["tca_outside_window"] for r in rows_a)),
              "tiers": {t: sum(r["tier_legacy"] == t for r in rows_a) for t in TIERS},
              "kendall_tau_miss_vs_pc": tau(claimed, [r["pc_legacy"] for r in rows_a])},
        "B": {"encounters": len(rows_b), "persistent_pair_encounters": len(rows_b) - len(np_b),
              "seconds_total": t_b_total, "seconds_screen": t_screen, "seconds_refine": t_b - t_screen,
              "found_by_a": int(sum(r["found_by_a"] for r in rows_b)),
              "found_by_a_non_persistent": int(sum(r["found_by_a"] for r in np_b)),
              "tiers_iso": {t: sum(r["tier_iso"] == t for r in rows_b) for t in TIERS},
              "tiers_ric": {t: sum(r["tier_ric"] == t for r in rows_b) for t in TIERS},
              "kendall_tau_miss_vs_pc_iso": tau([r["miss_km"] for r in rows_b], [r["pc_iso"] for r in rows_b]),
              "kendall_tau_miss_vs_pc_ric": tau([r["miss_km"] for r in rows_b], [r["pc_ric"] for r in rows_b])},
        "run": {"args": vars(a), "exp2b_run": os.path.basename(os.path.normpath(a.recall_dir)),
                "catalog": run2b["catalog"], "catalog_sha256": run2b["catalog_sha256"],
                "versions": {"python": platform.python_version(), "numpy": np.__version__,
                             "scipy": scipy.__version__, "sgp4": sgp4.__version__},
                "platform": {"system": platform.platform(), "processor": platform.processor(),
                             "cpu_count": os.cpu_count()}},
    }
    with open(os.path.join(out_dir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, default=str)
    _print(summary, a.report_km)
    print(f"wrote {out_dir}")
    return out_dir


def _write_csv(path: str, rows: List[Dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        if rows:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)


def _print(s: Dict, km: float) -> None:
    A, B = s["A"], s["B"]
    print(f"\nA, ORCA as built: {A['events']} events, {A['seconds']:.1f} s")
    print(f"  claims miss < {km:g} km: {A['claimed_below_report_km']}; of those really < {km:g} km near the "
          f"claimed TCA (SGP4): {A['claimed_below_report_km_and_true']}")
    print(f"  any A event really < {km:g} km near its claimed TCA: {A['true_miss_near_claim_below_report_km']}; "
          f"|claimed - true| miss median {A['claimed_minus_true_miss_km_median']:.3g} km; "
          f"TCA outside window {A['tca_outside_window']}")
    print(f"  tiers {A['tiers']}; Kendall tau(miss, Pc) {A['kendall_tau_miss_vs_pc']}")
    print(f"\nB, corrected: {B['encounters']} encounters < {km:g} km ({B['persistent_pair_encounters']} persistent "
          f"pair), {B['seconds_total']:.1f} s (screen {B['seconds_screen']:.1f}, refine {B['seconds_refine']:.1f})")
    print(f"  found by A within +-{MATCH_S:g} s: {B['found_by_a']} "
          f"(non-persistent: {B['found_by_a_non_persistent']} of {B['encounters'] - B['persistent_pair_encounters']})")
    print(f"  tiers iso {B['tiers_iso']}")
    print(f"  tiers ric {B['tiers_ric']}")
    print(f"  Kendall tau(miss, Pc): iso {B['kendall_tau_miss_vs_pc_iso']:.3f}, ric {B['kendall_tau_miss_vs_pc_ric']:.3f}")


if __name__ == "__main__":
    main()
