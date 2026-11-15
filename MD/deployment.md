# Deployment

How ORCA runs locally, and how the hosted copy is deployed. Hosted since 2026-10-08 on free tiers only (Oracle Cloud Always Free + Vercel Hobby + GitHub Actions). Updated from the live setup on 2026-10-09.

## 1. Where it runs

| Part | Host | Address | Deployed by |
|---|---|---|---|
| Frontend (React build) | Vercel, Hobby plan, project `orca`, root directory `frontend/` | https://orca-vitap.vercel.app | Vercel's GitHub integration, on every push to `main` that changes `frontend/` |
| Backend (FastAPI + SQLite) | Oracle Cloud Always Free VM `orca-micro` (`VM.Standard.E2.1.Micro`, AMD, 1 GB RAM + 2 GB swap), region `ap-hyderabad-1` | https://129-159-230-127.sslip.io | GitHub Actions `.github/workflows/deploy-backend.yml`, on every push to `main` that changes backend files |
| HTTPS | Caddy container on the VM, Let's Encrypt certificate | ports 80 and 443 | Same compose stack |

```
GitHub push to main
 ├─ frontend/ changed ─► Vercel builds (VITE_API_BASE baked in) ─► orca-vitap.vercel.app
 └─ backend changed  ─► Actions: tests ─► ssh: copy code, docker compose up --build ─► /health check
                                                       │
browser ──HTTPS──► orca-vitap.vercel.app               ▼
   └──────HTTPS (CORS)──► 129-159-230-127.sslip.io ─► Caddy :443 ─► orca :8000 (not published)
                                                                      └─ volume orca-data: ssa_data.db, auth.json
```

**Cost: ₹0.** Every resource is inside a free allowance. See section 7 before adding anything.

## 2. Run locally (development)

Prerequisites: Python 3.9+, Node 20.19+.

```bash
python -m venv .venv
source .venv/Scripts/activate      # Windows Git Bash; .venv/bin/activate elsewhere
pip install -r requirements.txt
cd frontend && npm install && cd ..
python auth.py set-password        # one operator credential (or --generate)
```

```bash
# API  http://127.0.0.1:8000  (docs at /docs)
PYTHONIOENCODING=utf-8 uvicorn api_server:app --port 8000

# React app  http://127.0.0.1:5173  (second terminal)
cd frontend && npm run dev
```

Load data after first launch: sign in, then use the Data view, or send `POST /api/update-tles` with a bearer token.

To try the production container locally: `docker build -t orca .` then `docker run -p 8000:8000 -v orca-data:/data orca`. The default `full` target also serves the built frontend at `/`.

## 3. Shipping a change

Push (or merge) to `main`. Nothing else is needed.

| What changed | What runs | Where to watch |
|---|---|---|
| Anything under `frontend/` | Vercel build. `frontend/vercel.json` skips the build when `frontend/` did not change. | Vercel dashboard → project `orca` |
| `*.py`, `requirements.txt`, `Dockerfile`, `.dockerignore`, `deploy/**`, `tests/**`, the workflow | `test` job (`python -m unittest discover -s tests`), then `deploy` job | GitHub → Actions → Deploy backend |

- **A failing test stops the backend deploy.** The VM keeps the last good version.
- The deploy job streams the backend files to `~/ORCA` on the VM over SSH, then runs `docker compose up -d --build` and checks `/health`. It never touches `deploy/.env` or the data volume.
- Re-run a backend deploy without a code change: Actions → Deploy backend → Run workflow.
- **Changing a Vercel environment variable needs a manual redeploy** (Vercel dashboard → Deployments → Redeploy), because the build is skipped when `frontend/` did not change.

## 4. Configuration

### Backend (environment)

