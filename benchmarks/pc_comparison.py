"""
Exp 4 of the research brief: collision probability on real encounters.

Takes the reference encounters of an Exp 2b run (persistent pairs excluded), recomputes both SGP4 states
at each TCA, and evaluates Pc several ways under ORCA's own hard-body radii and uncertainty model:

  legacy      ORCA's production code, called directly: ConjunctionDetector._mahalanobis_distance and
              _collision_probability, tiers from _risk_level
  foster_iso  Foster 2D integration with ORCA's isotropic covariance (sigma = 0.5 km + 2 km/day x TLE age
              per object, summed), projected into the encounter plane
  exact_iso   closed form for the same isotropic case (check on foster_iso)
  foster_aA   Foster 2D with an anisotropic covariance of aspect ratio A: per object sigma_I = sigma*A^(2/3),
              sigma_R = sigma_C = sigma*A^(-1/3), so the error volume equals ORCA's and only its shape changes.
              In-track dominant, as TLE errors are; the values are an assumption until Exp 1 estimates them.
  2D Monte Carlo on the events with the largest Foster Pc, as a numerical check (99.9 % Clopper-Pearson).

All of these share the short-term encounter assumption (straight-line relative motion through the
encounter plane). It does not hold for slow, co-orbital encounters; those are reported in their own band.

Run from the repo root:  python benchmarks/pc_comparison.py [--recall-dir <Exp 2b results folder>]
Writes benchmarks/results/pc_<tag>/{events_pc.csv, tier_confusion.csv, summary.json}.
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
from types import SimpleNamespace
from typing import Dict, List, Optional, Sequence

import numpy as np
import scipy
import sgp4
from scipy.stats import kendalltau
from sgp4.api import jday

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import DATA_DIR, load_snapshot, snapshot_sha256  # noqa: E402
from benchmarks.covariance import MeasuredCovariance  # noqa: E402
from benchmarks.pc import (  # noqa: E402
    encounter_plane,
    pc_foster,
    pc_isotropic_exact,
    pc_monte_carlo,
    ric_covariance,
)
from conjunction_detection import (  # noqa: E402
    ConjunctionDetector,
    CovarianceModel,
    HardBodyRadiusModel,
)

RESULTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
TIERS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NEGLIGIBLE"]
V_BANDS = [(0.0, 0.1), (0.1, 1.0), (1.0, 5.0), (5.0, 10.0), (10.0, math.inf)]
ALPHA_BANDS = [(0.0, 0.25), (0.25, 0.5), (0.5, 1.0), (1.0, 2.0), (2.0, 4.0), (4.0, math.inf)]


def band(v: float, bands) -> str:
    for lo, hi in bands:
        if lo <= v < hi:
            return f"{lo:g}-{hi:g}" if math.isfinite(hi) else f">={lo:g}"
    return "?"


def parse_args(argv: Optional[Sequence[str]] = None):
    ap = argparse.ArgumentParser(description="Exp 4: collision probability on real encounters")
    ap.add_argument("--recall-dir", default=os.path.join(RESULTS, "screening_recall_n2000_h24_ref10s_seed1"))
    ap.add_argument("--aspects", type=float, nargs="+", default=[3.0, 10.0], help="anisotropy ratios A")
    ap.add_argument("--mc-events", type=int, default=50, help="Monte Carlo check on this many top-Pc events")
    ap.add_argument("--mc-samples", type=int, default=2_000_000)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--top-k", type=int, default=100, help="top-k overlap between Pc and miss rankings")
    ap.add_argument("--covariance-model", help="Exp 1 covariance_model.json: adds Foster with the measured "
                                               "radial / in-track / cross-track sigmas (column pc_foster_measured)")
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

    det = ConjunctionDetector()
    measured = MeasuredCovariance(a.covariance_model) if a.covariance_model else None
    rows: List[Dict] = []
    skipped = 0
    for e in events:
        o1, o2 = objs[e["sat1_id"]], objs[e["sat2_id"]]
        tca = datetime.fromisoformat(e["tca_utc"])
        fr = fr0 + (tca - start).total_seconds() / 86400.0
        e1, r1, v1 = o1.satrec.sgp4(jd0, fr)
        e2, r2, v2 = o2.satrec.sgp4(jd0, fr)
        if e1 or e2:
            skipped += 1
            continue
        r1, v1, r2, v2 = map(np.array, (r1, v1, r2, v2))
        r_rel, v_rel = r2 - r1, v2 - v1
        miss = float(np.linalg.norm(r_rel))
        vrel = float(np.linalg.norm(v_rel))

        # ORCA as built (its own functions, its own inputs)
        hbr = HardBodyRadiusModel.estimate(o1.name, o1.norad_id) + HardBodyRadiusModel.estimate(o2.name, o2.norad_id)
        mahal = det._mahalanobis_distance(SimpleNamespace(r=r1), SimpleNamespace(r=r2), tca, o1.epoch, o2.epoch)
        pc_legacy = det._collision_probability(miss, hbr, mahal)

        s1 = CovarianceModel.position_covariance((tca - o1.epoch).total_seconds())
        s2 = CovarianceModel.position_covariance((tca - o2.epoch).total_seconds())
        s_comb = math.sqrt(s1 * s1 + s2 * s2)
        miss2d, cov2d = encounter_plane(r_rel, v_rel, np.eye(3) * s_comb ** 2)
        row = {
            "sat1_id": o1.norad_id, "sat1_name": o1.name, "sat2_id": o2.norad_id, "sat2_name": o2.name,
            "tca_utc": e["tca_utc"], "miss_km": miss, "vrel_kms": vrel, "vrel_band": band(vrel, V_BANDS),
            "hbr_km": hbr, "sigma_comb_km": s_comb, "alpha": miss / s_comb, "alpha_band": band(miss / s_comb, ALPHA_BANDS),
            "pc_legacy": pc_legacy,
            "pc_foster_iso": pc_foster(miss2d, cov2d, hbr),
            "pc_exact_iso": pc_isotropic_exact(float(np.linalg.norm(miss2d)), s_comb, hbr),
        }
        for A in a.aspects:
            def ric(r, v, s):
                return ric_covariance(r, v, s * A ** (-1 / 3), s * A ** (2 / 3), s * A ** (-1 / 3))
            m2, c2 = encounter_plane(r_rel, v_rel, ric(r1, v1, s1) + ric(r2, v2, s2))
            row[f"pc_foster_a{A:g}"] = pc_foster(m2, c2, hbr)
        if measured is not None:
            age1, age2 = ((tca - o.epoch).total_seconds() / 86400.0 for o in (o1, o2))
            m2, c2 = encounter_plane(r_rel, v_rel, measured.cov3(r1, v1, o1.name, age1) + measured.cov3(r2, v2, o2.name, age2))
            row["pc_foster_measured"] = pc_foster(m2, c2, hbr)
        for key in [k for k in row if k.startswith("pc_")]:
            row["tier_" + key[3:]] = det._risk_level(row[key])
        rows.append(row)

    tag = a.tag or (os.path.basename(os.path.normpath(a.recall_dir)).replace("screening_recall_", "")
                    + ("_measured" if measured is not None else ""))
    out_dir = os.path.join(RESULTS, f"pc_{tag}")
    os.makedirs(out_dir, exist_ok=True)
    _write_csv(os.path.join(out_dir, "events_pc.csv"), rows)

    methods = [k[3:] for k in rows[0] if k.startswith("pc_")]
    summary = {"events": len(rows), "skipped_propagation": skipped}

    # Exactness check: Foster vs closed form (isotropic)
    rel = [abs(r["pc_foster_iso"] / r["pc_exact_iso"] - 1) for r in rows if r["pc_exact_iso"] > 1e-15]
    summary["foster_vs_exact_max_rel_diff"] = max(rel) if rel else None

    # Tier counts and legacy-vs-Foster confusion
    summary["tier_counts"] = {m: {t: sum(r["tier_" + m] == t for r in rows) for t in TIERS} for m in methods}
    conf = [[sum(1 for r in rows if r["tier_legacy"] == tl and r["tier_foster_iso"] == tf) for tf in TIERS] for tl in TIERS]
    with open(os.path.join(out_dir, "tier_confusion.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["legacy \\ foster_iso"] + TIERS)
        for tl, line in zip(TIERS, conf):
            w.writerow([tl] + line)
    summary["legacy_vs_foster_iso_tier_agreement"] = sum(conf[i][i] for i in range(5)) / len(rows)

    # Legacy / Foster ratio by alpha
    summary["legacy_over_foster_iso_by_alpha"] = {}
    for lo, hi in ALPHA_BANDS:
        sel = [r for r in rows if lo <= r["alpha"] < hi and r["pc_foster_iso"] > 0 and r["pc_legacy"] > 0]
        if sel:
            lr = np.log10([r["pc_legacy"] / r["pc_foster_iso"] for r in sel])
            summary["legacy_over_foster_iso_by_alpha"][band(lo, ALPHA_BANDS)] = {
                "n": len(sel), "median_ratio": float(10 ** np.median(lr)),
                "min_ratio": float(10 ** lr.min()), "max_ratio": float(10 ** lr.max())}

    # Ranking: miss distance vs Pc (H5)
    miss = np.array([r["miss_km"] for r in rows])
    k = min(a.top_k, len(rows))
    top_miss = set(np.argsort(miss)[:k])
    summary["ranking_vs_miss"] = {}
    for m in methods:
        pc = np.array([r["pc_" + m] for r in rows])
        tau = kendalltau(-miss, pc).statistic
        top_pc = set(np.argsort(-pc, kind="stable")[:k])
        summary["ranking_vs_miss"][m] = {"kendall_tau": float(tau), f"top{k}_overlap": len(top_miss & top_pc) / k}

    # Monte Carlo check on the highest-Pc events
    rng = np.random.default_rng(a.seed)
    top = sorted(range(len(rows)), key=lambda i: -rows[i]["pc_foster_iso"])[: a.mc_events]
    mc_ok, mc_rows = 0, []
    for i in top:
        r = rows[i]
        o1, o2 = objs[r["sat1_id"]], objs[r["sat2_id"]]
        tca = datetime.fromisoformat(r["tca_utc"])
        fr = fr0 + (tca - start).total_seconds() / 86400.0
        _, p1, w1 = o1.satrec.sgp4(jd0, fr)
        _, p2, w2 = o2.satrec.sgp4(jd0, fr)
        m2, c2 = encounter_plane(np.subtract(p2, p1), np.subtract(w2, w1), np.eye(3) * r["sigma_comb_km"] ** 2)
        res = pc_monte_carlo(m2, c2, r["hbr_km"], a.mc_samples, rng=rng, confidence=0.999)
        inside = res.ci_low <= r["pc_foster_iso"] <= res.ci_high
        mc_ok += inside
        mc_rows.append({"sat1_id": r["sat1_id"], "sat2_id": r["sat2_id"], "pc_foster_iso": r["pc_foster_iso"],
                        "pc_mc": res.pc, "ci_low": res.ci_low, "ci_high": res.ci_high, "hits": res.hits,
                        "foster_inside_ci": int(inside)})
    _write_csv(os.path.join(out_dir, "mc_check.csv"), mc_rows)
    summary["mc_check"] = {"events": len(top), "samples": a.mc_samples, "confidence": 0.999,
                           "foster_inside_ci": mc_ok}

    summary["by_vrel_band_events"] = {b: sum(r["vrel_band"] == b for r in rows)
                                      for b in [band(lo, V_BANDS) for lo, _ in V_BANDS]}
    summary["run"] = {
        "args": vars(a), "exp2b_run": os.path.basename(os.path.normpath(a.recall_dir)),
        "catalog": run2b["catalog"], "catalog_sha256": run2b["catalog_sha256"],
        "seconds": time.perf_counter() - t_all,
        "versions": {"python": platform.python_version(), "numpy": np.__version__,
                     "scipy": scipy.__version__, "sgp4": sgp4.__version__},
    }
    with open(os.path.join(out_dir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, default=str)

    _print(summary, conf, methods, k)
    print(f"wrote {out_dir}")
    return out_dir


def _write_csv(path: str, rows: List[Dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        if rows:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)


def _print(s: Dict, conf, methods, k) -> None:
    print(f"{s['events']} encounters; Foster vs closed form max relative difference "
          f"{s['foster_vs_exact_max_rel_diff']:.1e}")
    print("\nTier counts")
    print(f"{'method':<14}" + "".join(f"{t:>12}" for t in TIERS))
    for m in methods:
        print(f"{m:<14}" + "".join(f"{s['tier_counts'][m][t]:>12}" for t in TIERS))
    print(f"\nLegacy (rows) vs Foster isotropic (columns); agreement "
          f"{s['legacy_vs_foster_iso_tier_agreement']:.1%}")
    print(f"{'':<12}" + "".join(f"{t:>12}" for t in TIERS))
    for t, line in zip(TIERS, conf):
        print(f"{t:<12}" + "".join(f"{x:>12}" for x in line))
    print("\nLegacy / Foster ratio by alpha = miss / sigma")
    for b, v in s["legacy_over_foster_iso_by_alpha"].items():
        print(f"  alpha {b:>9}: n={v['n']:<5} median {v['median_ratio']:.3g}  range {v['min_ratio']:.3g}-{v['max_ratio']:.3g}")
    print(f"\nRanking agreement with miss distance (Kendall tau, top-{k} overlap)")
    for m in methods:
        v = s["ranking_vs_miss"][m]
        print(f"  {m:<14} tau {v['kendall_tau']:+.3f}   top-{k} overlap {v[f'top{k}_overlap']:.0%}")
    mc = s["mc_check"]
    print(f"\nMonte Carlo check: Foster inside the {mc['confidence']:.1%} interval for "
          f"{mc['foster_inside_ci']} of {mc['events']} events ({mc['samples']:,} samples each)")


if __name__ == "__main__":
    main()
