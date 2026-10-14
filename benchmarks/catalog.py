"""
Frozen TLE catalog snapshots for the benchmarks (brief Section 5: one snapshot for all experiments).

The live database (ssa_data.db) changes whenever someone refreshes it, so experiments read a 3-line TLE
file written once by snapshot_from_db. The .tle files stay out of git (the repo never commits live data);
the .json written next to each one records its sha256, size and epoch range so a run can be traced.
"""
import glob
import hashlib
import json
import os
import sqlite3
import statistics
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional

import numpy as np
from sgp4.api import Satrec

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
_J2000 = datetime(2000, 1, 1, 12, 0, 0)


@dataclass
class CatalogObject:
    norad_id: str
    name: str
    line1: str
    line2: str
    satrec: Satrec
    epoch: datetime  # UTC, naive

    @property
    def apogee_alt_km(self) -> float:
        return self.satrec.alta * self.satrec.radiusearthkm

    @property
    def perigee_alt_km(self) -> float:
        return self.satrec.altp * self.satrec.radiusearthkm


def _jd_to_datetime(jd: float, fr: float) -> datetime:
    return _J2000 + timedelta(days=(jd - 2451545.0) + fr)


def snapshot_from_db(db_path: str = "ssa_data.db", out_dir: str = DATA_DIR) -> str:
    """Write every TLE in the database to catalog_<timestamp>.tle plus a .json manifest. Returns the .tle path."""
    con = sqlite3.connect(db_path)
    try:
        rows = con.execute(
            "SELECT object_name, line1, line2 FROM tle ORDER BY norad_cat_id"
        ).fetchall()
        fetched = con.execute("SELECT MIN(fetched_at), MAX(fetched_at) FROM tle").fetchone()
    finally:
        con.close()

    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    tle_path = os.path.join(out_dir, f"catalog_{stamp}.tle")
    with open(tle_path, "w", encoding="utf-8", newline="\n") as f:
        for name, l1, l2 in rows:
            f.write(f"{(name or '').strip()}\n{l1.strip()}\n{l2.strip()}\n")

    objs = load_snapshot(tle_path)
    epochs = sorted(o.epoch for o in objs)
    manifest = {
        "file": os.path.basename(tle_path),
        "sha256": _sha256(tle_path),
        "created_utc": stamp,
        "source_db": os.path.abspath(db_path),
        "db_fetched_at_min": fetched[0],
        "db_fetched_at_max": fetched[1],
        "records_in_db": len(rows),
        "records_parsed": len(objs),
        "epoch_min": epochs[0].isoformat() if epochs else None,
        "epoch_median": statistics.median_low(epochs).isoformat() if epochs else None,
        "epoch_max": epochs[-1].isoformat() if epochs else None,
    }
    with open(tle_path[:-4] + ".json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    return tle_path


def latest_snapshot(data_dir: str = DATA_DIR) -> Optional[str]:
    files = sorted(glob.glob(os.path.join(data_dir, "catalog_*.tle")))
    return files[-1] if files else None


def load_snapshot(path: str) -> List[CatalogObject]:
    """Parse a 3-line TLE file. Records sgp4 cannot parse are skipped."""
    with open(path, encoding="utf-8") as f:
        lines = [ln.rstrip("\n") for ln in f if ln.strip()]
    out: List[CatalogObject] = []
    for k in range(0, len(lines) - 2, 3):
        name, l1, l2 = lines[k].strip(), lines[k + 1], lines[k + 2]
        if not (l1.startswith("1 ") and l2.startswith("2 ")):
            continue
        try:
            sat = Satrec.twoline2rv(l1, l2)
        except Exception:
            continue
        out.append(CatalogObject(l2[2:7].strip(), name, l1, l2, sat,
                                 _jd_to_datetime(sat.jdsatepoch, sat.jdsatepochF)))
    return out


def snapshot_sha256(path: str) -> str:
    return _sha256(path)


def leo_only(objs: List[CatalogObject], max_apogee_alt_km: float = 2000.0) -> List[CatalogObject]:
    return [o for o in objs if o.apogee_alt_km <= max_apogee_alt_km]


def fresh_only(objs: List[CatalogObject], at: datetime, max_age_days: float) -> List[CatalogObject]:
    """Drop TLEs older than max_age_days at time `at` (decayed objects linger in the database)."""
    return [o for o in objs if abs((at - o.epoch).total_seconds()) <= max_age_days * 86400.0]


def subset(objs: List[CatalogObject], n: Optional[int], seed: int) -> List[CatalogObject]:
    if n is None or n >= len(objs):
        return list(objs)
    idx = np.random.default_rng(seed).choice(len(objs), size=n, replace=False)
    return [objs[i] for i in sorted(idx)]


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()
