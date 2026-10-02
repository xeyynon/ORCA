"""
Tests for operator authentication (auth.py) and the API guard (api_server.require_auth).
Run from the repo root:  python -m unittest discover -s tests -v
Every test uses a throwaway credential file via ORCA_AUTH_FILE, never the real auth.json.
"""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import auth  # noqa: E402

PASSWORD = "correct horse battery"


class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self._old = os.environ.get("ORCA_AUTH_FILE")
        os.environ["ORCA_AUTH_FILE"] = os.path.join(self._tmp.name, "auth.json")

    def tearDown(self):
        if self._old is None:
            os.environ.pop("ORCA_AUTH_FILE", None)
        else:
            os.environ["ORCA_AUTH_FILE"] = self._old
        self._tmp.cleanup()


class CredentialTests(AuthTestCase):
    def test_unconfigured_rejects_everything(self):
        self.assertFalse(auth.is_configured())
        self.assertFalse(auth.verify_login("admin", PASSWORD))
        self.assertIsNone(auth.verify_token("anything.at-all"))
        with self.assertRaises(RuntimeError):
            auth.issue_token("admin")

    def test_login_accepts_only_the_exact_credential(self):
        auth.set_credentials("admin", PASSWORD)
        self.assertTrue(auth.verify_login("admin", PASSWORD))
        self.assertFalse(auth.verify_login("admin", PASSWORD + "x"))
        self.assertFalse(auth.verify_login("root", PASSWORD))
        self.assertFalse(auth.verify_login("", ""))

    def test_the_password_is_never_stored_in_clear(self):
        auth.set_credentials("admin", PASSWORD)
        raw = Path(os.environ["ORCA_AUTH_FILE"]).read_text(encoding="utf-8")
        self.assertNotIn(PASSWORD, raw)
        self.assertEqual(json.loads(raw)["algorithm"], "scrypt")

    def test_weak_input_is_refused(self):
        with self.assertRaises(ValueError):
            auth.set_credentials("admin", "short")
        with self.assertRaises(ValueError):
            auth.set_credentials("   ", PASSWORD)
        self.assertFalse(auth.is_configured())

    def test_a_corrupt_file_counts_as_unconfigured_not_as_open(self):
        Path(os.environ["ORCA_AUTH_FILE"]).write_text("{not json", encoding="utf-8")
        self.assertFalse(auth.is_configured())
        self.assertFalse(auth.verify_login("admin", PASSWORD))


class TokenTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        auth.set_credentials("admin", PASSWORD)

    def test_a_fresh_token_verifies(self):
        token, exp = auth.issue_token("admin")
        self.assertEqual(auth.verify_token(token), "admin")
        self.assertGreater(exp, 0)

    def test_expired_token_is_rejected(self):
        token, exp = auth.issue_token("admin", now=1_000_000)
        self.assertEqual(auth.verify_token(token, now=exp - 1), "admin")
        self.assertIsNone(auth.verify_token(token, now=exp + 1))

    def test_tampering_with_payload_or_signature_is_rejected(self):
        token, _ = auth.issue_token("admin")
        payload, sig = token.split(".")
        forged_payload = auth._b64(json.dumps({"u": "admin", "exp": 9_999_999_999}).encode())
        self.assertIsNone(auth.verify_token(f"{forged_payload}.{sig}"))
        self.assertIsNone(auth.verify_token(f"{payload}.{sig[:-2]}AA"))

    def test_malformed_tokens_never_raise(self):
        for bad in ["", ".", "a.b.c", "!!!.???", "abc", None and "x"]:
            self.assertIsNone(auth.verify_token(bad or ""))

    def test_changing_the_password_invalidates_every_old_token(self):
        token, _ = auth.issue_token("admin")
        auth.set_credentials("admin", PASSWORD + "-new")
        self.assertIsNone(auth.verify_token(token))

    def test_a_token_is_not_valid_for_a_different_username(self):
        token, _ = auth.issue_token("admin")
        # same secret, but the configured user changes: issue by hand-editing is impossible without the secret,
        # so verify the username binding by rewriting only the username in the stored record.
        record = json.loads(Path(os.environ["ORCA_AUTH_FILE"]).read_text(encoding="utf-8"))
        record["username"] = "someone-else"
        Path(os.environ["ORCA_AUTH_FILE"]).write_text(json.dumps(record), encoding="utf-8")
        self.assertIsNone(auth.verify_token(token))


class ThrottleTests(unittest.TestCase):
    def test_blocks_after_the_limit_and_recovers_after_the_window(self):
        t = auth.LoginThrottle(max_failures=3, window_s=100)
        for i in range(3):
            self.assertEqual(t.retry_after("1.2.3.4", now=i), 0)
            t.record_failure("1.2.3.4", now=i)
        self.assertGreater(t.retry_after("1.2.3.4", now=10), 0)
        self.assertEqual(t.retry_after("1.2.3.4", now=1000), 0)  # window expired

    def test_clients_are_independent(self):
        t = auth.LoginThrottle(max_failures=1, window_s=100)
        t.record_failure("a", now=0)
        self.assertGreater(t.retry_after("a", now=1), 0)
        self.assertEqual(t.retry_after("b", now=1), 0)


def fake_request(path, method="GET", authorization=None):
    headers = {"authorization": authorization} if authorization else {}
    return SimpleNamespace(method=method, url=SimpleNamespace(path=path), headers=headers, state=SimpleNamespace())


class GuardTests(AuthTestCase):
    @classmethod
    def setUpClass(cls):
        import api_server  # imported late: it opens the TLE database
        cls.guard = staticmethod(api_server.require_auth)
        cls.HTTPException = api_server.HTTPException

    def status_of(self, request):
        try:
            self.guard(request)
            return 200
        except self.HTTPException as exc:
            return exc.status_code

    def test_fails_closed_when_unconfigured(self):
        self.assertEqual(self.status_of(fake_request("/api/tles")), 503)

    def test_public_paths_stay_open_even_when_unconfigured(self):
        for path in ("/", "/health", "/api/auth/login", "/api/auth/status"):
            self.assertEqual(self.status_of(fake_request(path)), 200, path)

    def test_protected_routes_need_a_valid_bearer_token(self):
        auth.set_credentials("admin", PASSWORD)
        token, _ = auth.issue_token("admin")
        self.assertEqual(self.status_of(fake_request("/api/tles")), 401)
        self.assertEqual(self.status_of(fake_request("/api/tles", authorization="Bearer nonsense")), 401)
        self.assertEqual(self.status_of(fake_request("/api/tles", authorization=f"Basic {token}")), 401)
        req = fake_request("/api/tles", authorization=f"Bearer {token}")
        self.assertEqual(self.status_of(req), 200)
        self.assertEqual(req.state.user, "admin")

    def test_every_data_route_is_protected(self):
        auth.set_credentials("admin", PASSWORD)
        import api_server
        routes = {r.path for r in api_server.app.routes if getattr(r, "path", "").startswith("/api/")}
        data_routes = routes - api_server.PUBLIC_PATHS
        self.assertGreater(len(data_routes), 8)
        for path in data_routes:
            self.assertEqual(self.status_of(fake_request(path.replace("{norad_id}", "1"))), 401, path)


if __name__ == "__main__":
    unittest.main()
