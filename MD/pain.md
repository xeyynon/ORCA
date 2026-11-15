# Pain

What can break the system and how badly. Severity is for a user trusting the output, not just uptime.
**Seen** means it actually happened (see [DECISIONS.md](DECISIONS.md)). **Latent** means the code allows it and it has not been observed.

| Severity | Meaning |
|---|---|
| Critical | Produces wrong results that look right |
| High | System stops or data is silently lost |
| Medium | Feature fails visibly |
| Low | Annoyance |

## Critical: wrong output that looks right

| # | Risk | Status | What happens | Mitigation |
|---|---|---|---|---|
| P1 | **Stale TLEs** | Latent, always present | Orbit prediction degrades fast with TLE age. Every position, miss distance and Pc inherits it. | Show TLE age beside every object. Refresh before reading results. |
| P2 | **Simplified propagator** | Seen 2026-10-03, fixed 2026-10-15 | `SGP4Propagator` was two-body plus drag (297 km median error at 24 h). It is now real SGP4 everywhere. | Engine v2. The old model remains only as `TwoBodyDragPropagator` and in `benchmarks/legacy/`. |
| P3 | **Uncertainty model decides the tier** | Measured 2026-10-14/15, always present | TLEs carry no covariance. On the same encounters, plausible models give anywhere from 0 to ~500 HIGH events per 2,000 objects per day. The v2 model is measured from one day of TLEs (LEO only) and floored at ESA's at-epoch values. | Stated beside every Pc and in the method panel. Refresh the model with more daily snapshots (`benchmarks/refresh_measured.ps1`). |
| P4 | **Unit mismatch** | Seen (historical) | `TLE.inclination` is degrees, `OrbitalElement.i` is radians. `sgp4` mean motion is rad/min, ORCA wants rad/s. A slip gives plausible but wrong orbits. | Units contract in [ARCHITECTURE.md](ARCHITECTURE.md) section 7. Unit suffixes on frontend field names. No Python unit tests yet. |
| P5 | **Search window began at the first TLE epoch** | Seen, fixed 2026-10-03 | A "7-day" search on a 45-day-old catalog returned events 41-44 days in the past. | `start_epoch` now defaults to now. `tests/test_search_start.py`. |
| P6 | **Event before now** | Latent | Engine v2 keeps every TCA inside the window, which starts when the search runs. Events slip into the past only as results age. | Frontend flags any past event and says to rerun. |
| P7 | **Missed fast pass** | Seen (measured ~99 % missed at 1 h / 100 km), fixed 2026-10-15 | The original screen sampled hourly, so fast passes fell between samples. | Engine v2 screens every 20 s with radius 10 km + v_max x 10 s: gap-free for misses under 10 km, checked against a dense reference. |
| P29 | **Long encounters** | Latent, always present | Below 0.1 km/s relative speed, the 2D Pc assumes a fast pass and can be about 6x too low. | Flagged in the table and detail card. Only the closest approach per pair is listed. A 3D Pc is future work. |
| P30 | **Starlink TLEs are much worse** | Measured 2026-10-14 | In-track TLE error is about 15x that of other LEO objects at the same age, consistent with continuous low-thrust manoeuvring. | The uncertainty model keeps Starlink separate. |
| P8 | **Hard-body radius by name keyword** | Latent | An object whose name has no keyword gets 3.0 m. A large body named "XYZ" is underestimated. | None. Document. |

## High: stops, or silently loses data

