# ORCA frontend

React + TypeScript + Vite + three.js. It is the only front end (the Streamlit dashboard was removed) and talks to the FastAPI backend.

Every piece of the interface is its own component, from atom to view.

## Run

```bash
# 1. API (from the repo root). PYTHONIOENCODING is required on Windows (see AGENTS.md).
PYTHONIOENCODING=utf-8 uvicorn api_server:app --port 8000

# 2. Frontend
cd frontend
npm install
npm run dev          # http://127.0.0.1:5173, /api and /health are proxied to :8000
```

Other scripts: `npm run build` (type-checks, then bundles), `npm test` (unit tests for `src/lib`, plus `rules.test.ts`, which turns the standing UI rules into checks), `npm run typecheck`, `npm run contrast` (WCAG contrast of every colour token pair, both themes; exits 1 on a failure).

To point a built bundle at a remote API, set `VITE_API_BASE` at build time and add the frontend's origin to `ORCA_CORS_ORIGINS` on the API.

## Views

| Key | View | What it does |
|---|---|---|
| 1 | Overview | Catalog KPIs, sortable table, object detail, regime breakdown |
| 2 | Globe | three.js Earth with every object, orbit paths, time scrub up to +7 days |
| 3 | Conjunctions | Run a screening search (cancellable, keeps running while you look at other views), the answer first, risk summary, pair detail, CSV/JSON export, or open a saved example run |
| 4 | Analytics | Server statistics plus histograms and a scatter derived in the browser |
| 5 | Data | Catalog freshness and a Celestrak refresh with honest progress |

`?` lists the keyboard shortcuts.

## Layout

```
src/
  api/          typed client, endpoints, response types (copied from real responses)
  lib/          pure logic + tests: units, risk, time, histogram, coordinates
  hooks/        all fetching, polling and effects
  globe/        EarthScene: the only code that touches three.js
  components/
    atoms/ molecules/ organisms/ views/    one folder per component
  styles/       design tokens (dark + light) and base styles
```

## What the UI is honest about

- TLE age is shown wherever a position or object is: old element sets propagate poorly.
- Everything uses SGP4, including the conjunction search (engine v2). The method and its limits are shown above the results, read from `/api/conjunctions/method`.
- The conjunction search starts at the current time and finds every approach under 10 km in the window. Events whose closest approach has passed since the search ran are flagged, because they are not forecasts.
- The table shows the top N by Pc; the tier counts cover all M approaches found.
- Pc depends on an uncertainty model measured from public TLEs (shown per event, with TLE age). It is not an operational collision probability. Slow "long" encounters are badged, because the 2D Pc may understate them.
