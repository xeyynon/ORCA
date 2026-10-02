"""
Operator authentication for ORCA: one credential, no user table, standard library only.

- The password is stored as a scrypt hash (never in clear) in `auth.json`, which is git-ignored.
  Point ORCA_AUTH_FILE at another path to use a different file.
- A login returns a stateless token: base64url(payload) + "." + HMAC-SHA256 of it. The signing secret
  lives in the same file, so changing the password rotates the secret and invalidates every old token.
- The API is the security boundary; the login screen in the frontend is only the front door.
  With no credential configured the API FAILS CLOSED (see api_server.require_auth).

Tokens are stateless, so "sign out" forgets the token in the browser; it cannot revoke one that was
copied elsewhere before its expiry (TOKEN_TTL_S). Rotating the password does revoke them all.

Set a password:   python auth.py set-password            (prompts, hidden)
                  python auth.py set-password --generate (creates a random one and prints it once)
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import hmac
import json
import math
import os
import secrets
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

TOKEN_TTL_S = 12 * 3600
MIN_PASSWORD_LENGTH = 10
_SCRYPT = {"n": 2 ** 14, "r": 8, "p": 1, "dklen": 64}


def auth_path() -> Path:
    """Resolved on every call so tests (and operators) can change ORCA_AUTH_FILE at runtime."""
    return Path(os.environ.get("ORCA_AUTH_FILE") or Path(__file__).parent / "auth.json")


# ---- credential store --------------------------------------------------------------------------

def _hash(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, **_SCRYPT)


def load_credentials() -> Optional[Dict[str, str]]:
    """The stored credential, or None when unconfigured or the file is unreadable (treated as unconfigured)."""
    try:
        data = json.loads(auth_path().read_text(encoding="utf-8"))
        if all(isinstance(data.get(k), str) and data[k] for k in ("username", "salt", "hash", "secret")):
            return data
    except (OSError, ValueError):
        pass
    return None


def is_configured() -> bool:
    return load_credentials() is not None


def set_credentials(username: str, password: str) -> None:
    """Store a new credential. A fresh secret is generated, which invalidates every previously issued token."""
    username = username.strip()
    if not username:
        raise ValueError("username must not be empty")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")
    salt = secrets.token_bytes(16)
    record = {
        "username": username,
        "salt": salt.hex(),
        "hash": _hash(password, salt).hex(),
        "secret": secrets.token_hex(32),
        "algorithm": "scrypt",
        "params": {k: v for k, v in _SCRYPT.items()},
    }
    path = auth_path()
    path.write_text(json.dumps(record, indent=2), encoding="utf-8")
    try:
        os.chmod(path, 0o600)  # best effort; a no-op on Windows
    except OSError:
        pass


def verify_login(username: str, password: str) -> bool:
    """
    Constant-time check. The scrypt hash is computed even when the username is wrong, so response time
    does not reveal which of the two was incorrect.
    """
    cred = load_credentials()
    if cred is None:
        return False
    candidate = _hash(password, bytes.fromhex(cred["salt"]))
    pw_ok = hmac.compare_digest(candidate, bytes.fromhex(cred["hash"]))
    user_ok = hmac.compare_digest(username.strip().encode("utf-8"), cred["username"].encode("utf-8"))
    return pw_ok and user_ok


# ---- tokens ------------------------------------------------------------------------------------

def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _sign(secret: str, payload_b64: str) -> str:
    return _b64(hmac.new(bytes.fromhex(secret), payload_b64.encode("ascii"), hashlib.sha256).digest())


def issue_token(username: str, now: Optional[float] = None) -> Tuple[str, int]:
    """(token, expiry as unix seconds). Raises if no credential is configured."""
    cred = load_credentials()
    if cred is None:
        raise RuntimeError("authentication is not configured")
    exp = int((time.time() if now is None else now) + TOKEN_TTL_S)
    payload_b64 = _b64(json.dumps({"u": username, "exp": exp}, separators=(",", ":")).encode("utf-8"))
    return f"{payload_b64}.{_sign(cred['secret'], payload_b64)}", exp


def verify_token(token: str, now: Optional[float] = None) -> Optional[str]:
    """The username a valid, unexpired token was issued to, else None. Never raises on malformed input."""
    cred = load_credentials()
    if cred is None or not token or token.count(".") != 1:
        return None
    payload_b64, sig = token.split(".")
    try:
        if not hmac.compare_digest(sig, _sign(cred["secret"], payload_b64)):
            return None
        payload = json.loads(_unb64(payload_b64))
        if int(payload["exp"]) <= (time.time() if now is None else now):
            return None
        user = str(payload["u"])
    except (ValueError, KeyError, TypeError):
        return None
    return user if hmac.compare_digest(user.encode("utf-8"), cred["username"].encode("utf-8")) else None


# ---- brute-force throttle ----------------------------------------------------------------------

class LoginThrottle:
    """
    Blocks a client after `max_failures` FAILED logins inside `window_s`. Successful logins do not spend
    the budget. In memory and per process: enough to stop a guessing loop on one server, not a distributed one.
    Behind a reverse proxy every visitor shares the proxy's address, so key on the forwarded address there.
    """

    def __init__(self, max_failures: int = 10, window_s: int = 15 * 60):
        self.max_failures = max_failures
        self.window_s = window_s
        self._failures: Dict[str, List[float]] = {}

    def _recent(self, key: str, now: float) -> List[float]:
        recent = [t for t in self._failures.get(key, []) if now - t < self.window_s]
        self._failures[key] = recent
        return recent

    def retry_after(self, key: str, now: Optional[float] = None) -> int:
        """Seconds until this client may try again; 0 when it may try now."""
        now = time.time() if now is None else now
        recent = self._recent(key, now)
        if len(recent) < self.max_failures:
            return 0
        return max(1, math.ceil(recent[0] + self.window_s - now))

    def record_failure(self, key: str, now: Optional[float] = None) -> None:
        now = time.time() if now is None else now
        self._recent(key, now).append(now)


# ---- command line ------------------------------------------------------------------------------

def _main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Manage the ORCA operator credential.")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sp = sub.add_parser("set-password", help="create or replace the credential")
    sp.add_argument("--username", default="admin")
    sp.add_argument("--generate", action="store_true", help="generate a random password and print it once")
    sp.add_argument("--password-env", metavar="VAR", help="read the password from this environment variable (non-interactive)")
    sub.add_parser("status", help="say whether a credential is configured")
    args = parser.parse_args(argv)

    if args.cmd == "status":
        cred = load_credentials()
        print(f"{auth_path()}: " + (f"configured for user '{cred['username']}'" if cred else "NOT configured"))
        return 0

    if args.generate:
        password = secrets.token_urlsafe(14)
    elif args.password_env:
        password = os.environ.get(args.password_env, "")
    else:
        password = getpass.getpass("New password: ")
        if password != getpass.getpass("Repeat password: "):
            print("Passwords do not match.", file=sys.stderr)
            return 1
    try:
        set_credentials(args.username, password)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    print(f"Saved credential for '{args.username}' to {auth_path()}. Old sessions are now invalid.")
    if args.generate:
        print(f"Password (shown once, store it somewhere safe): {password}")
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))
