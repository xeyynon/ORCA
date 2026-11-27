"""
SSA REST API
FastAPI-based production server for orbital queries and conjunction detection
"""

from fastapi import Depends, FastAPI, HTTPException, BackgroundTasks, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import json
import os
import shutil
import tempfile
import asyncio
from pathlib import Path
import logging
 
import envfile

# Before anything reads its settings: GROQ_API_KEY and friends from the git-ignored .env next to this file.
envfile.load()

import auth
import assistant
from parser_pipeline import CelestrackClient, TLEDatabase, TLE

from orbit_mech_engine import OrbitalElement, SGP4Propagator, CoordinateTransform, _julian_day, _gmst
from sgp4.api import Satrec, SatrecArray, jday
import numpy as np
from conjunction_detection import ConjunctionDetector, ConjunctionSearch, ConjunctionEvent, method_description
from Analytics import OrbitalAnalytics, ExportUtils, OBJECT_TYPES, REGIMES, catalog_columns, classify_object_type, classify_regime



# ============================================================================
# SETUP
# ============================================================================
 
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
 
# Paths reachable without a token. Everything else under this app requires one (see require_auth).
# /health stays open so a client can show "API online" before sign-in; it exposes only a count and a timestamp.
PUBLIC_PATHS = {"/", "/health", "/api/auth/login", "/api/auth/status"}
_login_throttle = auth.LoginThrottle()
FETCH_COOLDOWN_S = int(os.environ.get("ORCA_FETCH_COOLDOWN_S", "300"))
# Celestrak group fetched on refresh. A hosted box may want a smaller one than "active".
TLE_GROUP = os.environ.get("ORCA_TLE_GROUP", "active")
# A built frontend (frontend/dist) to serve from this same origin. Unset in development, where Vite serves it.
STATIC_DIR = os.environ.get("ORCA_STATIC_DIR")


def require_auth(request: Request):
    """
    Global guard. FAILS CLOSED: with no credential configured every protected route answers 503 and names the
    setup command, rather than quietly serving data to anyone. The browser login screen is only the front door;
    this check is the actual security boundary.
    """
    if request.method == "OPTIONS" or request.url.path in PUBLIC_PATHS:
        return
    if not auth.is_configured():
        raise HTTPException(status_code=503, detail="Authentication is not configured on this server. Run: python auth.py set-password")
    header = request.headers.get("authorization", "")
    token = header[7:] if header.lower().startswith("bearer ") else ""
    user = auth.verify_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in required", headers={"WWW-Authenticate": "Bearer"})
    request.state.user = user


app = FastAPI(
    title="Space Situational Awareness API",
    description="Production-grade SSA system: orbital mechanics, TLE data, conjunction detection",
    version="1.0.0",
    dependencies=[Depends(require_auth)],
)
 