| Setting | Default | Live value | Purpose |
|---|---|---|---|
| `PYTHONIOENCODING` | unset | `utf-8` (set in the image) | Must be `utf-8` on Windows |
| `ORCA_AUTH_FILE` | `auth.json` beside `auth.py` | `/data/auth.json` | Credential file location |
| `ORCA_DB_PATH` | `ssa_data.db` in the working directory | `/data/ssa_data.db` | SQLite location |
| `ORCA_STATIC_DIR` | unset | unset (the `api` image target) | Serve a built `frontend/dist` from the API's own origin |
| `ORCA_CORS_ORIGINS` | the two Vite dev origins | `https://orca-vitap.vercel.app` | Comma-separated origins allowed to call the API |
| `ORCA_TLE_GROUP` | `active` | `stations` | Celestrak group fetched on refresh. Kept small on the 1 GB VM |
| `ORCA_FETCH_COOLDOWN_S` | `300` | `300` | Minimum seconds between Celestrak fetches |

On the VM these come from `~/ORCA/deploy/.env` (template: `deploy/env.example`), which also sets `ORCA_DOMAIN` (the name Caddy certifies) and `ORCA_BUILD_TARGET` (`api` = backend only, `full` = backend + frontend). Edit `.env` on the VM, then run `cd ~/ORCA/deploy && sudo docker compose up -d`.

### Frontend (Vercel, build time)

| Setting | Live value | Purpose |
|---|---|---|
| `VITE_API_BASE` | `https://129-159-230-127.sslip.io` (Production) | API origin baked into the bundle. Unset = same origin (Vite proxy in dev) |
| `VITE_EVALUATOR_USERNAME`, `VITE_EVALUATOR_PASSWORD` | set (Production, 2026-11-16): `admin` and the hosted password, which the owner reset on the VM for this | If both are set, the sign-in page shows them in an "Evaluator access" panel. They become public in the bundle, so set them only if the hosted login is meant to be open. Locally they live in the git-ignored `frontend/.env.local`. |

### GitHub repository secrets (used by the deploy workflow)

