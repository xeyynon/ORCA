# Integration Handoff

Handoff notes between the frontend and the backend. The imagery and ML work this file was planned for does not exist in ORCA (see [ml.md](ml.md)), so this covers the frontend-to-API contract that does.

## The contract

- The frontend talks to the backend only through `frontend/src/api/client.ts`. Response types in `api/types.ts` were copied from real responses, and field names carry unit suffixes.
- In dev, `/api` and `/health` are proxied to `http://127.0.0.1:8000` (`vite.config.ts`). For a built bundle, set `VITE_API_BASE` at build time and list the frontend origin in `ORCA_CORS_ORIGINS` on the API. The hosted copy does exactly this: Vercel builds with `VITE_API_BASE=https://129-159-230-127.sslip.io`, and the API allows `https://orca-vitap.vercel.app` ([deployment.md](deployment.md)).
- Every route except `/`, `/health`, `/api/auth/login` and `/api/auth/status` needs `Authorization: Bearer <token>`. A 401 on a call that carried a token means the session ended, and the client clears the token.
- Login failures: 401 wrong credential, 429 throttled (with `Retry-After`), 503 no credential configured.

## Behaviours the frontend relies on

| Backend behaviour | Frontend handling |
|---|---|
| `POST /api/update-tles` returns at once, no completion event | Polls `/health` for object count and last refresh time |
| A failed Celestrak fetch is recorded as `database.last_fetch` in `/health` (status and detail) | Shows "Celestrak did not provide new data" and leaves the catalog untouched |
| Conjunction search starts at now; every TCA is inside the window. Results age as time passes | Flags events already in the past |
| `/api/conjunctions` returns an object (`events` plus `total_events`, `tier_counts`, `long_encounters`, window and runtime), not a list (changed 2026-10-15) | Shows "Top N of M" and tier counts over all M. Deploy backend and frontend together |
| `/api/conjunctions/method` returns the method text and limits | Shown in `ConjunctionMethod` |
| Each event carries `uncertainty_km`, `tle_age_days`, `long_encounter` | Uncertainty column, "Long" badge, notes in the detail card |
| Propagator name comes in the response | Shown in `MethodNote` |
| `/api/positions` accepts at most 50 ids | `usePositions` passes ids and a limit |
| `/api/export/conjunctions` (fixed server-side 2026-10-03) | Still exports CSV and JSON in the browser, no round trip needed |

## When you change the API

1. Update `api/types.ts` and `api/endpoints.ts` from a real response.
2. Keep unit suffixes on field names ([rules.md](rules.md) section 3).
3. If you add a route, it is protected by default. Add it to `PUBLIC_PATHS` only if it must be open, and `tests/test_auth.py` will check it.
4. Launch the API, call the route, read the JSON, then load the view in the browser.

## Open items for whoever picks this up

- A completion event or status field for the refresh task.
- Component or browser tests. Only `src/lib` has tests today.