# The React frontend (frontend/) is normally served through the Vite dev proxy,
# so it never crosses origins. CORS is for pointing a built frontend at this API
# directly; override with ORCA_CORS_ORIGINS="https://a.example,https://b.example".
_cors_origins = [
    o.strip()
    for o in os.environ.get(
        "ORCA_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]
# Bulk position snapshots are a few MB of repetitive JSON; gzip makes them roughly 4x smaller on the wire.
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

db = TLEDatabase(os.environ.get("ORCA_DB_PATH", "ssa_data.db"))

def _orbital_elements(tles) -> Dict[str, tuple]:
    """
    {norad id: (OrbitalElement, name)} for the records that can be turned into an orbit. An unusable record (a zero
    mean motion, say) is skipped with a warning rather than failing every catalog-wide endpoint, as _sat_cache does.
    """
    elements = {}
    for tle in tles:
        try:
            oe = tle.to_orbital_element()
            if not oe.n > 0:
                raise ValueError(f"mean motion {oe.n} rad/s is not positive")
        except Exception as exc:
            logger.warning("skipping %s: %s", tle.norad_cat_id, exc)
            continue
        elements[tle.norad_cat_id] = (oe, tle.object_name)
    return elements


# In-memory cache for expensive computations
_conjunction_cache = {}
_analytics_cache = {}






# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

class LoginRequest(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=256)


@app.get("/api/auth/status")
def auth_status():
    """Public. Lets the login screen say "not configured yet" instead of a misleading "wrong password"."""
    return {"configured": auth.is_configured()}


@app.post("/api/auth/login")
def login(body: LoginRequest, request: Request):
    """Exchange the operator credential for a signed token. Same message for a wrong user and a wrong password."""
    client = request.client.host if request.client else "unknown"
    wait = _login_throttle.retry_after(client)
    if wait:
        minutes = max(1, -(-wait // 60))
        raise HTTPException(status_code=429, detail=f"Too many failed attempts. Try again in {minutes} minute(s).", headers={"Retry-After": str(wait)})
    if not auth.is_configured():
        raise HTTPException(status_code=503, detail="Authentication is not configured on this server. Run: python auth.py set-password")
    if not auth.verify_login(body.username, body.password):
        _login_throttle.record_failure(client)
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    username = body.username.strip()
    token, exp = auth.issue_token(username)
    return {"token": token, "username": username, "expires_at": exp}


@app.get("/api/auth/me")
def whoami(request: Request):
    """Guarded by the global dependency: a 200 here means the presented token is valid and unexpired."""
    return {"username": request.state.user}


# ============================================================================
# ASK ORCA ASSISTANT (optional; off unless GROQ_API_KEY is set, in the environment or .env; see assistant.py)
# ============================================================================

_ask_limiter = assistant.AskLimiter()


@app.get("/api/assistant/status")
def assistant_status():
    """Whether free-text questions can go to the AI provider (Groq) on this server, and if not, why. Never reveals the key."""
    return assistant.status()


@app.post("/api/assistant/ask")
async def assistant_ask(request: Request):
    """
    Answer one question from the facts the browser sends. 503 when the feature is off, 400 on bad input,
    429 past the per-user limit, 502 when Groq fails. Body is read by hand so bad input is a 400, not a 422.
    """
    state = assistant.status()
    if not state["enabled"]:
        raise HTTPException(status_code=503, detail=state["reason"])
    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(status_code=400, detail="Send a JSON body.")
    try:
        req = assistant.validate(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    user = getattr(request.state, "user", None) or "unknown"
    wait = _ask_limiter.retry_after(user)
    if wait:
        minutes = max(1, -(-wait // 60))
        raise HTTPException(status_code=429, detail=f"Question limit reached. Try again in {minutes} minute(s).", headers={"Retry-After": str(wait)})
    _ask_limiter.record(user)
    try:
        result = await run_in_threadpool(assistant.ask, req)  # the SDK call blocks; keep the event loop free
    except assistant.UpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"answer": result["answer"], "model": result["model"], "label": assistant.LABEL}


# ============================================================================
# PYDANTIC MODELS
# ============================================================================
 
class StateVectorResponse(BaseModel):
    """Cartesian state vector response"""
    x: float
    y: float
    z: float
    vx: float
    vy: float
    vz: float
    altitude: float
    speed: float
    range: float
 
 
class OrbitalElementResponse(BaseModel):
    """Orbital element response"""
    a: float  # Semi-major axis (km)
    e: float  # Eccentricity
    i: float  # Inclination (degrees)
    omega: float  # Argument of perigee (degrees)
    Omega: float  # RAAN (degrees)
    M: float  # Mean anomaly (degrees)
    period_hours: float
    apogee_km: float
    perigee_km: float
 
 
class TLEResponse(BaseModel):
    """TLE record response"""
    norad_cat_id: str
    object_name: str
    epoch: str
    inclination: float
    raan: float
    eccentricity: float
    arg_of_perigee: float
    mean_anomaly: float
    mean_motion: float
 
 
class ConjunctionResponse(BaseModel):
    """Conjunction event response"""
    sat1_id: str
    sat1_name: str
    sat2_id: str
    sat2_name: str
    tca: str
    min_distance_km: float
    probability_of_collision: float
    risk_level: str
    relative_velocity_kms: float = 0.0
    tle_age_days: float = 0.0
    uncertainty_km: float = 0.0
    long_encounter: bool = False


class ConjunctionSearchResponse(BaseModel):
    """The most probable events plus counts over everything found, so a short list is never mistaken for all."""
    events: List[ConjunctionResponse]
    total_events: int
    tier_counts: Dict[str, int]
    long_encounters: int
    window_start: str
    window_end: str
    objects: int
    report_km: float
    step_s: float
    runtime_s: float

 
class CatalogStatsResponse(BaseModel):
    """Catalog statistics response"""
    total_objects: int
    apogee_km: Dict
    perigee_km: Dict
    period_hours: Dict
    inclination_deg: Dict
 

# ============================================================================
# HEALTH & INFO ENDPOINTS
# ============================================================================
 
@app.get("/", response_class=HTMLResponse)
async def root():
    """Root endpoint: the built frontend when ORCA_STATIC_DIR is set, otherwise an API overview"""
    if STATIC_DIR:
        return FileResponse(Path(STATIC_DIR) / "index.html")
    return """
    <html>
        <head>
            <title>SSA API</title>
            <style>
                body { font-family: Arial; margin: 40px; background: #f5f5f5; }
                .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
                h1 { color: #333; border-bottom: 3px solid #2196F3; padding-bottom: 10px; }
                h2 { color: #2196F3; margin-top: 30px; }
                .endpoint { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3; }
                code { background: #eee; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
                a { color: #2196F3; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🛰️ Space Situational Awareness API</h1>
                <p>Production-grade SSA system for orbital mechanics, TLE data processing, and conjunction detection.</p>
                
                <h2>📚 Endpoints</h2>
                
                <div class="endpoint">
                    <strong>TLE Management</strong>
                    <ul>
                        <li><code>GET /api/tles</code> - List all TLE records</li>
                        <li><code>GET /api/tle/{norad_id}</code> - Get specific TLE</li>
                        <li><code>POST /api/update-tles</code> - Fetch latest from Celestrak</li>
                    </ul>
                </div>
                
                <div class="endpoint">
                    <strong>Orbital Propagation</strong>
                    <ul>
                        <li><code>GET /api/propagate/{norad_id}</code> - Propagate satellite state</li>
                        <li><code>GET /api/orbital-elements/{norad_id}</code> - Get orbital elements</li>
                    </ul>
                </div>
                
                <div class="endpoint">
                    <strong>Conjunction Detection</strong>
                    <ul>
                        <li><code>GET /api/conjunctions</code> - Search for conjunctions</li>
                        <li><code>GET /api/conjunction-pair/{id1}/{id2}</code> - Assess specific pair</li>
                    </ul>
                </div>
                
                <div class="endpoint">
                    <strong>Analytics</strong>
                    <ul>
                        <li><code>GET /api/statistics</code> - Catalog statistics</li>
                        <li><code>GET /api/export/conjunctions</code> - Export results (CSV/JSON)</li>
                    </ul>
                </div>
                
                <h2>📖 Full Documentation</h2>
                <p>Interactive API docs: <a href="/docs">/docs</a></p>
                <p>Alternative docs: <a href="/redoc">/redoc</a></p>
            </div>
        </body>
    </html>
    """
 
 
def _last_fetch_status():
    raw = db.get_cache("tle_fetch_status")
    try:
        return json.loads(raw) if raw else None
    except ValueError:
        return None


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": {
            "tles_count": db.count_tles(),
            # Set only by POST /api/update-tles; None means "never updated via the API"
            "last_update": db.get_cache("tle_update_time"),
            # Outcome of the most recent Celestrak fetch (ok | empty | rate_limited | not_found | http_error |
            # network_error), or None if no fetch has run since this field was added.
            "last_fetch": _last_fetch_status(),
        }
    }
 



 # ============================================================================
# TLE ENDPOINTS
# ============================================================================
 
@app.get("/api/tles", response_model=List[TLEResponse])
async def list_tles(limit: int = Query(100, ge=1, le=5000)):
    """List TLE records from database"""
    tles = db.get_all_tles(limit=limit)
    
    return [
        TLEResponse(
            norad_cat_id=tle.norad_cat_id,
            object_name=tle.object_name,
            epoch=tle.epoch.isoformat(),
            inclination=tle.inclination,
            raan=tle.raan,
            eccentricity=tle.eccentricity,
            arg_of_perigee=tle.arg_of_perigee,
            mean_anomaly=tle.mean_anomaly,
            mean_motion=tle.mean_motion
        )
        for tle in tles
    ]
 




@app.get("/api/tle/{norad_id}", response_model=TLEResponse)
async def get_tle(norad_id: str):
    """Get specific TLE by NORAD catalog ID"""
    tle = db.get_tle(norad_id)
    
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE {norad_id} not found")
    
    return TLEResponse(
        norad_cat_id=tle.norad_cat_id,
        object_name=tle.object_name,
        epoch=tle.epoch.isoformat(),
        inclination=tle.inclination,
        raan=tle.raan,
        eccentricity=tle.eccentricity,
        arg_of_perigee=tle.arg_of_perigee,
        mean_anomaly=tle.mean_anomaly,
        mean_motion=tle.mean_motion
    )
 
 
@app.post("/api/update-tles")
async def update_tles(background_tasks: BackgroundTasks):
    """Fetch latest TLEs from Celestrak (background task)"""

    # Celestrak answers 403 to repeated requests for the large "active" group, so refuse to start another
    # fetch inside the cooldown. The stamp is written now, not on completion, so double clicks are caught too.
    started = db.get_cache("tle_fetch_started")
    if started:
        try:
            wait = int(FETCH_COOLDOWN_S - (datetime.utcnow() - datetime.fromisoformat(started)).total_seconds())
        except ValueError:
            wait = 0
        if wait > 0:
            raise HTTPException(
                status_code=429,
                detail=f"A Celestrak fetch ran recently. Celestrak rate-limits repeated requests; try again in {-(-wait // 60)} minute(s).",
                headers={"Retry-After": str(wait)},
            )
    db.set_cache("tle_fetch_started", datetime.utcnow().isoformat())

    def fetch_and_store():
        logger.info("Fetching TLEs from Celestrak...")
        result = CelestrackClient.fetch_group_checked(group=TLE_GROUP)
        logger.info(f"Celestrak fetch: {result.status} ({len(result.tles)} TLE records)")
        # Record the outcome either way, so a refused fetch is visible in /health instead of looking like "nothing new".
        db.set_cache("tle_fetch_status", json.dumps({
            "status": result.status,
            "http_status": result.http_status,
            "detail": result.detail,
            "at": datetime.utcnow().isoformat(),
        }))
        if result.status != "ok":
            # Keep the existing catalog and its last_update: a failed fetch must not look like a refresh.
            return

        db.insert_batch(result.tles, replace=True)
        db.set_cache("tle_update_time", datetime.utcnow().isoformat())
        logger.info("TLE database updated")
    
    background_tasks.add_task(fetch_and_store)
    
    return {"status": "update started", "message": "TLEs will be fetched in the background"}
 
 
# ============================================================================
# ORBITAL PROPAGATION ENDPOINTS
# ============================================================================

@app.get("/api/propagate/{norad_id}", response_model=StateVectorResponse)
async def propagate_satellite(
    norad_id: str,
    hours_ahead: float = Query(24, ge=0, le=7*24)
):
    """Propagate satellite state vector"""
    tle = db.get_tle(norad_id)
    
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE {norad_id} not found")
    
    # Propagate
    oe = tle.to_orbital_element()
    prop = SGP4Propagator(oe)

    t_prop = oe.epoch + timedelta(hours=hours_ahead)
    try:
        state = prop.propagate(t_prop)
    except ValueError as e:  # SGP4 rejects the element set at that time, e.g. a decayed orbit
        raise HTTPException(status_code=422, detail=f"SGP4 cannot propagate {norad_id}: {e}")

    return StateVectorResponse(
        x=state.r[0],
        y=state.r[1],
        z=state.r[2],
        vx=state.v[0],
        vy=state.v[1],
        vz=state.v[2],
        altitude=state.altitude,
        speed=state.velocity_magnitude,
        range=state.position_magnitude
    )
 
 
PROPAGATOR_LABEL = "SGP4 (sgp4 library, TEME frame)"
EXPORT_MAX_EVENTS = 10_000
MAX_REQUESTED_IDS = 50
_RE_KM = 6371.0  # the Earth radius the engine uses (orbit_mech_engine.RE)


def _utc_now() -> datetime:
    """Naive UTC, matching the naive-UTC TLE epochs stored by parser_pipeline."""
    return datetime.utcnow()


def _sgp4_state(sat: Satrec, t: datetime):
    """
    (r_km, v_km_s) in the TEME frame at time t, or None when SGP4 reports an error (for example a
    decayed object or invalid elements). TEME is the frame the GMST rotation applies to, so it can be
    used directly as the ECI frame for placing an Earth-fixed globe.
    """
    jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)
    err, r, v = sat.sgp4(jd, fr)
    return (r, v) if err == 0 else None


class _SatCache:
    """
    Parsed Satrec objects for the whole catalog, rebuilt only when the stored catalog changes. Parsing 16k TLEs per
    request would dominate the response time; SatrecArray then propagates all of them in one vectorised call.
    """
    key: Optional[str] = None
    ids: List[str] = []
    names: List[str] = []
    types: List[str] = []
    epochs: Optional[np.ndarray] = None  # seconds since 1970, naive UTC
    index: Dict[str, int] = {}
    sats: Optional[SatrecArray] = None


def _sat_cache() -> type:
    key = f"{db.count_tles()}|{db.get_cache('tle_update_time')}"
    if _SatCache.key == key and _SatCache.sats is not None:
        return _SatCache
    ids, names, types, epochs, sats = [], [], [], [], []
    for tle in db.get_all_tles():
        try:
            sats.append(Satrec.twoline2rv(tle.line1, tle.line2))
        except Exception as exc:  # a malformed record must not take the whole catalog down
            logger.warning("sat cache: skipping %s: %s", tle.norad_cat_id, exc)
            continue
        ids.append(tle.norad_cat_id)
        names.append(tle.object_name)
        types.append(classify_object_type(tle.object_name))
        epochs.append((tle.epoch - datetime(1970, 1, 1)).total_seconds())
    _SatCache.ids, _SatCache.names, _SatCache.types = ids, names, types
    _SatCache.epochs = np.array(epochs)
    _SatCache.index = {i: k for k, i in enumerate(ids)}
    _SatCache.sats = SatrecArray(sats) if sats else None
    _SatCache.key = key
    return _SatCache


MAX_POSITIONS = 20000


@app.get("/api/positions")
def catalog_positions(
    limit: int = Query(500, ge=1, le=MAX_POSITIONS),
    hours_offset: float = Query(0, ge=0, le=7 * 24),
    ids: Optional[str] = Query(None, description="Comma-separated NORAD ids that are always included, even beyond `limit`"),
):
    """
    Bulk snapshot of catalog positions at (now + hours_offset), for map/globe rendering, using SGP4 (vectorised).

    Units: r in km (TEME/ECI), v in km/s, lat/lon in degrees, alt_km above the spherical Earth the engine uses.
    gmst_rad is the Earth rotation angle at `at`, so a client can place an Earth-fixed globe correctly inside the
    inertial frame. `ids` guarantees selected objects are present even when they fall outside the first `limit`
    rows; ids that do not exist are listed in unknown_ids. `type` is inferred from the object name.
    """
    at = _utc_now() + timedelta(hours=hours_offset)
    jd_midnight = _julian_day(at)
    cache = _sat_cache()
    if cache.sats is None:
        return {"at": at.isoformat(), "gmst_rad": _gmst(jd_midnight), "propagator": PROPAGATOR_LABEL,
                "skipped": 0, "unknown_ids": [], "objects": []}

    n = len(cache.ids)
    picked = list(range(min(limit, n)))
    seen = set(picked)
    unknown = []
    for rid in [i.strip() for i in (ids or "").split(",") if i.strip()][:MAX_REQUESTED_IDS]:
        k = cache.index.get(rid)
        if k is None:
            unknown.append(rid)
        elif k not in seen:
            picked.append(k)
            seen.add(k)

    jd, fr = jday(at.year, at.month, at.day, at.hour, at.minute, at.second + at.microsecond / 1e6)
    err, r_all, v_all = cache.sats.sgp4(np.array([jd]), np.array([fr]))
    idx = np.array(picked)
    ok = err[idx, 0] == 0
    sel = idx[ok]
    r = r_all[sel, 0, :]
    v = v_all[sel, 0, :]
    skipped = int((~ok).sum())

    theta = _gmst(jd_midnight)
    cos_t, sin_t = np.cos(theta), np.sin(theta)
    x_e = cos_t * r[:, 0] + sin_t * r[:, 1]
    y_e = -sin_t * r[:, 0] + cos_t * r[:, 1]
    radius = np.linalg.norm(r, axis=1)
    lon = np.degrees(np.arctan2(y_e, x_e))
    lat = np.degrees(np.arctan2(r[:, 2], np.hypot(x_e, y_e)))
    alt = radius - _RE_KM
    age_days = ((at - datetime(1970, 1, 1)).total_seconds() - cache.epochs[sel]) / 86400.0

    objects = [
        {
            "id": cache.ids[k],
            "name": cache.names[k],
            "type": cache.types[k],
            "r": [round(float(c), 3) for c in r[j]],
            "v": [round(float(c), 5) for c in v[j]],
            "lat": round(float(lat[j]), 4),
            "lon": round(float(lon[j]), 4),
            "alt_km": round(float(alt[j]), 3),
            "tle_age_days": round(float(age_days[j]), 4),
        }
        for j, k in enumerate(sel)
    ]
    return {
        "at": at.isoformat(),
        "gmst_rad": theta,
        "propagator": PROPAGATOR_LABEL,
        "skipped": skipped,
        "unknown_ids": unknown,
        "objects": objects,
    }


_summary_cache: Dict[str, object] = {}


@app.get("/api/catalog-summary")
def catalog_summary():
    """
    Counts over the WHOLE stored catalog (the browser only ever holds the first 5,000 objects): total, by object
    type (inferred from names: payload / rocket body / debris) and by orbit regime. Cached per catalog version.
    """
    key = f"{db.count_tles()}|{db.get_cache('tle_update_time')}"
    if _summary_cache.get("key") == key:
        return _summary_cache["value"]
    tles = db.get_all_tles()
    by_type = {t: 0 for t in OBJECT_TYPES}
    by_regime = {r: 0 for r in REGIMES}
    unclassified = 0
    for t in tles:
        by_type[classify_object_type(t.object_name)] += 1
        regime = classify_regime(t.mean_motion, t.eccentricity)
        if regime is None:
            unclassified += 1
        else:
            by_regime[regime] += 1
    value = {
        "total": len(tles),
        "by_type": by_type,
        "by_regime": by_regime,
        "regime_unclassified": unclassified,
        "type_basis": "inferred from object names; the catalog stores no status, so active vs inactive is unknown",
    }
    _summary_cache["key"] = key
    _summary_cache["value"] = value
    return value


_distributions_cache: Dict[str, object] = {}


@app.get("/api/catalog-distributions")
def catalog_distributions():
    """
    Per-object columns (name, epoch, inclination, eccentricity, mean motion) for the WHOLE stored catalog, so the
    Analytics charts are not drawn from the first 5,000 rows only. Raw values, not bins: the browser derives and bins
    them with its tested lib code. Cached per catalog version, like /api/catalog-summary.
    """
    key = f"{db.count_tles()}|{db.get_cache('tle_update_time')}"
    if _distributions_cache.get("key") == key:
        return _distributions_cache["value"]
    value = catalog_columns(db.get_all_tles())
    _distributions_cache["key"] = key
    _distributions_cache["value"] = value
    return value


@app.get("/api/orbit-path/{norad_id}")
def orbit_path(
    norad_id: str,
    points: int = Query(180, ge=16, le=720),
    hours_offset: float = Query(0, ge=0, le=7 * 24),
):
    """One full orbital period of positions (km, TEME/ECI) by SGP4, sampled evenly from now + hours_offset."""
    tle = db.get_tle(norad_id)
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE {norad_id} not found")

    sat = Satrec.twoline2rv(tle.line1, tle.line2)
    if not sat.no_kozai or sat.no_kozai <= 0:
        raise HTTPException(status_code=422, detail=f"TLE {norad_id} has no usable mean motion")
    period_s = 2.0 * np.pi / sat.no_kozai * 60.0  # no_kozai is rad/min
    start = _utc_now() + timedelta(hours=hours_offset)
    path = []
    for k in range(points + 1):  # +1 closes the loop
        state = _sgp4_state(sat, start + timedelta(seconds=period_s * k / points))
        if state is not None:
            path.append([float(c) for c in state[0]])
    if len(path) < points // 2:
        raise HTTPException(status_code=422, detail=f"SGP4 cannot propagate {norad_id} over this window (decayed or invalid elements)")
    return {
        "id": tle.norad_cat_id,
        "name": tle.object_name,
        "at": start.isoformat(),
        "period_s": float(period_s),
        "propagator": PROPAGATOR_LABEL,
        "path": path,
    }


@app.get("/api/search", response_model=List[TLEResponse])
def search_objects(
    q: str = Query(..., min_length=1, max_length=64, description="NORAD id or part of an object name"),
    limit: int = Query(20, ge=1, le=100),
):
    """Find objects by NORAD id or name across the WHOLE stored catalog, best matches first."""
    return [
        TLEResponse(
            norad_cat_id=t.norad_cat_id,
            object_name=t.object_name,
            epoch=t.epoch.isoformat(),
            inclination=t.inclination,
            raan=t.raan,
            eccentricity=t.eccentricity,
            arg_of_perigee=t.arg_of_perigee,
            mean_anomaly=t.mean_anomaly,
            mean_motion=t.mean_motion,
        )
        for t in db.search_tles(q, limit=limit)
    ]


@app.get("/api/orbital-elements/{norad_id}", response_model=OrbitalElementResponse)
async def get_orbital_elements(norad_id: str):
    """Get computed orbital elements"""
    tle = db.get_tle(norad_id)
    
    if not tle:
        raise HTTPException(status_code=404, detail=f"TLE {norad_id} not found")
    
    oe = tle.to_orbital_element()
    apogee, perigee = OrbitalAnalytics.compute_apogee_perigee(oe)
    
    import math
    return OrbitalElementResponse(
        a=oe.a,
        e=oe.e,
        i=math.degrees(oe.i),
        omega=math.degrees(oe.omega),
        Omega=math.degrees(oe.Omega),
        M=math.degrees(oe.M),
        period_hours=OrbitalAnalytics.orbital_period_hours(oe),
        apogee_km=apogee,
        perigee_km=perigee
    )
 


  
# ============================================================================
# CONJUNCTION DETECTION ENDPOINTS
# ============================================================================
 
@app.get("/api/conjunctions/method")
def conjunction_method():
    """How conjunctions are found and scored, and the limits of the result (shown next to the numbers)."""
    return method_description()


@app.get("/api/conjunctions", response_model=ConjunctionSearchResponse)
def search_conjunctions(  # sync on purpose: runs in FastAPI's threadpool so /health stays responsive during a search
    time_horizon_days: int = Query(1, ge=1, le=7),
    limit: int = Query(100, ge=1, le=1000),
    search_step_hours: Optional[float] = Query(None, description="Ignored (kept for old clients): the step is "
                                                                 "fixed so screening cannot miss an approach"),
):
    """
    Every approach closer than the report distance (10 km) in the horizon, most probable first. Returns the
    first `limit` events and counts over all of them. Runtime grows with catalog size and horizon
    (about 1.5 min per day of horizon for ~16,000 objects on a laptop).
    """

    # Load catalog
    all_tles = db.get_all_tles()
    
    if len(all_tles) < 2:
        raise HTTPException(status_code=400, detail="Insufficient TLEs in database")
    
    orbital_elements = _orbital_elements(all_tles)
    
    detector = ConjunctionDetector(time_horizon_days=time_horizon_days)
    search = ConjunctionSearch(detector)
    started = datetime.utcnow()
    conjunctions = search.search_catalog(orbital_elements, top=limit)
    stats = search.last_stats
    window_start, window_end = search.last_window

    return ConjunctionSearchResponse(
        events=[
            ConjunctionResponse(
                sat1_id=c.sat1_id,
                sat1_name=c.sat1_name,
                sat2_id=c.sat2_id,
                sat2_name=c.sat2_name,
                tca=c.tca.isoformat(),
                min_distance_km=c.min_distance,
                probability_of_collision=c.probability_of_collision,
                risk_level=c.risk_level,
                relative_velocity_kms=c.relative_velocity_kms,
                tle_age_days=c.tle_age_days,
                uncertainty_km=c.uncertainty_km,
                long_encounter=c.long_encounter,
            )
            for c in conjunctions
        ],
        total_events=stats.get("total_events", 0),
        tier_counts=stats.get("tier_counts", {}),
        long_encounters=stats.get("long_encounters", 0),
        window_start=window_start.isoformat(),
        window_end=window_end.isoformat(),
        objects=len(orbital_elements),
        report_km=detector.report_km,
        step_s=detector.step_s,
        runtime_s=(datetime.utcnow() - started).total_seconds(),
    )

 
@app.get("/api/conjunction-pair/{id1}/{id2}")
async def assess_conjunction_pair(id1: str, id2: str):
    """Assess collision risk for specific satellite pair"""
    
    tle1 = db.get_tle(id1)
    tle2 = db.get_tle(id2)
    
    if not tle1 or not tle2:
        raise HTTPException(status_code=404, detail="One or both TLEs not found")
    
    detector = ConjunctionDetector(time_horizon_days=7)

    event = detector.assess_pair(
        tle1.to_orbital_element(),
        tle2.to_orbital_element(),
        tle1.object_name,
        tle2.object_name,
        id1, id2
    )
    
    if not event:
        return {"status": "no_risk",
                "message": f"No approach closer than {detector.report_km:g} km in the next 7 days"}
    
    return event.to_dict()



# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================
 
@app.get("/api/statistics")
async def catalog_statistics():
    """Get aggregate catalog statistics"""
    
    all_tles = db.get_all_tles()
    
    orbital_elements = _orbital_elements(all_tles)
    
    stats = OrbitalAnalytics.catalog_statistics(orbital_elements)
    
    return {
        "computed_at": datetime.utcnow().isoformat(),
        "statistics": stats
    }
 


 # ============================================================================
# EXPORT ENDPOINTS
# ============================================================================
 
@app.get("/api/export/conjunctions")
def export_conjunctions(format: str = Query("json", regex="^(json|csv)$")):
    """Export conjunction results: 1-day horizon from now, the EXPORT_MAX_EVENTS most probable events.

    A plain `def`, not `async def`: the catalog search is minutes of CPU work, so FastAPI runs it in its thread
    pool instead of blocking the event loop. The file goes in a fresh temp directory (portable, and two
    simultaneous exports cannot overwrite each other) that is removed once the response has been sent.
    """
    all_tles = db.get_all_tles()

    orbital_elements = _orbital_elements(all_tles)

    detector = ConjunctionDetector(time_horizon_days=1)
    search = ConjunctionSearch(detector)
    conjunctions = search.search_catalog(orbital_elements, top=EXPORT_MAX_EVENTS)

    output_dir = Path(tempfile.mkdtemp(prefix="orca-export-"))
    if format == "json":
        filename = output_dir / "conjunctions.json"
        ExportUtils.export_conjunctions_json(conjunctions, str(filename))
        media_type = "application/json"
    else:
        filename = output_dir / "conjunctions.csv"
        ExportUtils.export_conjunctions_csv(conjunctions, str(filename))
        media_type = "text/csv"

    return FileResponse(
        path=filename,
        media_type=media_type,
        filename=filename.name,
        background=BackgroundTask(shutil.rmtree, output_dir, ignore_errors=True),
    )
 
 
# Mounted last so every API route above wins. Static files are public: they are the sign-in page itself, and
# the app-level auth dependency covers routes, not mounts.
if STATIC_DIR:
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")


# ============================================================================
# EXAMPLE USAGE
# ============================================================================
 
if __name__ == "__main__":
    import uvicorn
    
    # Initialize database with sample data if empty
    if db.count_tles() == 0:
        print("Database empty. Fetching initial TLE data...")
        tles = CelestrackClient.fetch_group(group=TLE_GROUP)
        db.insert_batch(tles)
        print(f"Loaded {len(tles)} TLEs")
    
    # Run server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
 






