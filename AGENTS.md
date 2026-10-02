# AGENTS.md

Instructions for AI coding agents (and humans skimming for the fast path)
working in this repository. See [ARCHITECTURE.md](ARCHITECTURE.md) for system
design and [README.md](README.md) for module-level API detail.

## Project

ORCA — a Python SSA (space situational awareness) platform: TLE ingestion →
SGP4 orbit propagation → conjunction (collision-risk) detection → FastAPI REST
API + Streamlit dashboard. Single SQLite file (`ssa_data.db`) is the only
persistence layer, shared by both front ends.

## Setup

```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

## Running

**Always set `PYTHONIOENCODING=utf-8` when launching either process on
Windows** — the parser prints a Unicode `✓` per parsed TLE, which crashes on
Windows' default `cp1252` stdout encoding (see DECISIONS.md). This is not
optional; ingestion silently truncates without it.

```bash
# API — http://127.0.0.1:8000, docs at /docs
PYTHONIOENCODING=utf-8 uvicorn api_server:app --port 8000

# Dashboard — http://127.0.0.1:8501
PYTHONIOENCODING=utf-8 streamlit run dashboard.py --server.port 8501
```

Populate the database after first launch:

```bash
curl -X POST http://127.0.0.1:8000/api/update-tles
```

This fetches Celestrak's `active` group (~9-11k objects, ~2.7MB) as a
background task — poll `GET /api/statistics` to see when the count updates.
Celestrak will 403 this endpoint if hit repeatedly in a short window; the
smaller `stations` group (`GROUP=stations`) is a reliable fallback for
smoke-testing without tripping that limit. See DECISIONS.md before changing
the hardcoded group name in `parser_pipeline.py` / `api_server.py`.

## Verifying a change actually works

Do not consider a change to this repo "done" from a passing import or a
type-check alone — actually launch the affected process and hit it:

- **API change** → launch uvicorn, `curl` the affected endpoint, read the
  JSON body.
- **Dashboard change** → launch Streamlit, check `curl -s
  http://127.0.0.1:8501/_stcore/health` returns `ok`, and read
  `/tmp/dashboard.log`-equivalent output for tracebacks — Streamlit failures
  happen per-page at render time and won't show up as a nonzero exit code.
- **Orbit mechanics / conjunction change** → run against real seeded data
  (`stations` group is enough) and sanity-check output units against the
  Units Contract in ARCHITECTURE.md §7, not just "it didn't throw."

## Code conventions (as established in this repo)

- `orbit_mech_engine.py` is the foundation layer: **it must never import
  another project module.** If you find yourself importing `parser_pipeline`
  or `Analytics` there, the change belongs in a different file.
- Prefer editing existing modules over adding new top-level files — the
  module boundaries (parse → propagate → detect → visualize → serve) are
  deliberate and documented in README.md; new functionality almost always
  belongs inside one of the existing six.
- Paths: never hardcode an absolute filesystem path (a prior hardcoded
  developer path in `dashboard.py` broke the app on every other machine — see
  DECISIONS.md). Use `Path(__file__).parent / "..."` or an existing constant
  like `DB_PATH`.
- `ConjunctionSearch`'s pairwise worker (`_assess_pair_worker`) must stay a
  top-level, picklable function — `ProcessPoolExecutor` requires it.
- Keep units exactly as documented in ARCHITECTURE.md §7 (`OrbitalElement.n`
  in rad/s, `OrbitalElement.i` in radians, `TLE.inclination` in degrees).
  Silent unit mismatches between `TLE` and `OrbitalElement` have been a real
  bug source — when touching either, double check which one you're in.

## Before committing

- Don't commit changes to `ssa_data.db` (it's a rebuildable Celestrak cache,
  not source data) — check `.gitignore` covers it, and if not, that's a bug
  to fix, not a file to add.
- Don't reintroduce a hardcoded absolute path or a non-ASCII `print()` on a
  hot ingestion path (both have caused full-stack failures before — see
  DECISIONS.md).
- Commits carry **only the repository owner's identity**. No `Co-Authored-By:`
  trailer for Claude or any AI tool, and no "Generated with …" lines in commit
  messages or PR descriptions, whatever a tool's default suggests. See
  [rules.md](rules.md) §9.

## Where to look

| Question | File |
|---|---|
| "What does module X do, method by method?" | [README.md](README.md) |
| "How do the pieces fit together / what's the deployment shape?" | [ARCHITECTURE.md](ARCHITECTURE.md) |
| "Why was it built this way? What broke before?" | [DECISIONS.md](DECISIONS.md) |
| "What's left to do?" | [TASKS.md](TASKS.md) |
| "What is this project trying to achieve, for whom?" | [PRD.md](PRD.md) |
| "How must frontend/dashboard UI be built?" (modular components, honest data, tokens) | [rules.md](rules.md) |
