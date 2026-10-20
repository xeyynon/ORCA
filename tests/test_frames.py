"""
Greenwich sidereal time and the ECI -> geographic rotation. The globe and /api/positions place an Earth-fixed
frame with it, so an error here puts every satellite over the wrong geography.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import math
import sys
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
from sgp4.api import jday  # noqa: E402
from sgp4.propagation import gstime  # noqa: E402

from orbit_mech_engine import CoordinateTransform, _gmst, _julian_day  # noqa: E402

DATES = [
    datetime(2000, 1, 1, 12, 0, 0),
    datetime(2026, 10, 20, 0, 0, 0),
    datetime(2026, 10, 20, 12, 0, 0),
    datetime(2026, 10, 20, 18, 30, 0),
    datetime(2026, 10, 27, 6, 0, 0),
    datetime(2031, 3, 5, 23, 59, 59),
]


def _angle_diff(a: float, b: float) -> float:
    return (a - b + math.pi) % (2.0 * math.pi) - math.pi


class GmstTests(unittest.TestCase):
    def test_julian_day_matches_the_sgp4_package(self):
        for dt in DATES:
            jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)
            self.assertAlmostEqual(_julian_day(dt), jd + fr, places=6, msg=str(dt))

    def test_gmst_matches_the_sgp4_package(self):
        # sgp4's gstime is the sidereal angle SGP4's TEME frame is defined with, so the two must agree.
        for dt in DATES:
            jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)
            err = abs(_angle_diff(_gmst(_julian_day(dt)), gstime(jd + fr)))
            self.assertLess(err, 1e-6, f"{dt}: GMST off by {math.degrees(err):.4f} deg")

    def test_the_earth_turns_once_per_sidereal_day(self):
        t0 = datetime(2026, 10, 20, 0, 0, 0)
        t1 = datetime(2026, 10, 21, 0, 0, 0)
        turned = math.degrees((_gmst(_julian_day(t1)) - _gmst(_julian_day(t0))) % (2.0 * math.pi))
        self.assertAlmostEqual(turned, 0.9856, delta=0.001)  # 360.9856 deg per solar day, modulo a full turn

    def test_a_point_on_the_greenwich_meridian_at_noon_utc_has_the_sidereal_longitude(self):
        # Inertial +x at an instant when GMST is theta lies at geographic longitude -theta.
        t = datetime(2026, 10, 20, 12, 0, 0)
        jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second)
        theta = gstime(jd + fr)
        lat, lon, alt = CoordinateTransform.eci_to_geographic(np.array([7000.0, 0.0, 0.0]), t)
        expected = math.degrees(_angle_diff(-theta, 0.0))
        self.assertAlmostEqual(lat, 0.0, places=6)
        self.assertAlmostEqual(_angle_diff(math.radians(lon), math.radians(expected)), 0.0, places=5)


if __name__ == "__main__":
    unittest.main()
