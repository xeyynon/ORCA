"""
Measure ORCA's engine propagator (orbit_mech_engine.SGP4Propagator) against the sgp4 package on real TLEs.
Run from the repo root:  PYTHONIOENCODING=utf-8 python tests/measure_propagator_error.py
Not a unit test (the name does not start with test_), so `unittest discover` skips it.
Reads ssa_data.db; prints position error in km at several hours after the TLE epoch.
"""
import sys, random, statistics as st
from datetime import timedelta
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
import numpy as np
from sgp4.api import Satrec, jday
from parser_pipeline import TLEDatabase
from orbit_mech_engine import SGP4Propagator

db = TLEDatabase()
tles = db.get_all_tles()
random.seed(1)
sample = random.sample(tles, 600)
hours = [0, 1, 6, 24, 72, 168]
errs = {h: [] for h in hours}
along = {h: [] for h in hours}
bad = 0
for tle in sample:
    try:
        oe = tle.to_orbital_element()
        prop = SGP4Propagator(oe)
        sat = Satrec.twoline2rv(tle.line1, tle.line2)
    except Exception:
        bad += 1; continue
    for h in hours:
        t = oe.epoch + timedelta(hours=h)
        jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)
        e, r, v = sat.sgp4(jd, fr)
        if e != 0: continue
        s = prop.propagate(t)
        errs[h].append(float(np.linalg.norm(np.array(r) - s.r)))
print(f"sampled {len(sample)}, skipped {bad}, catalog {len(tles)}")
print("hours  n    median_km   p90_km     max_km")
for h in hours:
    a = np.array(errs[h])
    print(f"{h:5d} {len(a):4d} {np.median(a):10.1f} {np.percentile(a,90):10.1f} {a.max():12.1f}")
