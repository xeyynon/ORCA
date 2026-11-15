# Tried and Implemented

Approaches confirmed working. Check here before building something new. Each entry says where it lives and how it was confirmed. Drawn from [DECISIONS.md](DECISIONS.md), [TASKS.md](TASKS.md), the tests and the code.

## Pipeline

| Approach | Where | Confirmed by |
|---|---|---|
| **Gap-free screening (engine v2, 2026-10-15).** SGP4 for every object every 20 s, with a KD-tree radius of 10 km + v_max x 10 s. No approach closer than 10 km can fall between steps (r >= d + v*dt/2). | `conjunction_detection._screen` | Against a dense 10 s reference on 3 seeds, every non-slow encounter was found. Full catalog: ~426k approaches per day in ~1.5-2 min. |
| **Exact TCA.** A parabola on d^2 locates the grid minimum, then exact SGP4 states plus one range-rate step. | `_refine_exact` | Miss distance agrees with the reference to a median of 0.5 mm (6 cm max). |
| **Search starts at now**, with an optional `start_epoch` for historical windows. | `ConjunctionSearch.search_catalog` | `tests/test_search_start.py` fails on the old behaviour and passes on the new |
| **Foster 2D Pc, vectorised** with 32-point Gauss-Legendre on the principal axes, falling back to adaptive quadrature when the radius is not small. Per-object RIC uncertainty measured from successive TLEs, floored at ESA's at-epoch values. | `collision_probability`, `CovarianceModel` | Matches adaptive quadrature to 5 decimals (`tests/test_conjunction_engine.py`). Foster matches the closed form to 1e-12, and Monte Carlo agrees within its interval. |
| **Real SGP4 from mean elements** (`satrec_from_elements`, the same `sgp4init` call as `twoline2rv`). | `orbit_mech_engine.SGP4Propagator` | Under 1 mm from `twoline2rv` at 0-168 h. |
| **Method text served by the engine**, so the UI cannot drift from it. | `method_description()`, `/api/conjunctions/method` | `test_method_description_is_filled_in` |
| **Upsert by NORAD id** (`INSERT OR REPLACE`). A refresh is idempotent. | `TLEDatabase` | Catalog count matches the fetched count |
| **Fetch failures are reported, not swallowed.** `fetch_group_checked` returns a status (ok / empty / rate_limited / ...), shown in `/health` and the Data view. | `parser_pipeline.py` | `tests/test_fetch_status.py`, `tests/test_fetch_cooldown.py` |
| **Foundation layer with zero project imports.** | `orbit_mech_engine.py` | Import graph in [system_architecture_2026-09-11.md](system_architecture_2026-09-11.md) |
| **Vectorised single-process search** in place of the old process pool: SatrecArray batches, a KD-tree per step, per-object `sgp4_array` refinement, vectorised Pc. | `conjunction_detection.py` | Faster than the old per-pair workers, and nothing has to be picklable. |

## Research method (2026-10-14/15)

