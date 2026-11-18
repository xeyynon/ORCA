"""
Tests for object-type and regime classification (Analytics.py) and the conjunction event's relative velocity.
The regime cases are the SAME ones as frontend/src/lib/lib.test.ts, so the Python and TypeScript mirrors cannot drift.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import os
import sys
import unittest
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from Analytics import classify_object_type, classify_regime  # noqa: E402
from conjunction_detection import ConjunctionEvent  # noqa: E402


class ObjectTypeTests(unittest.TestCase):
    def test_debris_rocket_bodies_and_payloads_by_name(self):
        self.assertEqual(classify_object_type("COSMOS 2251 DEB"), "debris")
        self.assertEqual(classify_object_type("FENGYUN 1C DEB"), "debris")
        self.assertEqual(classify_object_type("SL-8 R/B"), "rocket_body")
        self.assertEqual(classify_object_type("ATLAS 5 CENTAUR R/B"), "rocket_body")
        self.assertEqual(classify_object_type("STARLINK-32032"), "payload")
        self.assertEqual(classify_object_type("ISS (ZARYA)"), "payload")

    def test_a_name_that_merely_contains_deb_letters_is_not_debris(self):
        self.assertEqual(classify_object_type("DEBUT-1"), "payload")
        self.assertEqual(classify_object_type("REBEL SAT"), "payload")

    def test_case_does_not_matter(self):
        self.assertEqual(classify_object_type("cosmos 1408 deb"), "debris")


class RegimeTests(unittest.TestCase):
    def test_cases_shared_with_the_typescript_tests(self):
        self.assertEqual(classify_regime(15.49484232, 0.0007536), "LEO")   # ISS
        self.assertEqual(classify_regime(1.0027, 0.0002), "GEO")
        self.assertEqual(classify_regime(2.0, 0.001), "MEO")
        self.assertEqual(classify_regime(2.0, 0.7), "HEO")

    def test_geo_by_mean_altitude_and_nothing_above_geo_is_meo(self):
        # Same cases as frontend/src/lib/lib.test.ts (audit 2026-11-18 #10).
        self.assertEqual(classify_regime(1.0027, 0.0205), "GEO")    # at GEO height, a little stretched (MUOS-5): was MEO
        self.assertEqual(classify_regime(0.972253, 0.0001), "HEO")  # circular at 36,670 km, above GEO
        self.assertEqual(classify_regime(1.031713, 0.001), "MEO")   # circular at 35,000 km, just below GEO height
        self.assertEqual(classify_regime(1.0027, 0.15), "HEO")      # GEO height but too stretched to call GEO

    def test_non_physical_mean_motion_is_unclassified_not_a_guess(self):
        self.assertIsNone(classify_regime(0, 0.001))
        self.assertIsNone(classify_regime(float("nan"), 0.001))
        self.assertIsNone(classify_regime(-3.0, 0.001))


class EventTests(unittest.TestCase):
    def test_to_dict_carries_relative_velocity(self):
        e = ConjunctionEvent(
            sat1_id="1", sat1_name="A", sat2_id="2", sat2_name="B", tca=datetime(2026, 10, 3, 16, 42, 17),
            min_distance=4.82, mahalanobis_distance=1.0, probability_of_collision=2.3e-5, risk_level="HIGH",
            sat1_hbr=0.003, sat2_hbr=0.003, combined_hbr=0.006, relative_velocity_kms=12.4,
        )
        self.assertEqual(e.to_dict()["relative_velocity_kms"], 12.4)


if __name__ == "__main__":
    unittest.main()