| Secret | Holds |
|---|---|
| `ORCA_SSH_KEY` | Private key used only by Actions (public half in the VM's `authorized_keys`, comment `orca-github-actions`) |
| `ORCA_SSH_KNOWN_HOSTS` | The VM's host key, so the connection is pinned |
| `ORCA_HOST` | VM public IP |
| `ORCA_API_URL` | `https://<ip-with-dashes>.sslip.io`, checked after each deploy |

## 5. Files

| File | Role |
|---|---|
| `Dockerfile` | Stage `web` builds the frontend. Target `api` is Python 3.12 slim + uvicorn, one worker, `--proxy-headers`. Target `full` (default) adds the built frontend. Runs as a non-root user. Data lives in the `/data` volume. |
| `.dockerignore` | Keeps `node_modules`, `*.db`, `auth.json`, docs and media out of the image |
| `deploy/docker-compose.yml` | `orca` + `caddy`. Only Caddy publishes ports. Volumes `orca-data` and `caddy-data` |
| `deploy/Caddyfile` | `{$ORCA_DOMAIN}` → `reverse_proxy orca:8000`, gzip |
| `deploy/env.example` | Template for the VM's `deploy/.env` |
| `deploy/ORACLE.md` | Step-by-step: provisioning the VM, operating it, moving it |
| `.github/workflows/deploy-backend.yml` | Test → ship → rebuild → health check |
| `frontend/vercel.json` | `ignoreCommand` so Vercel builds only when `frontend/` changed |
| `frontend/.vercelignore` | Keeps `node_modules`, `dist` and local CSV exports out of CLI uploads |

## 6. Operating the VM

SSH: `ssh -i ~/.ssh/orca_oracle ubuntu@129.159.230.127`. Then `cd ~/ORCA/deploy`.

| Task | Command |
|---|---|
| Status | `sudo docker compose ps` and `curl https://129-159-230-127.sslip.io/health` |
| Logs | `sudo docker compose logs -f orca` (or `caddy`) |
| Change the password | `sudo docker compose exec orca python auth.py set-password` (signs everyone out) |
| Back up credential + catalog | `sudo docker run --rm -v deploy_orca-data:/d -v $PWD:/b alpine tar czf /b/orca-data.tgz -C /d .` |

Containers restart on crash and on reboot (`restart: unless-stopped`). More in [deploy/ORACLE.md](../deploy/ORACLE.md).

## 7. Staying free

| Resource | Used | Free allowance |
|---|---|---|
| Oracle AMD micro VM | 1 (`orca-micro`) | 2 |
| Oracle Ampere A1 | 0 (see below) | 4 OCPU / 24 GB in total |
| Oracle block storage | 50 GB boot volume | 200 GB |
| Oracle public IP | 1 ephemeral (kept across reboot, lost only if the VM is terminated) | — |
| Oracle egress | small | 10 TB / month |
| Vercel | Hobby plan, 1 project | Hobby limits |
| GitHub Actions (private repo) | ~1–2 min per deploy | 2,000 min / month |
| Domain + certificate | sslip.io + Let's Encrypt | free |

- **The Oracle account is Pay As You Go.** Always Free resources are never billed, but anything else is. Always Free compute exists **only in the home region (Hyderabad)**. A VM in another region, a larger shape, a reserved IP or a second disk can cost money. Keep a budget alert (Billing → Budgets, ₹1) on the account.
- **Ampere A1 (ARM, 2 OCPU / 12 GB) is the intended home** but Hyderabad answered "Out of host capacity" on every attempt on 2026-10-08. Moving to it later is in [deploy/ORACLE.md](../deploy/ORACLE.md) section 7.

## 8. Before trusting or sharing it

- [ ] `python -m unittest discover -s tests` passes (CI enforces this for the backend).
- [ ] `cd frontend && npm test && npm run typecheck` passes (not run in CI yet).
- [ ] Catalog refreshed recently. Check TLE age before trusting a result.
- [ ] One shared credential. Tokens cannot be revoked individually (12 h lifetime). Give the login only to people who should have it, and rotate the password if it leaks.
- [ ] `ssa_data.db`, `auth.json`, `deploy/.env` and SSH keys are never committed.

## 9. Remaining gaps

| Gap | Why it matters |
|---|---|
| Small VM | 1/8 OCPU and 1 GB RAM. Fine for `stations` (19 objects). The `active` catalog (~16k objects) is too heavy here: engine v2 takes ~1.5–2 min per day of horizon on a laptop. Needs the A1 VM. |
| Engine v2 not deployed | Branch `fix/honest-conjunctions` changes the shape of `/api/conjunctions` (an object, not a list). Push backend and frontend together, or the live UI breaks. |
| Single SQLite file | One writer, one API worker. No scaling past one VM. |
| Auth | One shared credential, stateless tokens that cannot be revoked individually, throttle keyed on client address. |
| Background refresh | `POST /api/update-tles` has no completion event. No scheduled refresh. |
| Frontend CI | Vercel builds the bundle (type-check included), but `npm test` does not run before deploy. |
| IP-based hostname | The API name is derived from the VM's IP. A new VM means updating `ORCA_HOST`, `ORCA_API_URL`, `VITE_API_BASE`, then redeploying. |

## 10. Known operational hazards

See [pain.md](pain.md). Locally, the two that have broken a run: the console-encoding crash on Windows, and Celestrak refusing `active` after repeated requests. Hosting hazards hit while setting up are in [tried_and_failed.md](tried_and_failed.md) sections 9–12.

## Evaluator login and analytics on the hosted site (2026-11-16)

- The hosted sign-in shows the "Evaluator access" panel. The hosted `admin` password was reset on the VM (`docker compose exec orca python auth.py set-password`) and the same value saved as the Vercel variable `VITE_EVALUATOR_PASSWORD`, so it is public by design. Rotating it means doing both again, then a redeploy.
- A redeploy after a Vercel variable change must untick **"Use project's Ignore Build Step"**, or the build is skipped (nothing under `frontend/` changed) and the variable never reaches the bundle. Vercel also asks for the account's two-factor code before it redeploys.
- Vercel Web Analytics: `@vercel/analytics` (`src/PageAnalytics.tsx`) sends a page view per hash view (`/overview`, `/globe`, ...). It records nothing until Analytics is enabled for the project in the Vercel dashboard (project `orca` > Analytics > Enable).