| Approach | Where | Confirmed by |
|---|---|---|
| **Freeze the baseline before fixing it.** Tag `orca-as-built-2026-10-14`, verbatim copies in `benchmarks/legacy/`. | `benchmarks/legacy/` | The legacy Pc check and Exp 5 reproduce the committed results exactly. |
| **Frozen catalog snapshots with sha256 manifests.** Every run records the snapshot and its hash. | `benchmarks/catalog.py`, `snapshot_catalog.py` | Results are traceable to a file. |
| **References with a stated guarantee** (a dense 10 s grid that provably catches every approach under 10 km), not "the other method". | `benchmarks/screening_recall.py` | Recall at 20 s / 200 km is 100 %, as the bound predicts. |
| **Predict, then measure.** The sampling law 2r/(v*dt) predicted ~0.56 % recall at 1 h / 100 km before it was measured (1.0-1.2 %, fast bands 0.4-0.7 %). | brief section 10 | Matches |
| **Three seeds for every result.** | all experiments | Seeds agree to about 2 significant figures. |
| **Check code against a reference implementation** (J2 rates against SGP4's own secular rates). | `tests/test_benchmark_propagators.py` | Caught the Kozai/Brouwer double count. |
| **Drive the real UI and look at it** (headless Chrome via `playwright-core`). | scratch driver | Screenshots caught three UI bugs. |
| **Compile the paper locally with Tectonic** (single binary, packages on demand). | `paper/` | `main.pdf`, 6 pages |

## Operations

| Approach | Where | Confirmed by |
|---|---|---|
| **`stations` group for development seeding**, `active` for the real catalog. | Operator habit | Avoided the 403 during testing |
| **`PYTHONIOENCODING=utf-8`** on every launch. | AGENTS.md, README, ARCHITECTURE | Ingestion completes on Windows |
| **Portable paths** (`Path(__file__).parent`). | `auth.py`, `parser_pipeline.py` | Runs from any checkout |
| **Verify by launching.** Start the process and hit the endpoint. For the frontend, load the view in a browser and check the console. | AGENTS.md | Used for the 2026-08-18 fixes |
| **`.gitignore` for `*.db` and `auth.json`.** | `.gitignore` | Data and secrets stay out of git |

## Deployment

| Approach | Where | Confirmed by |
|---|---|---|
| **One Docker image, two targets** (`api`, `full`). Settings by environment, data on a `/data` volume, non-root user. | `Dockerfile` | Built and run locally. Credential and catalog survived recreating the container |
| **Caddy in front, API port unpublished.** Automatic Let's Encrypt for `<ip>.sslip.io`, so no domain is needed. | `deploy/` | Valid certificate. Port 8000 unreachable from outside |
| **`--proxy-headers` behind the proxy**, so the login throttle sees the visitor. | `Dockerfile` CMD | Throttle design in `auth.py` |
| **Push-to-deploy.** Vercel's GitHub integration for `frontend/`. Actions runs tests, then ships over SSH, then a health check. | `.github/workflows/deploy-backend.yml`, `frontend/vercel.json` | First run on commit `d9e0690`: tests 37 s, deploy 35 s, Vercel build ready |
| **Cross-origin frontend** via `VITE_API_BASE` + `ORCA_CORS_ORIGINS`. | Vercel env, VM `.env` | Preflight returns `Access-Control-Allow-Origin: https://orca-vitap.vercel.app`. Sign-in works |
| **Free tier only, home region only.** Micro VM + swap while A1 has no capacity. `stations` group on the small VM. | Oracle | Positions 0.04 s, conjunction search 0.6 s on 19 objects |

## Security

| Approach | Where | Confirmed by |
|---|---|---|
| **Fail-closed API guard.** One global dependency, a small allow-list of public paths, 503 when no credential is configured. | `require_auth` in `api_server.py` | `tests/test_auth.py`, including "every data route is protected" |
| **Hash and sign with the standard library only.** scrypt for the password, HMAC-SHA256 for stateless tokens. | `auth.py` | Tests for tampering, expiry, malformed tokens and password rotation |
| **Rotating the password rotates the signing secret**, so old tokens die at once. | `auth.py` | `test_changing_the_password_invalidates_every_old_token` |
| **One login message for wrong user and wrong password**, plus a throttle with `Retry-After`. | `login`, `LoginThrottle` | `test_blocks_after_the_limit_and_recovers_after_the_window` |

## Frontend

| Approach | Where | Confirmed by |
|---|---|---|
| **Atomic component hierarchy**, one component per folder, no fetch in presentational code. | `frontend/src/components` | [rules.md](rules.md) section 1, followed throughout |
| **Pure logic in `lib/` with tests** (units, histogram, coordinates, catalog, pair, scale, auth errors). | `frontend/src/lib` | `npm test` |
| **Single point of contact with the backend** (`api/client.ts`). | `frontend/src/api` | Token attach and 401 handling in one place |
| **Design tokens only**, read at runtime for charts. | `styles/tokens.css`, `lib/tokens.ts`, `lib/chartColors.ts` | `charts.test.ts` rejects literal colours |
| **three.js confined to `EarthScene.ts`.** React calls methods on it. | `frontend/src/globe` | One owner for the scene |
| **View in the URL hash** instead of a router. Reload and Back work. | `useHashView` | Works with no extra dependency |
| **Honest data states.** TLE age chips, propagator named in `MethodNote`, three kinds of empty state, past events flagged. | `components/` | [rules.md](rules.md) section 2 |
| **Cancellable search and polled refresh.** | `useConjunctionSearch`, `useCatalogUpdate` | Used in the Conjunctions and Data views |
| **Method and limits beside the numbers** (2026-10-15): a method panel from the API, tier counts over everything found ("Top N of M"), uncertainty and TLE age per event, "Long" badges, an honest Pc note. | `ConjunctionMethod`, `ConjunctionsView`, `ConjunctionTable`, `PairCard` | Screenshots; `conjunctionSummary.test.ts` |
| **Evaluator access panel** (2026-10-15), shown only when both build-time variables are set; it fills the form in one click. | `EvaluatorAccess`, `CredentialRow`, `lib/evaluator.ts` | `evaluator.test.ts`; sign-in verified through the proxy |
| **Vite proxy in dev**, so the browser never crosses origins. | `vite.config.ts` | Dev flow in README |
| **Browser-side CSV and JSON export.** | `lib/csv.ts`, `lib/exportConjunctions.ts` | Avoids the `/tmp` bug |
