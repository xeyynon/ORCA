"""
Reads KEY=VALUE lines from the git-ignored .env file next to this module into os.environ, at server start.

Standard library only, so it adds no dependency. Rules, kept small on purpose:
- blank lines and lines starting with # are skipped; `export KEY=VALUE` is accepted;
- one pair of matching surrounding quotes is removed from a value;
- a variable already set in the real environment wins (the file never overrides the operator);
- an empty value is skipped, so a blank `GROQ_API_KEY=` placeholder leaves the feature off.
Values are never printed or logged.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, Optional

DEFAULT_PATH = Path(__file__).resolve().parent / ".env"


def parse(text: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        if key and value:
            out[key] = value
    return out


def load(path: Optional[Path] = None) -> int:
    """Load the file if it exists. Returns how many variables were set (not their names or values)."""
    p = Path(os.environ.get("ORCA_ENV_FILE") or path or DEFAULT_PATH)
    try:
        text = p.read_text(encoding="utf-8")
    except OSError:
        return 0
    count = 0
    for key, value in parse(text).items():
        if key not in os.environ:
            os.environ[key] = value
            count += 1
    return count
