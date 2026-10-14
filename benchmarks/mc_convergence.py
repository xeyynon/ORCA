"""
Monte Carlo convergence for Exp 4 of the research brief (figure F5).

Takes the encounters with the largest Foster Pc from an Exp 4 run (pc_comparison.py), rebuilds their
encounter-plane geometry under ORCA's isotropic covariance, and estimates Pc by 2D Monte Carlo at a range
of sample counts, each an independent run with a 95 % Clopper-Pearson interval. Foster is the reference.
Also records the expected relative standard error sqrt((1 - p) / (p N)), which is what sets the sample
count needed for a given Pc (brief Section 1, row 8).

Run from the repo root:  python benchmarks/mc_convergence.py [--pc-dir <Exp 4 results folder>]
Writes benchmarks/results/mc_convergence_<tag>/{convergence.csv, run.json}.
"""
import argparse
import csv
import json
import math
import os
import platform
import sys
import time
from datetime import datetime
from typing import Optional, Sequence

import numpy as np
import scipy
import sgp4
from sgp4.api import jday

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import DATA_DIR, load_snapshot, snapshot_sha256  # noqa: E402
from benchmarks.pc import encounter_plane, pc_foster, pc_monte_carlo  # noqa: E402

RESULTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")


def parse_args(argv: Optional[Sequence[str]] = None):
    ap = argparse.ArgumentParser(description="Monte Carlo convergence against Foster (Exp 4, F5)")
    ap.add_argument("--pc-dir", default=os.path.join(RESULTS, "pc_n2000_h24_ref10s_seed1"))
    ap.add_argument("--recall-dir", default=os.path.join(RESULTS, "screening_recall_n2000_h24_ref10s_seed1"),
                    help="the Exp 2b run the Exp 4 events came from (window start and snapshot)")
    ap.add_argument("--events", type=int, default=3, help="top events by Foster Pc, one per pair")
    ap.add_argument("--samples", type=int, nargs="+",
                    default=[1_000, 10_000, 100_000, 1_000_000, 3_000_000, 10_000_000, 30_000_000, 100_000_000])
    ap.add_argument("--confidence", type=float, default=0.95)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--tag", default="seed1")
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
    with open(os.path.join(a.pc_dir, "events_pc.csv"), encoding="utf-8") as f:
        ranked = sorted(csv.DictReader(f), key=lambda r: -float(r["pc_foster_iso"]))
    events, seen = [], set()
    for r in ranked:  # one encounter per pair, so the curves are independent cases
        pair = tuple(sorted((r["sat1_id"], r["sat2_id"])))
        if pair not in seen:
            seen.add(pair)
            events.append(r)
        if len(events) == a.events:
            break

    rng = np.random.default_rng(a.seed)
    rows = []
    for rank, e in enumerate(events, 1):
        o1, o2 = objs[e["sat1_id"]], objs[e["sat2_id"]]
        tca = datetime.fromisoformat(e["tca_utc"])
        fr = fr0 + (tca - start).total_seconds() / 86400.0
        _, r1, v1 = o1.satrec.sgp4(jd0, fr)
        _, r2, v2 = o2.satrec.sgp4(jd0, fr)
        sigma = float(e["sigma_comb_km"])
        hbr = float(e["hbr_km"])
        m2, c2 = encounter_plane(np.subtract(r2, r1), np.subtract(v2, v1), np.eye(3) * sigma ** 2)
        foster = pc_foster(m2, c2, hbr)
        for n in a.samples:
            tic = time.perf_counter()
            res = pc_monte_carlo(m2, c2, hbr, n, rng=rng, confidence=a.confidence)
            rows.append({
                "rank": rank, "sat1_name": e["sat1_name"], "sat2_name": e["sat2_name"], "tca_utc": e["tca_utc"],
                "miss_km": float(e["miss_km"]), "sigma_comb_km": sigma, "hbr_km": hbr, "pc_foster": foster,
                "samples": n, "hits": res.hits, "pc_mc": res.pc, "ci_low": res.ci_low, "ci_high": res.ci_high,
                "ratio_mc_foster": res.pc / foster, "ci_low_ratio": res.ci_low / foster,
                "ci_high_ratio": res.ci_high / foster, "foster_inside_ci": int(res.ci_low <= foster <= res.ci_high),
                "expected_rel_std_error": math.sqrt((1.0 - foster) / (foster * n)),
                "seconds": time.perf_counter() - tic,
            })
        print(f"#{rank} {e['sat1_name']} / {e['sat2_name']}: Foster Pc {foster:.3e}; "
              + ", ".join(f"N={r['samples']:.0e} -> {r['ratio_mc_foster']:.2f}" for r in rows if r["rank"] == rank))

    out_dir = os.path.join(RESULTS, f"mc_convergence_{a.tag}")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "convergence.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    inside = sum(r["foster_inside_ci"] for r in rows)
    with open(os.path.join(out_dir, "run.json"), "w", encoding="utf-8") as f:
        json.dump({"experiment": "exp4_mc_convergence", "args": vars(a), "pc_dir": os.path.basename(a.pc_dir),
                   "catalog": run2b["catalog"], "catalog_sha256": run2b["catalog_sha256"],
                   "runs": len(rows), "foster_inside_ci": inside, "seconds": time.perf_counter() - t_all,
                   "versions": {"python": platform.python_version(), "numpy": np.__version__,
                                "scipy": scipy.__version__, "sgp4": sgp4.__version__}}, f, indent=2, default=str)
    print(f"Foster inside the {a.confidence:.0%} interval in {inside} of {len(rows)} runs")
    print(f"wrote {out_dir}")
    return out_dir


if __name__ == "__main__":
    main()
