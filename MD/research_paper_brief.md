# Research Brief (v2): Benchmarking Algorithmic Choices in TLE-Based Conjunction Assessment

> **Version 2, 2026-10-14.** v1 was a handoff written without access to the ORCA code. v2 checks it against the code, the measurements already in `MD/DECISIONS.md`, and the capstone proposal in `MD/LEO_Conjunction_Project_Context.md`, then corrects it. Section 1 lists what v1 got wrong. Everything after it replaces v1.
>
> Labels used below: **[CODE]** read from the repo, **[MEASURED]** a number produced by a script in the repo (the script is named), **[PROPOSAL]** from the approved capstone proposal, **[PLAN]** a proposal for this paper that is not done yet, **[VERIFY]** a citation or external fact that must be checked at its source before it goes into the paper.

---

## 0. Rules for anyone continuing this work (human or LLM)

- Do not invent results, dataset statistics, citations or performance numbers. Only numbers tagged [MEASURED] exist.
- A proposed experiment is not a run experiment.
- Check every citation at its source. Every reference in this file is [VERIFY] unless it says otherwise.
- **When a document and the code disagree, trust the code** (the same rule as `MD/ORCA_MASTER.md`).
- Do not change production modules (`conjunction_detection.py`, `orbit_mech_engine.py`) to fit the paper without the owner's decision. Benchmark code goes in `benchmarks/`.
- Keep the paper to eight pages. Organise it like the example paper (Section 9).

---

## 1. What v1 got wrong or left out

