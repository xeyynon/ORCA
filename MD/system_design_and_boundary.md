# System Design and Boundary

What is inside ORCA, what is outside it, and where the trust boundaries sit. Written 2026-10-03 from [PRD.md](PRD.md), [LEO_Conjunction_Project_Context.md](LEO_Conjunction_Project_Context.md) and the code.

## 1. Inside the boundary

| Capability | Where |
|---|---|
| Ingest public TLEs from Celestrak | `parser_pipeline.py` |
| Store them in one SQLite file | `TLEDatabase` |
| Propagate to a state vector up to 7 days ahead | `orbit_mech_engine.py` |
| Screen the catalog for conjunctions (KD-tree every 20 s, gap-free under 10 km), refine TCA with exact SGP4 | `conjunction_detection.py` |
| Rank by Foster 2D Pc into five risk tiers, with a measured TLE uncertainty model | `conjunction_detection.py` |
| Catalog statistics, charts, export | `Analytics.py`, the frontend |
| REST API with single-operator login | `api_server.py`, `auth.py` |
| React app (the only front end; Streamlit was removed 2026-10-03) | `frontend/` |

## 2. Outside the boundary

| Not in scope | Why |
|---|---|
| Operational collision warning or manoeuvre planning | TLEs carry no covariance, and public TLEs are kilometres off within days. |
| High-fidelity propagation (numerical integrator, solar radiation pressure, detailed atmosphere) | Out of scope in the PRD and the proposal. |
| Operational or restricted ephemerides (Space-Track CDMs, operator data) | Public data only. |
| Orbit determination and real covariance | No tracking data upstream. Uncertainty is estimated from successive TLEs. |
| Multi-user accounts and roles | One operator credential. |
| Hosted multi-tenant deployment | A single-operator hosted copy exists (Vercel + Oracle VM, see [deployment.md](deployment.md)). Multi-tenant hosting is out of scope. |
| Mobile app | Desktop browser only. |
| Machine learning | None in the system. See [ml.md](ml.md). |
| Inventing a new screening algorithm | The contribution is a scenario-based comparison of established methods. |

## 3. Trust boundaries

| Boundary | Trust level | Control |
|---|---|---|
| Celestrak to ORCA | Untrusted input, can fail or refuse | Parser skips bad records. Failure becomes `[]` (a known weakness). |
| Browser to API | Untrusted | Bearer token on every route except four public paths. Fails closed with no credential. CORS allow-list. Login throttle. |
| API to SQLite | Trusted, same machine | Local file. |
| Secrets | `auth.json` holds the hash and signing secret | Git-ignored. Changing the password rotates the secret. |

## 4. Interfaces to the outside world

| Interface | Direction | Notes |
|---|---|---|
| `https://celestrak.org/NORAD/elements/gp.php` | outbound | Public TLEs. `active` is large (~2.7 MB) and rate-limited. See [external_research.md](external_research.md). |
| HTTP :8000 | inbound | REST API, Swagger at `/docs`. |
| HTTP :5173 | inbound | Vite dev server. |

## 5. Quality boundary

What the output can be trusted for, in descending confidence:

1. **Catalog contents and TLE age.** Directly from Celestrak.
2. **Orbital elements and regime statistics.** Direct arithmetic on TLE fields.
3. **Position now and a few hours ahead.** SGP4, as good as the TLE (about a kilometre at epoch, growing by kilometres per day).
4. **Which pairs are close, according to the TLEs.** Gap-free screening: no approach under 10 km is skipped.
5. **Miss distance and TCA.** Exact for the TLEs, but the TLEs themselves are uncertain.
6. **Pc and risk tier.** Conditional on the uncertainty model. Long encounters may be understated.

Do not read item 6 as a probability.
