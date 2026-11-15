"""CelestrackClient.fetch_group_checked must say WHY a fetch returned nothing (no network used)."""
import sys
import unittest
from pathlib import Path
from unittest import mock

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from parser_pipeline import CelestrackClient  # noqa: E402

ISS = (
    "ISS (ZARYA)\n"
    "1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005\n"
    "2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.49560000 00001\n"
)


def _response(status, text=""):
    r = mock.Mock()
    r.status_code = status
    r.ok = 200 <= status < 400
    r.text = text
    return r


class FetchStatusTests(unittest.TestCase):
    def check(self, response=None, error=None):
        with mock.patch("parser_pipeline.requests.get", return_value=response, side_effect=error):
            return CelestrackClient.fetch_group_checked("stations")

    def test_403_is_rate_limited_not_empty(self):
        result = self.check(_response(403))
        self.assertEqual((result.status, result.http_status, result.tles), ("rate_limited", 403, []))

    def test_429_is_rate_limited(self):
        self.assertEqual(self.check(_response(429)).status, "rate_limited")

    def test_404_is_not_found(self):
        self.assertEqual(self.check(_response(404)).status, "not_found")

    def test_500_is_http_error(self):
        self.assertEqual(self.check(_response(500)).status, "http_error")

    def test_network_failure(self):
        result = self.check(error=requests.ConnectionError("down"))
        self.assertEqual((result.status, result.http_status), ("network_error", None))

    def test_200_with_nothing_parseable_is_empty(self):
        self.assertEqual(self.check(_response(200, "garbage\n")).status, "empty")

    def test_good_response_is_ok(self):
        result = self.check(_response(200, ISS))
        self.assertEqual(result.status, "ok")
        self.assertEqual(len(result.tles), 1)

    def test_fetch_group_still_returns_a_plain_list(self):
        with mock.patch("parser_pipeline.requests.get", return_value=_response(403)):
            self.assertEqual(CelestrackClient.fetch_group("stations"), [])

    def test_full_catalogue_gets_time_to_answer(self):
        # Celestrak takes longer than 10 s to start sending the "active" group; a 10 s read timeout failed every
        # full-catalogue refresh on the hosted VM (2026-11-16). Connect stays short, the read gets two minutes.
        with mock.patch("parser_pipeline.requests.get", return_value=_response(200, ISS)) as get:
            CelestrackClient.fetch_group_checked("active")
        connect, read = get.call_args.kwargs["timeout"]
        self.assertLessEqual(connect, 15)
        self.assertGreaterEqual(read, 60)


if __name__ == "__main__":
    unittest.main()