| # | Risk | Status | What happens | Mitigation |
|---|---|---|---|---|
| P9 | **Console encoding crash on Windows** | Seen | The parser prints a Unicode check mark per TLE. On cp1252 it raises `UnicodeEncodeError` inside a background task. The HTTP call already returned 200, so the catalog silently stays truncated. | Launch with `PYTHONIOENCODING=utf-8`. Better: stop printing non-ASCII on the ingestion path. |
| P10 | **Dead or renamed Celestrak group** | Seen | `last-30-days` returned 404. The failure was logged and the catalog stayed empty. `/api/statistics` returned `{}`. | Default changed to `active`. A CI smoke test would have caught it. |
| P11 | **Celestrak 403 after repeated `active` requests** | Seen | Refresh looks like an empty fetch. The only trace is the server log. | Wait, or seed from `stations`. Open task: backoff and a distinguishable failure signal. |
| P12 | **Fetch failure looks like an empty catalog** | Seen, fixed 2026-10-03 | `fetch_group` returned `[]` for every failure. `fetch_group_checked` now reports ok, empty, rate_limited, not_found, http_error or network_error, shown in `/health` and the Data view. | Use `fetch_group_checked` in new code. |
| P13 | **Hardcoded absolute path** | Seen | The old `dashboard.py` (since removed) pointed at one developer's `C:\Users\...` path and crashed on every other machine. | Use `DB_PATH`. Never hardcode a path. |
| P14 | **SQLite with two processes** | Latent | Two writers or a long write can hit file-lock errors. Fine for one operator. | Single operator only. A real database if that changes. |
| P15 | **No completion event for refresh** | Latent | The client can only poll `/health` for the object count. | The frontend polls and shows honest progress. |

## Medium: visible failure

| # | Risk | Status | What happens |
|---|---|---|---|
| P16 | **Auth not configured** | By design | Every protected route returns 503 until `python auth.py set-password` is run. The login screen says so. |
| P17 | **Login lockout** | By design | Repeated failures return 429 with `Retry-After`. |
| P18 | **Export endpoint on Windows** | Seen, fixed 2026-10-03 | `GET /api/export/conjunctions` wrote to `/tmp` and failed on Windows. Now uses a temp directory per request. |
| P20 | **Long catalog searches** | Live | Engine v2 takes about 1.5-2 min per day of horizon for ~16k objects, and the horizon is capped at 7 days. Cancel stops the browser waiting, but the server finishes the search. |
| P26 | **Undersized hosting VM** | Live | The hosted API runs on a 1 GB, 1/8-OCPU micro VM. A large catalog or long search can exhaust memory or time out. The live group is `stations` for this reason. |
| P27 | **API hostname tied to the VM's IP** | Latent | The frontend has `https://<ip>.sslip.io` baked in. Terminating the VM, or a failure of sslip.io's DNS, breaks the hosted site until the secrets and `VITE_API_BASE` are updated (deploy/ORACLE.md §7). |
| P28 | **Accidental cloud charges** | Latent | The Oracle account is Pay As You Go. Anything outside Always Free (another region, a bigger shape, a reserved IP) is billed. A ₹1 budget alert is the guard. |
| P21 | **Dead cache variables** | Latent | `_conjunction_cache` and `_analytics_cache` exist in `api_server.py` and are unused. They suggest caching that does not happen. |
| P31 | **Evaluator credential is public** | By design | If `VITE_EVALUATOR_*` is set, the shared login is visible in the page and in the bundle. ORCA has one login, so that is the app's login. | Leave them unset on the hosted site unless open access is intended. |

## Low

| # | Risk | What happens |
|---|---|---|
| P22 | **Partial CI** | Python tests (89) gate backend deploys. Frontend tests (89), the typecheck and a live Celestrak smoke test are not in CI. |
| P23 | **Unpinned requirements** | `requirements.txt` has lower bounds only. A future release may break a clean install. |
| P24 | **Large binaries in git** | Mostly fixed 2026-11-15: `demo.gif`, `Video Project 1.mp4` and `final.png` were purged from the whole history and are git-ignored. `pre.png` and the three large design PNGs at the root remain (owner kept them). |
| P25 | **Document drift** | Documents were reconciled with the code on 2026-10-15. Check [ORCA_MASTER.md](ORCA_MASTER.md) §4 after any engine change. |

## Token risk (security)

A signed token cannot be revoked individually. Sign-out forgets it in the browser only, so a copied token works until it expires (12 h) or the password changes. Acceptable for a trusted-network tool.
