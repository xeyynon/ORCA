# ORCA Master Reference

The master reference for the whole system. **When documents disagree, trust the code first and this file second.**
Last reconciled with the code: 2026-11-16, on branch `ui/design-system-v2` (design system v2, the 2026-11-15 audit and declutter pass, the API health page, Vercel Analytics). Engine v2 (2026-10-15) is merged and hosted. `main` holds everything up to pull request #7. Open and mergeable on 2026-11-16: PR #9 (`ui/design-system-v2`: the README back at the root, the purge's `.gitignore`, the smaller status bar, Vercel Analytics) and PR #8 (`fix/bug-sweep-2026-10-20`: sidereal time, epoch microseconds, one-transaction ingest, skipping bad records). PR #3 (`frontendimprovements`) is older and unreviewed.
All commit IDs changed on 2026-11-15 when three large binaries were purged from the history (DECISIONS.md); IDs quoted in older notes no longer resolve. The newest session notes are in [session_handover_2026-11-16.md](session_handover_2026-11-16.md).

## 1. What ORCA is

An open-source Space Situational Awareness (SSA) platform, built as a capstone project. It goes from raw TLE text to a ranked list of conjunctions (close approaches between two orbiting objects):

```
Celestrak TLEs -> SQLite -> SGP4 -> screen (KD-tree, every 20 s) -> exact TCA -> Foster Pc + risk tier -> API -> React app
```

It is an educational and research tool. It is **not** an operational collision-warning system, and its output must not drive manoeuvre decisions.

## 2. Document map

| File | Role |
|---|---|
| ORCA_MASTER.md | This file. Reconciles the other documents against the code. |
| [PRD.md](PRD.md) | Product requirements and what "done" means. |
| [intent.md](intent.md) | Why the project exists, the users, the design principles. |
| [rules.md](rules.md) | Rulebook for how things are built (frontend focus). |
| [DECISIONS.md](DECISIONS.md) | Decision log with reasons. Newest first. |
| [TASKS.md](TASKS.md) | Backlog and status. |
| [AGENTS.md](AGENTS.md) | Fast path for coding agents and contributors: setup, run, verify. |
| [README.md](../README.md) (repository root, shown on GitHub) | Project overview, quick start, API table, risk model, limitations. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Earlier architecture and the units contract (written before auth and the React app). |
| [system_architecture_2026-09-11.md](system_architecture_2026-09-11.md) | Current detailed architecture, including auth and the React app. |
| [system_design_and_boundary.md](system_design_and_boundary.md) | What is in scope, what is out. |
| [flow.md](flow.md) | End-to-end data flow. |
| [frontend.md](frontend.md) | How the React frontend is organised. |
| [external_research.md](external_research.md) | Outside systems, data and tools (Celestrak, SOCRATES, papers). |
| [deployment.md](deployment.md) | Running it locally, and the hosted deployment (Vercel + Oracle VM + GitHub Actions). |
| [pain.md](pain.md) | What can break and how badly. |
| [tried_and_failed.md](tried_and_failed.md), [tried_and_implemented.md](tried_and_implemented.md) | Approaches that did not work, and ones that did. |
| [LEO_Conjunction_Project_Context.md](LEO_Conjunction_Project_Context.md) | The capstone proposal and academic framing (team, scope, references). |
| [ml.md](ml.md), [ml_model_integration.md](ml_model_integration.md), [failmlmodel.md](failmlmodel.md) | Placeholders. ORCA has no ML component today. |
| [integration_handoff.md](integration_handoff.md) | The frontend-to-API contract. |
| [conjunction_engine_v2.md](conjunction_engine_v2.md) | The current conjunction engine: what changed on 2026-10-15, why, how it was validated, its limits. |
| [declutter_plan_2026-11-15.md](declutter_plan_2026-11-15.md) | The per-page declutter pass: what was measured, what changed, before and after for every page. |
| [ux_audit_2026-11-15.md](ux_audit_2026-11-15.md) | The 2026-11-15 UI/UX audit that preceded it. |
| [session_handover_2026-11-16.md](session_handover_2026-11-16.md) | Where the last working session left off. |
| [final_report.md](final_report.md) | The capstone final report (`ORCA Final Report.docx/.pdf`): how it is built (`report/generator/`), where every figure and number comes from, what is still open. |
| [research_paper_brief.md](research_paper_brief.md) | The research brief (v2) and every measured result (§10). |
| [paper_draft.md](paper_draft.md) | Long draft of the paper. The 6-page IEEE version is `paper/main.tex` / `paper/main.pdf`. |
| [literature_verification.md](literature_verification.md), [references.bib](references.bib) | Which sources were checked at source and what each one supports. |
| [learning_guide.md](learning_guide.md) | The whole research-and-fix story explained, with practice questions. |

## 3. Facts verified against the code (2026-10-15)

**Modules** (Python modules at the repo root):

| File | Role |
|---|---|
| `parser_pipeline.py` | TLE parser (BSTAR notation), `CelestrackClient`, `TLEDatabase` (SQLite `ssa_data.db`). |
| `orbit_mech_engine.py` | Foundation layer; imports no other project module. Contains `OrbitalElement`, the Kepler solver, `SGP4Propagator` (real SGP4 via `satrec_from_elements`), `TwoBodyDragPropagator` (the old model, comparison only) and frame transforms. |
| `conjunction_detection.py` | `ConjunctionDetector` (one pair) and `ConjunctionSearch` (catalog), engine v2: 20 s gap-free KD-tree screen, exact TCA, Foster Pc with `CovarianceModel`, long-encounter flags, `method_description()`. |
| `Analytics.py` | Catalog statistics, Plotly figures, export helpers. |
| `auth.py` | Single-operator login: scrypt hash, HMAC-signed stateless token, login throttle. |
| `api_server.py` | FastAPI app on :8000. |
| `frontend/` | React 19 + TypeScript + Vite + three.js app on :5173. The only front end. |
| `benchmarks/` | Research benchmarks. `benchmarks/legacy/` holds frozen copies of the original engine. Results are in `benchmarks/results/`. |
| `paper/` | The IEEE paper: `main.tex`, `references.bib`, figures, compiled `main.pdf`. |

