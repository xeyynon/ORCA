"""
Checks for the pure parts of benchmarks/screening_recall.py: grid local minima and screen evaluation.
Run from the repo root:  python -m unittest discover -s tests -v
"""
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from benchmarks.screening_recall import evaluate_screen, grid_local_minima  # noqa: E402


def rows(samples):
    """samples: list of (i, j, k, d) -> arrays"""
    a = np.array(samples, dtype=float)
    return a[:, 0].astype(np.int32), a[:, 1].astype(np.int32), a[:, 2].astype(np.int32), a[:, 3]


class LocalMinima(unittest.TestCase):
    def test_single_dip(self):
        I, J, K, D = rows([(0, 1, 3, 50.0), (0, 1, 4, 20.0), (0, 1, 5, 30.0)])
        m, _ = grid_local_minima(I, J, K, D, n=3, nt=10)
        self.assertEqual(list(m["k"]), [4])
        self.assertFalse(m["edge"][0])
        self.assertFalse(m["persistent"][0])

    def test_gap_splits_runs(self):
        # Two separate passes of the same pair: k=2 alone, then a dip at k=7.
        I, J, K, D = rows([(0, 1, 2, 40.0), (0, 1, 6, 30.0), (0, 1, 7, 10.0), (0, 1, 8, 35.0)])
        m, _ = grid_local_minima(I, J, K, D, n=2, nt=20)
        self.assertEqual(sorted(m["k"].tolist()), [2, 7])

    def test_plateau_counts_once_and_pairs_separate(self):
        I, J, K, D = rows([(0, 1, 1, 5.0), (0, 1, 2, 5.0), (0, 1, 3, 9.0),
                           (1, 2, 1, 9.0), (1, 2, 2, 4.0)])
        m, _ = grid_local_minima(I, J, K, D, n=3, nt=10)
        got = sorted(zip(m["i"].tolist(), m["k"].tolist()))
        self.assertEqual(got, [(0, 1), (1, 2)])

    def test_edge_and_persistent(self):
        I, J, K, D = rows([(0, 1, k, 3.0 + abs(k - 1)) for k in range(4)])  # present at every step
        m, _ = grid_local_minima(I, J, K, D, n=2, nt=4)
        self.assertEqual(list(m["k"]), [1])
        self.assertTrue(m["persistent"][0])
        I, J, K, D = rows([(0, 1, 0, 1.0), (0, 1, 1, 2.0)])
        m, _ = grid_local_minima(I, J, K, D, n=2, nt=4)
        self.assertTrue(m["edge"][0])


class Screens(unittest.TestCase):
    def setUp(self):
        # Pair (0,1): two passes, k=7 (d=20) and k=30..32 (dip to 15 at k=31).
        # Pair (1,2): one long pass k=0..9 at d=80.
        samples = ([(0, 1, 7, 20.0), (0, 1, 30, 40.0), (0, 1, 31, 15.0), (0, 1, 32, 40.0)]
                   + [(1, 2, k, 80.0) for k in range(10)])
        mins, self.rows = grid_local_minima(*rows(samples), n=3, nt=40)
        by_k = {(int(i), int(k)): (int(key), int(run)) for i, k, key, run
                in zip(mins["i"], mins["k"], mins["key"], mins["run"])}
        events = [by_k[(0, 7)], by_k[(0, 31)], by_k[(1, 0)]]
        self.ev_key = np.array([e[0] for e in events])
        self.ev_run = np.array([e[1] for e in events])

    def screen(self, step, radius):
        return evaluate_screen(self.rows, 10.0, step, radius, self.ev_key, self.ev_run)

    def test_fine_screen_finds_all(self):
        ev, pair, n_cand, n_flag = self.screen(10.0, 100.0)
        self.assertEqual(ev.tolist(), [True, True, True])
        self.assertEqual(n_cand, 2)
        self.assertEqual(n_flag, 14)

    def test_other_pass_does_not_count(self):
        # Step 50 s samples k = 0, 5, 10, ..., 30: pass k=30..32 is seen, the k=7 pass is not,
        # even though the same pair is flagged (pair recall stays true).
        ev, pair, n_cand, _ = self.screen(50.0, 100.0)
        self.assertEqual(ev.tolist(), [False, True, True])
        self.assertEqual(pair.tolist(), [True, True, True])
        self.assertEqual(n_cand, 2)

    def test_radius_cut(self):
        ev, _, _, _ = self.screen(10.0, 50.0)
        self.assertEqual(ev.tolist(), [True, True, False])

    def test_runs_are_separate(self):
        self.assertEqual(len(set(self.ev_run.tolist())), 3)

    def test_step_must_be_multiple(self):
        with self.assertRaises(ValueError):
            self.screen(15.0, 100.0)


if __name__ == "__main__":
    unittest.main()
