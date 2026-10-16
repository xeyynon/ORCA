"""
Compare ORCA's production Pc (ConjunctionDetector._collision_probability) with the exact isotropic Pc.
Run from the repo root:  python benchmarks/legacy_pc_check.py

With ORCA's isotropic covariance the Mahalanobis distance is miss/sigma, so alpha = miss/sigma and
beta = hbr/sigma below. Writes benchmarks/results/legacy_pc_check.csv.
"""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.pc import pc_isotropic_exact  # noqa: E402
from benchmarks.legacy.conjunction_detection_as_built import ConjunctionDetector  # noqa: E402

SIGMA_KM = 1.0
HBR_KM = 0.01  # 10 m combined, inside ORCA's range (two 5.65 m Starlinks = 11.3 m)
ALPHAS = [0.05, 0.1, 0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0]

det = ConjunctionDetector()
out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
os.makedirs(out_dir, exist_ok=True)
path = os.path.join(out_dir, "legacy_pc_check.csv")

print(f"sigma = {SIGMA_KM} km, combined HBR = {HBR_KM * 1000:.0f} m")
print(" alpha   legacy_pc      exact_pc       legacy/exact")
with open(path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["alpha", "beta", "miss_km", "sigma_km", "hbr_km", "legacy_pc", "exact_pc", "ratio"])
    for a in ALPHAS:
        miss = a * SIGMA_KM
        legacy = det._collision_probability(miss, HBR_KM, a)
        exact = pc_isotropic_exact(miss, SIGMA_KM, HBR_KM)
        ratio = legacy / exact if exact > 0 else float("nan")
        w.writerow([a, HBR_KM / SIGMA_KM, miss, SIGMA_KM, HBR_KM, legacy, exact, ratio])
        print(f"{a:6.2f}  {legacy:12.4e}   {exact:12.4e}   {ratio:10.4g}")
print(f"wrote {path}")