**Behaviours worth knowing:**

- **Propagation.** `SGP4Propagator` is real SGP4. It matches `Satrec.twoline2rv` to under 1 mm from 0 to 168 h. It raises `ValueError` when SGP4 refuses an element set; `/api/propagate` turns that into a 422. The old two-body + drag model was measured at 297 km median error at 24 h, which is why it was replaced (DECISIONS.md, 2026-10-03 and 2026-10-15).
- **Screening.** The step is fixed at `STEP_S` = 20 s, with radius 10 km + v_max × 10 s, so no approach closer than `REPORT_KM` = 10 km can fall between steps. `search_step_hours` is accepted and ignored. The horizon is 1–7 days.
- **Window.** The search window starts at **now** (`last_window` records it) and every TCA lies inside it. Events slip into the past only as results age.
- **Uncertainty.** `CovarianceModel` gives per-object radial / in-track / cross-track σ by TLE age. The values are measured from successive TLEs (2026-10-14), split Starlink / other, and floored at ESA's at-epoch 0.102 / 0.471 / 0.126 km. Pc and tiers are conditional on it, and the UI says so.
- **Risk tiers.** CRITICAL > 1e-4, HIGH > 1e-5, MEDIUM > 1e-6, LOW > 1e-7, otherwise NEGLIGIBLE. NASA's CA handbook recommends mitigation above 1e-4.
- **Long encounters.** Relative speed under 0.1 km/s. They are flagged, and only the closest approach per pair is kept.
- **`/api/conjunctions` response.** Returns an object: `{events, total_events, tier_counts, long_encounters, window_start, window_end, objects, report_km, step_s, runtime_s}`. `/api/conjunctions/method` returns the method text.
- **Runtime.** About 1.5–2 min per day of horizon for ~16,000 objects (laptop); about 426,000 approaches under 10 km per day on the full active catalog.
- **Evaluator panel.** The sign-in page shows an "Evaluator access" panel when `VITE_EVALUATOR_USERNAME` and `VITE_EVALUATOR_PASSWORD` are set at build time (`frontend/.env.local`, git-ignored). Whatever is set there is public in the bundle.
- **Baseline.** Tag `orca-as-built-2026-10-14` marks the original engine. Benchmarks import `benchmarks/legacy/`, so the paper's baseline does not move.
- **Authentication exists**, the API guard in `api_server.py` (`require_auth`), with the credential in `auth.py`. It guards every route except `/`, `/health`, `/api/auth/login` and `/api/auth/status`. With no credential configured it fails closed (503). Set a password with `python auth.py set-password`.
- The frontend reaches the API through the Vite proxy in dev. `ORCA_CORS_ORIGINS` and `VITE_API_BASE` are for a built bundle pointed at a remote API. The hosted copy uses both: https://orca-vitap.vercel.app calls the API on the Oracle VM (see [deployment.md](deployment.md)).
- Environment settings read by `api_server.py`: `ORCA_DB_PATH`, `ORCA_CORS_ORIGINS`, `ORCA_TLE_GROUP` (default `active`), `ORCA_FETCH_COOLDOWN_S`, `ORCA_STATIC_DIR`; `auth.py` reads `ORCA_AUTH_FILE`.
- `GET /api/export/conjunctions` writes to a per-request temp directory that is removed after sending (fixed 2026-10-03). The frontend still exports in the browser.
- `_conjunction_cache` and `_analytics_cache` in `api_server.py` are declared and unused.

**Units contract** (a real past bug source): `OrbitalElement.n` rad/s, `OrbitalElement.i` radians, `TLE.inclination` degrees, positions km, velocities km/s, ECI frame.

## 4. Known document drift

The 2026-10-15 documentation pass updated README, ARCHITECTURE, AGENTS, PRD, TASKS, DECISIONS, flow, pain, external_research, tried_and_*, frontend, system_* and integration_handoff for engine v2, auth, tests and the evaluator panel. Entries resolved by that pass:

| Document | Said | Now |
|---|---|---|
| README.md Limitations | "No authentication"; "no automated tests"; old propagator and ±6 h TCA | Updated: single-operator auth, 89 + 89 tests, engine v2 limits |
| PRD.md Non-Goals | "No user authentication" | Updated: single-operator auth |
| TASKS.md | "No automated test suite exists yet" | Updated |
| ARCHITECTURE.md | Alfano 2D Pc, Streamlit notes | Updated: Foster Pc, engine v2, React only |

Kept unchanged on purpose: [LEO_Conjunction_Project_Context.md](LEO_Conjunction_Project_Context.md) is a dated record of the proposal session, and older DECISIONS.md entries are history. Superseded entries say so at their top.

## 5. How to verify a change

See [AGENTS.md](AGENTS.md): launch the affected process and hit it. A passing import is not enough. Use the project `.venv` (the system Python may lack `sgp4` or have different versions).

```bash
.venv/Scripts/python.exe -m unittest discover -s tests      # 89 tests
cd frontend && npm test && npm run typecheck                # 89 tests
```

A change to the conjunction engine should also be re-checked against the benchmark reference (see conjunction_engine_v2.md §3).
