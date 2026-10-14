"""
Freeze a TLE catalog into benchmarks/data/catalog_<timestamp>.tle (+ .json manifest).
Run from the repo root:
  python benchmarks/snapshot_catalog.py [--db ssa_data.db]   from the app's database (no network)
  python benchmarks/snapshot_catalog.py --celestrak active    one Celestrak GET; the database is untouched
Celestrak rate-limits repeated large requests (403); fetch once, do not loop.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import snapshot_from_celestrak, snapshot_from_db  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
ap.add_argument("--db", default="ssa_data.db")
ap.add_argument("--celestrak", metavar="GROUP", help="fetch this Celestrak group instead of reading the database")
args = ap.parse_args()

path = snapshot_from_celestrak(args.celestrak) if args.celestrak else snapshot_from_db(args.db)
with open(path[:-4] + ".json", encoding="utf-8") as f:
    print(json.dumps(json.load(f), indent=2))
print(f"wrote {path}")
