"""
Freeze the current TLE database into benchmarks/data/catalog_<timestamp>.tle (+ .json manifest).
Run from the repo root:  python benchmarks/snapshot_catalog.py [--db ssa_data.db]
Does not contact Celestrak; refresh the database first through the app if a newer catalog is wanted.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.catalog import snapshot_from_db  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
ap.add_argument("--db", default="ssa_data.db")
args = ap.parse_args()

path = snapshot_from_db(args.db)
with open(path[:-4] + ".json", encoding="utf-8") as f:
    print(json.dumps(json.load(f), indent=2))
print(f"wrote {path}")