| # | v1 said | What is actually true | Consequence |
|---|---|---|---|
| 1 | ORCA is a framework still to be built; implementation details are unconfirmed. | ORCA exists and runs [CODE]: Celestrak TLEs → SQLite → propagate → KD-tree screen → TCA refinement → Pc → five risk tiers → FastAPI → React. Apache-2.0 licence. Hosted at orca-vitap.vercel.app. | Most of v1's "unconfirmed implementation" list can be answered from the code (Section 3). The paper benchmarks a real system. |
| 2 | "SGP4 is the primary propagator; Two-Body is the baseline." | The conjunction pipeline uses a class **named** `SGP4Propagator` that is really **two-body motion plus an exponential drag term, with no J2** [CODE]. Its docstring wrongly claims J2/J3, drag and lunisolar terms. The real `sgp4` package is used only for the globe (`/api/positions`, `/api/orbit-path`). | Today ORCA's production path *is* the baseline. Real SGP4 still has to be wired into the benchmark. |
| 3 | Propagation error has not been measured. | Already measured against the `sgp4` package on 600 real TLEs [MEASURED, `tests/measure_propagator_error.py`]: median **16.6 km at epoch**, 80 km at 6 h, 297 km at 24 h, 1,277 km at 72 h. | Experiment 1 has a first result. But "error" here means **difference from SGP4**, not error against the true orbit (row 4). |
| 4 | Comparing Two-Body with SGP4 measures accuracy. | TLEs hold SGP4-specific *mean* elements. Feeding them to a two-body propagator is a model mismatch, which is why the error is already 16.6 km at epoch. Two-Body vs SGP4 measures **model inconsistency**, not accuracy. | A reference independent of the propagator is needed (Section 4.1): a later TLE of the same object (TLE-to-TLE consistency) and, for a few objects, a precise ephemeris. Add a fair middle tier: two-body + J2 secular rates. |
| 5 | KD-tree might miss pairs that brute force finds, so brute force is the correctness reference for KD-tree. | `cKDTree.query_pairs(r)` is an **exact** fixed-radius search. At the same time step and radius it returns *exactly* the brute-force pair set [CODE]. | KD-tree vs brute force is a **runtime-only** comparison. Equal candidate sets are a correctness check (a unit test), not a hypothesis. "Candidate reduction" belongs to the threshold, not the method. |
| 6 | (not mentioned) | ORCA screens **snapshots on a 1-hour grid** with a 100 km radius [CODE]. A head-on LEO pass at ~14 km/s stays inside 100 km for about 14 s, so the chance a 1-hour snapshot catches it is ~2·100/(14·3600) ≈ **0.4 %**. Brute force and KD-tree share this blind spot. | The real screening research question is **recall versus time step and threshold**, measured against a dense-time reference. That is also what the proposal promised (threshold sensitivity, filter trade-off). This is the strongest new experiment. |
| 7 | Discrete search and Brent are two alternative TCA methods. | ORCA already does both [CODE]: a coarse 1 h grid, then `scipy.optimize.minimize_scalar(method='bounded')` (Brent's bounded minimiser) over ±6 h. The separation function has many local minima over ±6 h (two LEO orbits approach roughly twice per revolution, ~every 45 min), so the bounded search can settle on a minimum that is not the closest one. | The fair comparison is: **coarse grid + local refinement** (properly bracketed, e.g. Brent root-finding on range-rate between sign changes) versus **fine grid only**, at matched cost, against a high-precision reference TCA. Also report how often the ±6 h search lands on the wrong minimum. |
| 8 | Monte Carlo with 1,000–100,000 samples. | For a probability *p*, relative standard error ≈ √((1−p)/(p·N)). At p = 1e-6 a 10 % error needs ~**1e8** samples. With 1e5 samples, any Pc below ~1e-5 mostly comes out as zero. | Report MC with confidence intervals (Clopper-Pearson). Choose N from the target Pc, or use high-Pc scenarios and say so. The v1 sample counts can only resolve Pc ≳ 1e-3. |
| 9 | Foster vs Monte Carlo will reveal differences between the methods. | With the same 2D Gaussian, short-encounter assumptions, a 2D MC simply converges to Foster. The difference is numerical noise, not a finding. | The meaningful MC is **3D, with propagated (non-linear) motion**. It tests the short-encounter assumption, which fails for **slow encounters**. ORCA finds many of those: in the exported top-100 list, 21 % have relative velocity < 0.1 km/s, 85 of 100 are Starlink–Starlink [MEASURED, `frontend/public/orca-conjunctions-2026-10-02T21-24-22.csv`; note this is a top-by-Pc cut, not a random sample]. |
| 10 | ORCA computes Pc with an unspecified method; "Foster" is the analytical baseline. | ORCA calls its method "Alfano (2005) 2D", but the formula is **neither Alfano nor correct** [CODE + MEASURED, `benchmarks/legacy_pc_check.py`]. In the isotropic case it equals the correct small-object result **divided by α²** (α = miss / σ). Close approaches (α = 0.1) are **overstated ~100×**; distant ones (α = 5) are **understated ~25×**. It is only right at α ≈ 1. | Every CRITICAL/HIGH tier in the app is affected. The benchmark needs a correct reference: Foster 2D integration, exact here because the isotropic case has a closed form (Rician / non-central χ²). Fixing production is the owner's decision (`MD/TASKS.md`). |
| 11 | Covariance assumptions are unknown. | ORCA assumes an **isotropic** σ = 0.5 km + 2.0 km/day × TLE age, the same for both objects, summed [CODE]. Real TLE error is strongly anisotropic: along-track dominates [VERIFY: Flohrer, Krag & Klinkrad 2008, AMOS]. | Isotropy hides the effect of encounter geometry on Pc. Add an anisotropic radial/in-track/cross-track (RIC) covariance, ideally estimated from TLE-to-TLE differences on our own catalog, and run Pc sensitivity to it. |
| 12 | Risk categories by miss distance: >1 km safe, 100–500 m borderline, <100 m high (with a gap). | ORCA already classifies by **Pc**: CRITICAL > 1e-4, HIGH > 1e-5, MEDIUM > 1e-6, LOW > 1e-7 [CODE]. With propagation differences of tens to hundreds of km, a 100 m miss-distance class cannot be resolved anyway. | Drop the miss-distance tiers. Use Pc tiers, and keep miss distance as the comparison ranking. "Distance ranking vs Pc ranking disagreement" is a **proposal objective** [PROPOSAL] and makes a better end-to-end result than v1's "classification agreement". |
| 13 | Orbital regimes LEO–LEO and LEO–GEO. | LEO and GEO orbits do not intersect, so an apogee–perigee filter removes almost every LEO–GEO pair (only GTO-type objects cross both). The catalog in use is Celestrak `active`: 15,968 objects, **payloads only, no debris** [MEASURED 2026-10-03]. | Stratify by **encounter geometry** (head-on vs co-planar, i.e. relative velocity) and **shell density**, as the proposal does, not by LEO–GEO. Treat "no debris" as a stated limitation, or add a debris group. |
| 14 | Catalog sizes 1k–50k. | `active` holds ~16k objects. 20k–50k needs a fuller catalog (Space-Track or extra Celestrak groups). The hosted VM is 1 GB RAM. | Sizes: 1k, 2k, 4k, 8k, 16k (all of `active`). Larger only if a fuller catalog is fetched. Run experiments locally, not on the VM. |
| 15 | Prediction horizon measured from "now". | Catalog search starts at *now*, but TLEs are days old, so the real propagation span is TLE age + forecast offset [CODE]. | Measure horizons **from TLE epoch** (as the existing measurement does) and report TLE age. |
| 16 | No prior literature or framing given; novelty unknown. | The proposal and its literature review already position the work [PROPOSAL]: SOCRATES (public, one-vs-all, since 2004), Stevenson et al. 2023 (closest work, uses non-public high-fidelity data), and "Gap 2": nobody measures what screening quality is lost by relying on public TLEs. | Build the gap on this. Rows 6 and 10 strengthen it: the screening recall loss and the Pc-formula error are both measurable on public data. |
| 17 | Runtime comparisons between algorithms. | ORCA's propagator is pure Python, one call per time step. The `sgp4` package is compiled C++ and vectorised (`SatrecArray`). | Runtime differences mix the algorithm with the implementation. Say so, or compare at equal implementation level. |

v1 points that **remain correct**: TLEs carry no covariance. Monte Carlo is not ground truth. Do not report precision/recall/F1 without a defensible reference. Report runtimes as mean ± sd over repeated runs. Keep the scope tight.

---

## 2. Research objective (revised)

> Using only public TLE data and an open pipeline (ORCA), measure how each algorithmic choice in TLE-based conjunction assessment changes what the pipeline reports: which encounters it finds, when and how close they are, and how risky it says they are. Report each choice's computational cost.

The contribution is a **measured, reproducible accounting of where accuracy is lost** in a public-data conjunction pipeline, stage by stage. It is not a new algorithm. Rows 3, 6, 9 and 10 of Section 1 show that the losses are large and measurable, which is a stronger claim than "we compared standard methods" (v1's novelty risk).

Working title [PLAN]: **Where Accuracy Is Lost: A Stage-by-Stage Benchmark of TLE-Based Conjunction Assessment**
Alternative: **ORCA: An Open Benchmark of Algorithmic Choices in TLE-Based Conjunction Assessment**
ORCA has no expansion in any project document; do not invent one.

---

## 3. The system as built (answers v1's "unconfirmed" list)

| Item | Fact [CODE] | Where |
|---|---|---|
| Data | Celestrak GP, `GROUP=active` by default (`ORCA_TLE_GROUP`), stored in SQLite `ssa_data.db` | `parser_pipeline.py` |
| Catalog | 15,968 objects on 2026-10-03 [MEASURED] | `MD/external_research.md` |
| Propagator (conjunctions) | two-body + exp(−B*·dt/1e5) decay, Newton-Raphson Kepler solve, no J2 | `orbit_mech_engine.py:240` |
| Propagator (globe) | `sgp4` package, TEME frame | `api_server.py` |
| Frame / units | ECI (effectively TEME, since elements come from TLEs), km, km/s, rad/s | `MD/ORCA_MASTER.md` units contract |
| Screening | positions on a 1 h grid over a 7-day horizon; `cKDTree.query_pairs(100 km)` per time step; brute-force fallback if SciPy is missing; keeps the closest grid time per pair | `conjunction_detection.py:410-448` |
| TCA | Brent bounded minimisation of \|r₁−r₂\| over ±6 h around the grid time | `conjunction_detection.py:245` |
| Covariance | isotropic, σ = 0.5 km + 2 km/day × \|t − epoch\|, per object, summed | `conjunction_detection.py:96` |
| Hard-body radius | by name keyword: Starlink 5.65 m, OneWeb 4.0 m, Iridium 3.9 m, CubeSat 0.5 m, debris 0.1 m, other 3.0 m; summed | `conjunction_detection.py:71` |
| Pc | mislabelled "Alfano 2005"; incorrect (Section 1, row 10) | `conjunction_detection.py:300` |
| Risk tiers | Pc > 1e-4 / 1e-5 / 1e-6 / 1e-7 → CRITICAL / HIGH / MEDIUM / LOW, else NEGLIGIBLE; events with Pc < 1e-12 dropped | `conjunction_detection.py:233` |
| Runtime | 1-day search over 15,968 objects took 19 s [MEASURED 2026-10-03, single run, hardware not recorded] | `MD/DECISIONS.md` |
| Parallelism | ProcessPool for pair refinement | `conjunction_detection.py:475` |

---

## 4. Experiments (revised: four core + one end-to-end)

Each experiment varies **one stage** and holds the others at a fixed reference configuration.

### Exp 1: Propagation fidelity vs horizon

- **Methods:** (a) ORCA engine (two-body + drag), (b) two-body + J2 secular rates [PLAN, to implement], (c) SGP4 (`sgp4` package).
- **References:**
  - R1: SGP4 itself. Measures model inconsistency; already done for (a).
  - R2: TLE-to-TLE consistency. Propagate TLE *k* to the epoch of a later TLE *k+1* of the same object and compare with TLE *k+1* evaluated at its own epoch. This is a standard proxy, but it is not truth either.
  - R3 (optional): a precise ephemeris for a handful of objects, e.g. ILRS CPF predictions for laser-ranging satellites [VERIFY availability].
- **Horizons (from TLE epoch):** 0, 1, 6, 12, 24, 48, 72 h.
- **Metrics:** position error; split into radial, in-track and cross-track; median and 90th percentile; runtime per state.
- **Strata:** altitude band, eccentricity, B* and TLE age.
- **Also:** the effect on TCA and miss distance for a fixed set of encounters.

### Exp 2: Screening: runtime and recall

- **2a, runtime:** brute force vs KD-tree at an identical time step and radius. Catalog sizes 1k, 2k, 4k, 8k, 16k, random subsets with a fixed seed, ≥ 5 repeats. Assert that the two candidate sets are identical (correctness check). Metrics: runtime, pair evaluations, speedup.
- **2b, recall (the new experiment):** the same objects screened at time steps of 60, 10, 1 min and 10 s, and radii of 10–200 km. Reference: a dense-time search with a range-rate root-find on every pair surviving an apogee–perigee filter, which gives the true closest approaches below a threshold. Metrics: **recall** of reference encounters with miss distance below 5 / 10 km, candidate count, runtime. Split recall by relative velocity. Report the analytic sufficient condition: radius ≥ d + v_rel·Δt/2.
- **Optional:** add the classic filter chain (apogee–perigee, orbit path, time window [VERIFY: Hoots, Crawford & Roehrich 1984]) as the proposal planned [PROPOSAL].

### Exp 3: TCA estimation

- **Methods:**
  - (a) fine grid only (Δt = 1, 5, 10, 30, 60 s)
  - (b) ORCA's coarse grid + bounded Brent over ±6 h, as built
  - (c) coarse grid + bracketed Brent root-find on range-rate ḋ = (Δr·Δv)/|Δr|, refining only intervals where ḋ changes sign [VERIFY: Alfano & Negron 1993]
- **Reference:** (c) with a tight tolerance (e.g. 1e-6 s) on the same propagator. Using the same propagator isolates TCA error from propagation error.
- **Metrics:** TCA error (s), miss-distance error (m), propagator calls, runtime, and the share of cases converging to the wrong local minimum.
- **Strata:** fast (head-on) vs slow (co-orbital) encounters.

### Exp 4: Collision probability

- **Methods:**
  - (a) ORCA legacy formula
  - (b) Foster 2D: numerical integration of the 2D Gaussian over the hard-body disc in the encounter plane [VERIFY: Foster & Estes 1992]
  - (c) isotropic closed form via the non-central χ² distribution; this is the exactness check for (b)
  - (d) 2D Monte Carlo with Clopper-Pearson intervals
  - (e) [PLAN] 3D Monte Carlo: sample both states at TCA − Δ, propagate, and count hard-body penetrations. This tests the short-encounter assumption.
- **Covariance:** (i) ORCA isotropic; (ii) anisotropic RIC with in-track dominant, values estimated from Exp 1 R2 residuals.
- **Scenarios:** use the test set in Alfano 2009, *Satellite Conjunction Monte Carlo Analysis* [VERIFY: AAS 09-233] and NASA CARA's open-source Pc tools [VERIFY: github.com/nasa/CARA_Analysis_Tools] for validated cases. Add real ORCA encounters stratified by relative velocity.
- **Metrics:** Pc; log₁₀ ratio to Foster; MC confidence-interval width; runtime; tier changes.

### Exp 5: End-to-end: which events, which ranking

- Run the full pipeline under (A) ORCA as built and (B) the corrected configuration (SGP4 + recall-adequate screening + bracketed TCA + Foster with anisotropic covariance) over the same catalog and window.
- **Metrics:** events found by A only / B only / both; tier confusion between A and B (agreement, not accuracy); Kendall τ between miss-distance ranking and Pc ranking [PROPOSAL objective]; total runtime.
- Do not call B "optimised" or "correct" overall. Call it the corrected configuration, and say what each correction is relative to.

**Hypotheses (testable, no built-in result):**
- H1: KD-tree and brute force return identical candidate sets; KD-tree runtime grows more slowly with catalog size.
- H2: Screening recall depends on time step and relative velocity; a 1 h step misses a substantial share of fast encounters.
- H3: The difference between propagators grows with horizon and changes TCA and miss distance by more than the screening threshold beyond some horizon.
- H4: Legacy Pc differs from Foster by a factor that depends on α; 2D MC agrees with Foster within its confidence interval; 3D MC departs from Foster at low relative velocity.
- H5: Pc ranking and miss-distance ranking disagree, and the disagreement grows with spread in relative velocity and covariance.

---

## 5. Reproducibility protocol [PLAN]

- **Frozen catalog:** keep one TLE snapshot (file plus retrieval timestamp) for all experiments, and a second, later snapshot for Exp 1 R2. Do not refetch mid-study.
- Fixed random seeds; record versions (Python, numpy, scipy, sgp4), CPU, RAM and OS.
- Runtimes: warm-up run, then ≥ 5 repeats, mean ± sd. Single process unless parallelism is the variable.
- Every table and figure is produced by a script in `benchmarks/` that writes CSV to `benchmarks/results/`. The paper cites only those CSVs.

## 6. Paper structure (follows the example paper's organisation)

I. Introduction (background, problem, gap, contributions) · II. Preliminaries (TLE/SGP4, encounter geometry and the encounter plane, Pc, spatial indexing) · III. Literature Review (propagation, screening, TCA, Pc, public SSA tools such as SOCRATES and Stevenson 2023, the gap) · IV. Methodology (ORCA, dataset, the five experiments, metrics, protocol) · V. Results and Discussion · VI. Conclusion and Future Work · References.

**Page budget (8 pages):** I 0.8 · II 0.6 · III 0.8 · IV 1.5 · V 2.6 · VI 0.4 · references to fit the template.

**Tables:** T1 dataset and environment · T2 experiment design (all five experiments) · T3 screening runtime and recall · T4 Pc comparison (legacy / Foster / MC) on the validated cases · T5 end-to-end A vs B.

**Figures:** F1 pipeline with swap points · F2 propagation error vs horizon (RIC split) · F3 recall vs time step by relative-velocity band · F4 legacy-Pc / Foster ratio vs α · F5 MC convergence with CI · (F6 accuracy vs runtime, if space allows).

---

## 7. Limitations to state in the paper

No covariance in TLEs (assumed or estimated uncertainty only). Every reference used is itself imperfect (SGP4, later TLEs). Payload-only catalog, unless debris is added. Runtimes depend on implementation and hardware. Results are for one catalog snapshot and window. ORCA is educational, not operational.

## 8. Still open (needs the team)

1. Target conference, template, and whether references count in the 8 pages.
2. Whether the production Pc bug and propagator are fixed in ORCA before the paper (that changes what "ORCA as built" means in Exp 5), or documented as found.
3. Whether to fetch debris / a fuller catalog.
4. Verification of every [VERIFY] reference; the literature review (Pass B) should be the starting list.
5. Whether R3 (precise ephemerides) is worth the effort.

## 9. Work started on this branch

- `benchmarks/pc.py`: encounter-plane projection, Foster 2D Pc, isotropic closed form, 2D Monte Carlo with Clopper-Pearson CI, MC sample-size helper.
- `benchmarks/legacy_pc_check.py`: reproduces Section 1, row 10 (legacy Pc vs exact).
- `tests/test_benchmark_pc.py`: checks Foster against the closed form and MC against Foster.
- `benchmarks/catalog.py`, `benchmarks/snapshot_catalog.py`: frozen TLE snapshots. The `.tle` files are git-ignored (live data); the `.json` manifest with sha256 and epoch range is committed.
- `benchmarks/screening_recall.py`: Exp 2b. `tests/test_screening_recall.py` covers local minima, passes and screen evaluation.
- `benchmarks/tca.py`, `benchmarks/tca_estimation.py`: Exp 3. `tests/test_benchmark_tca.py` checks the methods on synthetic straight-line and multi-minimum motion.
- `benchmarks/pc_comparison.py`: Exp 4 on real encounters; `ric_covariance` added to `benchmarks/pc.py`.

## 10. Results so far [MEASURED]

### Exp 2b: snapshot screening recall (preliminary)

**Setup:**
- Snapshot `catalog_20261014T064759Z` (15,970 records; sha256 in its manifest).
- LEO only (apogee ≤ 2000 km); TLEs ≤ 7 days old at the start.
- 2,000 random objects; seeds 1, 2, 3.
- 24 h window from 2026-10-10 02:10 UTC.
- SGP4 (`sgp4` package) for both the reference and the screens, so only sampling differs.
- Reference: 10 s grid, KD-tree at 200 km, grid minima refined with bounded Brent over ±10 s. The capture bound of 10 + 16 × 5 = 90 km guarantees every encounter below 10 km is found.
- **Event recall:** the screen flags a sample during the encounter's own pass. **Pair recall:** the pair is flagged at any time.
- Outputs: `benchmarks/results/screening_recall_n2000_h24_ref10s_seed{1,2,3}/`.

Reference encounters below 10 km: 6,576 / 6,803 / 6,244 (seeds 1/2/3). Persistent pairs, i.e. docked or formation flying (8 / 17 / 30 events), are excluded from the numbers below.

Event recall, miss < 10 km (range over the three seeds):

| step \ radius | 10 km | 25 km | 50 km | 100 km | 200 km |
|---|---|---|---|---|---|
| 3600 s (ORCA) | 0.1 % | 0.2–0.3 % | 0.4–0.8 % | **1.0–1.2 %** | 2.0 % |
| 600 s | 0.4–0.6 % | 1.3–1.6 % | 2.6–3.2 % | 5.6–5.7 % | 10.1–10.7 % |
| 60 s | 3.8–4.0 % | 11.6–12.3 % | 21.5–23.7 % | 40.2–41.9 % | 69.7–71.2 % |
| 20 s | 10.2–11.0 % | 30.9–32.4 % | 55.8–58.1 % | 88.0–89.8 % | 100 % |

**ORCA's configuration (3600 s, 100 km) by relative velocity:**

| Relative velocity | Event recall | Pair recall |
|---|---|---|
| < 0.1 km/s | 100 % (n = 4–10) | 100 % |
| 0.1–1 km/s | 16–22 % | 84–91 % |
| 1–5 km/s | 1–3 % | 37–41 % |
| 5–10 km/s | 0.5–1.0 % | 13–16 % |
| ≥ 10 km/s | 0.4–0.7 % | 6–8 % |

**Cross-check:** a straight pass stays inside radius r for about 2r/v, so a step Δs catches it with probability ≈ 2r/(v·Δs). For 100 km, 3600 s and 10 km/s that is 0.56 %, consistent with the fast bands. At 20 s / 200 km the sufficient condition r ≥ d + v·Δs/2 = 170 km holds, and recall is 100 % as it must be.

**Reading:**
- ORCA's screen sees about 1 in 100 encounters below 10 km during the encounter itself. It sees almost every slow, co-orbital one, which explains why its output is dominated by low-velocity Starlink pairs (Section 1, row 9).
- Pair recall (14–15 %) is an upper bound on what ORCA's ±6 h refinement could recover. Whether the refinement actually lands on the right pass is Exp 3.

**Caveats:**
- One snapshot, one 24 h window.
- 2,000-object subsets, not the full catalog. Encounter counts scale with N², but recall by velocity band should not depend strongly on N; this is unverified.
- The KD-tree screen here takes the same samples as ORCA but uses the `sgp4` propagator, not ORCA's engine.

### Exp 3: TCA estimation (preliminary)

**Setup:**
- The reference encounters from the three Exp 2b runs (persistent pairs excluded), with the same SGP4 propagator.
- Outputs: `benchmarks/results/tca_n2000_h24_ref10s_seed{1,2,3}/`. `local.csv` is git-ignored; regenerate it with the script.

**3a, local:**
- Each encounter is re-solved by range-rate root-finding to 1e-6 s; this is the reference.
- Each method gets [t_c − 60 s, t_c + 60 s], with t_c = t_ref + U(−30, 30) s.
- Errors are absolute; medians and p95 over 6,214–6,786 encounters per seed. The three seeds agree to about two significant figures, so seed 1 is shown.

| Method | TCA error, median / p95 | Miss-distance error, median / p95 | Pair evaluations |
|---|---|---|---|
| grid 60 s | 15 s / 28 s | 119 km / 345 km | 3 |
| grid 10 s | 2.6 s / 4.7 s | 16 km / 53 km | 13 |
| grid 1 s | 0.25 s / 0.48 s | **353 m / 2.5 km** | 121 |
| grid 60 s + quadratic fit on d² | 12 ms / 17 ms | 0.84 m / 5.4 m | 4 |
| grid 10 s + quadratic fit on d² | 0.06 ms / 0.08 ms | < 1 mm | 14 |
| bounded Brent on d (ORCA's method, local window) | 0.1 ms / 0.5 ms | < 4 mm | 12 |
| Brent root-find on range rate, 60 s bracket | < 5 µs | < 1 µm | 9 |

**Reading:**
- A plain grid is a poor miss-distance estimator. At 10 km/s, a 0.5 s timing offset adds about 5 km, so even a 1 s grid errs by hundreds of metres. That is larger than the hard-body radii and larger than v1's proposed 100 m risk boundary.
- Fitting the parabola to **d² rather than d** is exact for straight-line motion. It reaches metre-level miss accuracy from four evaluations.
- **Caveat:** the reference and the root-find method are the same family, so their sub-microsecond agreement is partly self-agreement. The independent methods (bounded Brent, quadratic on a 10 s grid) agree with the reference to < 0.1 ms and < 4 mm, which validates it.

**3b, ORCA's global refinement:**
- Pairs with a < 10 km reference encounter that ORCA's hourly 100 km screen flags at all: 261 / 293 / 247 of 3,090 / 3,344 / 3,025 (8–9 %).
- For those pairs, truth is the closest approach in the t_c ± 6 h window: a dense 10 s grid, then every candidate minimum refined.

| | ORCA: bounded Brent over ±6 h | Range-rate root-find of every minimum, 60 s grid |
|---|---|---|
| Finds the closest approach in the window | **5.4–6.1 %** | 100 % |
| Reports a miss < 10 km (truth: 83–89 % have one in the window) | 13–16 % | 83–89 % |
| Reported miss minus true miss, median / p95 | 30 km / 160 km | ~0 |
| Result outside the 24 h forecast window | 11–16 % | 3–4 % (the true closest approach itself) |
| Pair evaluations | 19 | 810 |

**Reading:**
- A single bounded Brent run over ±6 h, which contains about 15 approach minima for LEO pairs, usually stops at a minimum that is not the closest.
- Combined with Exp 2b, and still with SGP4: of the pairs that have an encounter below 10 km within 24 h, ORCA's screen-plus-refinement reports one below 10 km for about **1 %** (34 / 3,090 for seed 1).
- The fix is cheap in absolute terms (810 evaluations per candidate pair). A coarser range-rate grid (e.g. 300 s) may give the same result for a fifth of the cost; that is untested.

**Caveats:**
- The same as Exp 2b.
- This is ORCA's *algorithm* on SGP4, not ORCA's *pipeline*. ORCA's own propagator adds the Exp 1 errors on top.
- "Found" means within 1 s of the true closest approach.

### Exp 4: collision probability on real encounters (preliminary)

**Setup:**
- The Exp 2b encounters below 10 km (6,214–6,786 per seed, persistent pairs excluded).
- SGP4 states at each TCA.
- **ORCA's own inputs:** hard-body radii from the name model, σ = 0.5 km + 2 km/day × TLE age per object, summed. The legacy Pc is computed by calling ORCA's `_mahalanobis_distance` and `_collision_probability` directly.
- Foster 2D is evaluated in the encounter plane.
- **Anisotropic variants:** aspect ratio A = 3 and 10, in-track dominant. The error volume is the same as ORCA's, so only the shape changes. These are assumed values until Exp 1 measures real TLE error shapes.
- Outputs: `benchmarks/results/pc_n2000_h24_ref10s_seed{1,2,3}/`.

**Checks:**
- Foster matches the isotropic closed form to a relative difference of ≤ 1.4e-12.
- 2D Monte Carlo (2e6 samples, 99.9 % Clopper-Pearson) contains the Foster value for 50 of 50 top-Pc events in every seed.

**Same inputs, different formula: legacy tier (rows) vs Foster tier (columns), seed 1**

| legacy \ Foster | CRITICAL | HIGH | MEDIUM | LOW | NEGLIGIBLE |
|---|---|---|---|---|---|
| CRITICAL (121) | 0 | 0 | 2 | 119 | 0 |
| HIGH (429) | 0 | 0 | 4 | 425 | 0 |
| MEDIUM (2,812) | 0 | 0 | 9 | 2,803 | 0 |
| LOW (3,196) | 0 | 0 | 0 | 3,196 | 0 |

- Across the seeds, **every** legacy CRITICAL or HIGH event (455–550 per seed) is MEDIUM or LOW under the correct formula with identical inputs. Tier agreement is 49–50 %.
- The legacy / Foster ratio follows **1/α²** exactly (α = miss/σ). The observed range in each α band ends at the band edges (16 = 1/0.25², 4 = 1/0.5²). The median is ~46× for α < 0.25 and 0.87 for 1 ≤ α < 2.
- With ORCA's covariance floor (σ ≥ 0.5 km per object) and radii around 10 m, a correct Pc cannot exceed about 1e-4 even at zero miss, so CRITICAL is essentially unreachable. The legacy tiers come from the formula error, not from the encounters.

**Ranking (H5): how far each Pc ranking agrees with a miss-distance ranking**

| Pc method | Kendall τ vs miss distance | Top-100 overlap with miss ranking |
|---|---|---|
| legacy | 0.87–0.88 | 96–99 % |
| Foster, isotropic | 0.41–0.43 | 6–11 % |
| Foster, A = 3 | 0.25–0.26 | 0–2 % |
| Foster, A = 10 | 0.22–0.23 | 0–1 % |

**Reading:**
- The 1/α² factor makes the legacy Pc behave like 1/miss², so ORCA's "risk ranking" is effectively a miss-distance ranking.
- A correct Pc ranks events very differently, and covariance shape changes the ranking further (A = 10 moves 725–784 events per seed to NEGLIGIBLE).
- This supports H5 and the proposal's distance-vs-Pc objective. It also shows that the covariance assumption matters as much as the formula, which makes Exp 1 R2 (estimating real TLE error shapes) important.

**Caveats:**
- All methods here assume a short-term encounter.
- Relative-velocity mix per seed: 4–10 events below 0.1 km/s and 98–108 at 0.1–1 km/s, where that assumption is doubtful. The planned 3D Monte Carlo with propagation is not done yet.
- Absolute Pc values inherit ORCA's assumed σ and radii; only the legacy-vs-Foster comparison is assumption-free, because the inputs are identical.
