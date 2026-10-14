"""
Exp 1 of the research brief: propagation fidelity against an independent reference.

Reference R2 (TLE-to-TLE consistency): for every object present in two snapshots with a later TLE in the
second, propagate the OLD TLE to the NEW TLE's epoch and compare with SGP4 of the NEW TLE at its own
epoch (where a TLE fits its tracking data best). The horizon is the gap between the two epochs.
This is a standard proxy, not truth: the new TLE has its own error, and manoeuvres between the epochs
show up as propagation error (Starlink satellites manoeuvre often, so they are reported separately).

Reference R1 (model consistency): the same old TLE propagated by SGP4, i.e. how far the simpler models
drift from the model the TLE was fitted for. Repeats tests/measure_propagator_error.py at more horizons.

Methods: orca_engine, j2_secular, sgp4 (benchmarks/propagators.py). Errors are split into radial,
in-track and cross-track (RIC) of the reference state. Robust spread = 1.4826 x MAD of the signed
component, which is what a covariance model needs; bias = median of the signed component.
The SGP4 R2 spreads per horizon bin are fitted with sigma(h) = s0 + s1 * h per RIC axis (LEO, by group)
and written to covariance_model.json, to replace ORCA's assumed sigma = 0.5 km + 2 km/day.

Run from the repo root:  python benchmarks/propagation_accuracy.py --old <snapshot.tle> --new <snapshot.tle>
Writes benchmarks/results/propagation_<tag>/{errors.csv, summary.csv, covariance_model.json, run.json}.
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
from datetime import timedelta
from typing import Dict, List, Optional, Sequence

import numpy as np
import scipy
import sgp4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import DATA_DIR, load_snapshot, snapshot_sha256  # noqa: E402
from benchmarks.propagators import J2Secular, OrcaEngine, ric_components, sgp4_state  # noqa: E402

RESULTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
BINS_D = [(0.0, 0.5), (0.5, 1.0), (1.0, 2.0), (2.0, 3.0), (3.0, 5.0), (5.0, 7.0), (7.0, 14.0)]
METHODS = ("orca_engine", "j2_secular", "sgp4")


def regime(obj) -> str:
    ap, pe = obj.apogee_alt_km, obj.perigee_alt_km
    if ap <= 2000.0:
        return "LEO"
    if 34000.0 <= pe and ap <= 37600.0:
        return "GEO"
    if pe >= 2000.0 and ap < 34000.0:
        return "MEO"
    return "HEO/other"


def group(obj) -> str:
    return "starlink" if "STARLINK" in obj.name.upper() else "other"


def bin_label(h: float) -> Optional[str]:
    for lo, hi in BINS_D:
        if lo <= h < hi:
            return f"{lo:g}-{hi:g}d"
    return None


def robust_sigma(x: np.ndarray) -> float:
    return float(1.4826 * np.median(np.abs(x - np.median(x)))) if len(x) else float("nan")


def parse_args(argv: Optional[Sequence[str]] = None):
    ap = argparse.ArgumentParser(description="Exp 1: propagation fidelity (TLE-to-TLE and model consistency)")
    ap.add_argument("--old", default=os.path.join(DATA_DIR, "catalog_20261014T064759Z.tle"))
    ap.add_argument("--new", default=os.path.join(DATA_DIR, "catalog_20261014T090520Z.tle"))
    ap.add_argument("--min-gap-h", type=float, default=1.0, help="ignore pairs whose epochs differ by less")
    ap.add_argument("--timing-objects", type=int, default=2000, help="objects used for per-state timing")
    ap.add_argument("--fit-min-n", type=int, default=100, help="horizon bins need this many objects to be fitted")
    ap.add_argument("--r1-hours", type=float, nargs="+", default=[0, 1, 6, 24, 72, 168],
                    help="R1 horizons from each TLE's own epoch")
    ap.add_argument("--tag")
    return ap.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> str:
    a = parse_args(argv)
    t_all = time.perf_counter()
    old = {o.norad_id: o for o in load_snapshot(a.old)}
    new = {o.norad_id: o for o in load_snapshot(a.new)}
    common = sorted(set(old) & set(new))

    rows: List[Dict] = []
    counts = defaultdict(int)
    for nid in common:
        o_old, o_new = old[nid], new[nid]
        gap_d = (o_new.epoch - o_old.epoch).total_seconds() / 86400.0
        if gap_d * 24.0 < a.min_gap_h:
            counts["not_later" if gap_d <= 0 else "gap_below_min"] += 1
            continue
        b = bin_label(gap_d)
        if b is None:
            counts["gap_above_14d"] += 1
            continue
        t = o_new.epoch
        try:
            r_ref, v_ref = sgp4_state(o_new, t)
            pred = {"sgp4": sgp4_state(o_old, t)[0],
                    "j2_secular": J2Secular(o_old).state(t)[0],
                    "orca_engine": OrcaEngine(o_old).state(t)[0]}
        except (ValueError, ZeroDivisionError, OverflowError):
            counts["propagation_failed"] += 1
            continue
        row = {"norad_id": nid, "name": o_new.name, "regime": regime(o_new), "group": group(o_new),
               "horizon_days": gap_d, "bin": b}
        for m, r in pred.items():
            dR, dI, dC = ric_components(r - r_ref, r_ref, v_ref)
            row.update({f"{m}_err_km": float(np.linalg.norm(r - r_ref)),
                        f"{m}_R_km": dR, f"{m}_I_km": dI, f"{m}_C_km": dC})
        for m in ("j2_secular", "orca_engine"):  # R1: drift from SGP4 of the same TLE
            row[f"{m}_vs_sgp4_km"] = float(np.linalg.norm(pred[m] - pred["sgp4"]))
        rows.append(row)
        counts["used"] += 1

    tag = a.tag or (os.path.basename(a.old)[8:-4] + "_to_" + os.path.basename(a.new)[8:-4])
    out_dir = os.path.join(RESULTS, f"propagation_{tag}")
    os.makedirs(out_dir, exist_ok=True)
    _write_csv(os.path.join(out_dir, "errors.csv"), rows)

    # Summary per regime x group x bin x method
    summary = []
    keys = sorted({(r["regime"], r["group"]) for r in rows}) + [(rg, "all") for rg in sorted({r["regime"] for r in rows})]
    for rg, gp in keys:
        for lo, hi in BINS_D:
            b = f"{lo:g}-{hi:g}d"
            sel = [r for r in rows if r["regime"] == rg and r["bin"] == b and (gp == "all" or r["group"] == gp)]
            if len(sel) < 5:
                continue
            h_med = float(np.median([r["horizon_days"] for r in sel]))
            for m in METHODS:
                err = np.array([r[f"{m}_err_km"] for r in sel])
                comp = {c: np.array([r[f"{m}_{c}_km"] for r in sel]) for c in "RIC"}
                entry = {"regime": rg, "group": gp, "bin": b, "horizon_days_median": h_med, "n": len(sel),
                         "method": m, "err_km_median": float(np.median(err)),
                         "err_km_p90": float(np.percentile(err, 90))}
                for c in "RIC":
                    entry[f"{c}_bias_km"] = float(np.median(comp[c]))
                    entry[f"{c}_sigma_km"] = robust_sigma(comp[c])
                if m != "sgp4":
                    entry["vs_sgp4_km_median"] = float(np.median([r[f"{m}_vs_sgp4_km"] for r in sel]))
                summary.append(entry)
    _write_csv(os.path.join(out_dir, "summary.csv"), summary)

    # Covariance model from SGP4 R2 spreads (LEO), sigma = s0 + s1 * h, weighted by bin size
    cov_model = {"form": "sigma_km = s0_km + s1_km_per_day * horizon_days, per RIC axis, robust spread of "
                         "SGP4 TLE-to-TLE errors; fitted on LEO horizon bins with n >= 5",
                 "orca_assumed": {"R": [0.5, 2.0], "I": [0.5, 2.0], "C": [0.5, 2.0]}}
    for gp in ("all", "starlink", "other"):
        pts = [s for s in summary if s["regime"] == "LEO" and s["group"] == gp and s["method"] == "sgp4"]
        well = [p for p in pts if p["n"] >= a.fit_min_n]
        if len(well) < 3:
            cov_model[f"LEO_{gp}"] = {"fit": None, "reason": f"fewer than 3 horizon bins with n >= {a.fit_min_n}; "
                                      "take more snapshots over several days",
                                      "bins": [{k: p[k] for k in ("bin", "horizon_days_median", "n", "R_sigma_km",
                                                                  "I_sigma_km", "C_sigma_km")} for p in pts]}
            continue
        pts = well
        h = np.array([p["horizon_days_median"] for p in pts])
        w = np.sqrt([p["n"] for p in pts])
        fit = {}
        for c in "RIC":
            s = np.array([p[f"{c}_sigma_km"] for p in pts])
            s1, s0 = np.polyfit(h, s, 1, w=w)
            fit[c] = [float(s0), float(s1)]
        cov_model[f"LEO_{gp}"] = {"fit": fit, "bins": [{k: p[k] for k in ("bin", "horizon_days_median", "n",
                                                                          "R_sigma_km", "I_sigma_km", "C_sigma_km")}
                                                       for p in pts]}
    with open(os.path.join(out_dir, "covariance_model.json"), "w", encoding="utf-8") as f:
        json.dump(cov_model, f, indent=2)

    # R1: drift of the simpler models from SGP4 of the same (old) TLE, at fixed horizons from its epoch
    r1 = defaultdict(lambda: defaultdict(list))
    for o in old.values():
        if regime(o) != "LEO":
            continue
        try:
            j2, orca = J2Secular(o), OrcaEngine(o)
            for hh in a.r1_hours:
                t = o.epoch + timedelta(hours=hh)
                r_s, v_s = sgp4_state(o, t)
                for m, prop in (("j2_secular", j2), ("orca_engine", orca)):
                    dr = prop.state(t)[0] - r_s
                    r1[m][hh].append((float(np.linalg.norm(dr)),) + ric_components(dr, r_s, v_s))
        except (ValueError, ZeroDivisionError, OverflowError):
            continue
    r1_rows = []
    for m in ("orca_engine", "j2_secular"):
        for hh in a.r1_hours:
            arr = np.array(r1[m][hh])
            if len(arr) == 0:
                continue
            r1_rows.append({"method": m, "hours": hh, "n": len(arr),
                            "vs_sgp4_km_median": float(np.median(arr[:, 0])),
                            "vs_sgp4_km_p90": float(np.percentile(arr[:, 0], 90)),
                            "R_abs_km_median": float(np.median(np.abs(arr[:, 1]))),
                            "I_abs_km_median": float(np.median(np.abs(arr[:, 2]))),
                            "C_abs_km_median": float(np.median(np.abs(arr[:, 3])))})
    _write_csv(os.path.join(out_dir, "r1_model_consistency.csv"), r1_rows)

    # Per-state cost, scalar calls for every method (same implementation level for the call loop)
    timing_objs = [old[r["norad_id"]] for r in rows[: a.timing_objects]]
    timing = {}
    for m in METHODS:
        tic = time.perf_counter()
        for o in timing_objs:
            t = new[o.norad_id].epoch
            if m == "sgp4":
                sgp4_state(o, t)
            elif m == "j2_secular":
                J2Secular(o).state(t)
            else:
                OrcaEngine(o).state(t)
        timing[m] = (time.perf_counter() - tic) / max(len(timing_objs), 1) * 1e6

    run = {"experiment": "exp1_propagation", "args": vars(a),
           "old": os.path.basename(a.old), "old_sha256": snapshot_sha256(a.old),
           "new": os.path.basename(a.new), "new_sha256": snapshot_sha256(a.new),
           "objects_in_both": len(common), "counts": dict(counts),
           "microseconds_per_state_incl_setup": timing,
           "seconds": time.perf_counter() - t_all,
           "versions": {"python": platform.python_version(), "numpy": np.__version__,
                        "scipy": scipy.__version__, "sgp4": sgp4.__version__},
           "platform": {"system": platform.platform(), "processor": platform.processor(),
                        "cpu_count": os.cpu_count()}}
    with open(os.path.join(out_dir, "run.json"), "w", encoding="utf-8") as f:
        json.dump(run, f, indent=2, default=str)

    _print(summary, cov_model, run, r1_rows)
    print(f"wrote {out_dir}")
    return out_dir


def _write_csv(path: str, rows: List[Dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        if rows:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)


def _print(summary, cov_model, run, r1_rows) -> None:
    print(f"objects in both snapshots {run['objects_in_both']}; {dict(run['counts'])}")
    for gp in ("all", "starlink", "other"):
        sel = [s for s in summary if s["regime"] == "LEO" and s["group"] == gp]
        if not sel:
            continue
        print(f"\nLEO, {gp}: median position error vs the newer TLE (km), [R / I / C robust sigma for sgp4]")
        print(f"{'bin':>8} {'n':>6} {'orca_engine':>12} {'j2_secular':>11} {'sgp4':>9}   {'sgp4 sigma R/I/C':>22}")
        for lo, hi in BINS_D:
            b = f"{lo:g}-{hi:g}d"
            by_m = {s["method"]: s for s in sel if s["bin"] == b}
            if not by_m:
                continue
            g = by_m["sgp4"]
            print(f"{b:>8} {g['n']:>6} {by_m['orca_engine']['err_km_median']:>12.3g} "
                  f"{by_m['j2_secular']['err_km_median']:>11.3g} {g['err_km_median']:>9.3g}   "
                  f"{g['R_sigma_km']:>6.3g} /{g['I_sigma_km']:>6.3g} /{g['C_sigma_km']:>6.3g}")
    for k, v in cov_model.items():
        if k.startswith("LEO_"):
            fit = v["fit"]
            if fit is None:
                print(f"{k}: no fit ({v['reason']})")
            else:
                print(f"{k}: sigma(h) km = " + ", ".join(f"{c} {fit[c][0]:.3g} + {fit[c][1]:.3g} h" for c in "RIC"))
    print("\nR1, LEO: drift from SGP4 of the same TLE (km, median / p90; median |R| |I| |C|)")
    for r in r1_rows:
        print(f"  {r['method']:<12} {r['hours']:>5g} h  n={r['n']:<6} {r['vs_sgp4_km_median']:>9.3g} / "
              f"{r['vs_sgp4_km_p90']:<9.3g} R {r['R_abs_km_median']:.3g}  I {r['I_abs_km_median']:.3g}  "
              f"C {r['C_abs_km_median']:.3g}")
    print("per-state cost (us, incl. setup): " + ", ".join(f"{m} {v:.0f}" for m, v in
                                                          run["microseconds_per_state_incl_setup"].items()))


if __name__ == "__main__":
    main()
