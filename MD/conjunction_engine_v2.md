# Conjunction engine v2 (2026-10-15)

> What changed in ORCA's conjunction search, why, how it was checked, and what it still cannot do.
> The research behind it is in [research_paper_brief.md](research_paper_brief.md), Section 10.

## 1. Why

The benchmark study measured ORCA as built and found four faults. Together they meant the app reported about 0.1 % of the close approaches under 10 km that actually happen in a day.

| Stage | ORCA as built | Measured effect |
|---|---|---|
| Propagation | `SGP4Propagator` was two-body + drag, no J2 | ~300 km off SGP4 after 24 h |
| Screening | Positions every 1 h (UI default 2 h), 100 km radius | ~1 % of encounters under 10 km caught during their pass |
| Refinement | One bounded Brent search over ±6 h | Found the right approach for 5–6 % of pairs |
| Collision probability | 2D formula off by exactly 1/α² | Every CRITICAL/HIGH label came from the formula, not the encounter |
| Uncertainty | Isotropic 0.5 km + 2 km/day | ~3× too wide in-track and ~35× too wide radially for fresh TLEs |

**The old engine is preserved, so the paper stays reproducible:**
- Tag `orca-as-built-2026-10-14` (eb53f1c) marks it.
- Verbatim copies live in `benchmarks/legacy/`, and every benchmark imports those copies.

## 2. What it does now

`conjunction_detection.py`, with the method text served by `GET /api/conjunctions/method`:

1. **Propagation:** SGP4 (sgp4 package). `orbit_mech_engine.SGP4Propagator` is now real SGP4, built from the TLE's mean elements with the same `sgp4init` call as `twoline2rv`. The old model remains as `TwoBodyDragPropagator`.
2. **Screening:** every object is propagated every 20 s. At each step a KD-tree finds the pairs within R = 10 km + v_max × 10 s, where v_max is twice the fastest perigee speed in the catalog. An approach closer than 10 km therefore cannot fall between two steps.
3. **Closest approach:** a parabola through d² at the three samples around each grid minimum gives the time. Then exact SGP4 states are computed at that time, with one range-rate correction.
4. **Collision probability:** Foster's 2D integral in the encounter plane, vectorised with Gauss–Legendre quadrature. Adaptive quadrature is used when the hard-body radius is not small relative to the uncertainty.
5. **Uncertainty:** each object gets a radial / in-track / cross-track σ that depends on its TLE age.
   - The σ values were measured from successive public TLEs (LEO, three snapshots on 2026-10-14), with Starlink kept separate.
   - They are floored at ESA's published at-epoch TLE uncertainties (0.102 / 0.471 / 0.126 km).
   - Constants and provenance are in `CovarianceModel`.
6. **Tiers:** unchanged thresholds (1e-4 / 1e-5 / 1e-6 / 1e-7). The 1e-4 value matches NASA's mitigation threshold.
7. **Long encounters:** relative speed below 0.1 km/s.
   - The 2D probability is unreliable there; it can be about 6× too low.
   - These events are flagged, and only their closest approach per pair is kept.

## 3. Checks

- **Against the benchmark reference** (Exp 2b, 3 seeds, 2,000 objects, 24 h): every encounter under 10 km is found, except slow pairs deduplicated by design and one at the very first grid step. No extra events appear. Miss distances agree to a median of 0.5 mm (max 6 cm), and TCAs to a median of 0.5 ms.
- **SGP4Propagator vs `Satrec.twoline2rv`:** under 1 mm difference from 0 to 168 h.
- **Vectorised Pc vs adaptive quadrature:** agreement to 5 decimal places, including misses many σ away.
- **Tests:** `tests/test_conjunction_engine.py` covers a planted fast crossing, a planted slow encounter, pair vs catalog agreement, Pc accuracy, uncertainty floor and growth, and tiers. All 88 Python tests and 89 frontend tests pass.
- **Full catalog** (15,970 objects, next 24 h, laptop):
  - 426,421 approaches under 10 km found in about 1.5–2 min.
  - Tiers: 30 HIGH, 803 MEDIUM, ~58,800 LOW, ~366,800 NEGLIGIBLE; 415 long encounters.

## 4. API and UI changes

**`GET /api/conjunctions`:**
- Returns `{events, total_events, tier_counts, long_encounters, window_start, window_end, objects, report_km, step_s, runtime_s}` instead of a bare list.
- The horizon is now 1–7 days, default 1 (was 1–30).
- `search_step_hours` is accepted and ignored.
- Each event gains `tle_age_days`, `uncertainty_km` and `long_encounter`.

**Other endpoints:**
- New `GET /api/conjunctions/method`: the method and its limits, as text for the UI.
- `GET /api/conjunction-pair`: the same engine, 7-day horizon, closest approach under 10 km.
- `GET /api/propagate`: real SGP4. Returns 422 when SGP4 refuses an element set (e.g. decayed).
- `GET /api/export/conjunctions`: 1-day horizon, top 10,000 events.

**Conjunctions view:**
- The step control is gone and the horizon is capped at 7 days. A runtime estimate is shown.
- A "How this list is made, and what it cannot tell you" panel shows the method and limits from the API.
- Tier counts cover *every* approach found, and the table headline says "Top N of M".
- The table gains uncertainty and TLE-age columns, plus a "Long" badge.
- The detail cards show uncertainty, TLE age and relative speed, a long-encounter warning, and an honest probability note.
- The pair card also says when the pair's closest approach in the next 7 days is a different pass.

## 5. Still true, and stated in the UI

- TLEs carry no covariance. Every Pc and tier is conditional on the uncertainty model.
- NASA does not recommend TLE-based conjunction assessment for operations.
- The uncertainty was measured from one day of snapshots and only for LEO. TLE-to-TLE comparison underestimates error near epoch, which is why the ESA floor is there.
- Runtime is minutes, not seconds: about 1.5–2 min per day of horizon for the full catalog.

## 6. Owner's documents that are now stale

These have uncommitted edits, so I left them unchanged. They should be updated:
- **ORCA_MASTER.md §3:** "SGP4Propagator … is two-body motion …"; "Pc uses an assumed covariance: sigma = 0.5 km + 2.0 km/day".
- **README / ARCHITECTURE:** the risk model and screening description (1 h / 100 km, ±6 h refinement).
- **DECISIONS.md:** a decision entry for this change. Suggested text: Section 1–3 of this file.
- **deployment.md:** the hosted VM (1 GB, small `stations` group) is unaffected in size, but `/api/conjunctions` changed shape. Deploy the backend and frontend together.
