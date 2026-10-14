# Paper draft: Sections IV (Methodology) and V (Results and Discussion)

> Draft 1, 2026-10-14. Written from `MD/research_paper_brief.md` (Section 10) and the committed files in `benchmarks/results/`. Every number below is traceable to one of those files.
>
> **Placeholders:**
> - **[VERIFY: …]** marks a citation still to be checked at its source.
> - **[Fig. n] / [Table n]** follow the brief's plan.
> - **F1** (the pipeline diagram) is not drawn yet. The other figures are in `benchmarks/figures/`.
>
> Sections I–III and VI are not drafted. They need the literature check first.
>
> **Length:** about 2,700 words, which is over the ~4.1-page budget for IV + V. Trim after the template is fixed.

---

## IV. METHODOLOGY

### A. The ORCA pipeline and the benchmark harness

ORCA is an open-source conjunction-assessment pipeline that works only from public two-line element sets (TLEs). As built, it runs in six stages:
1. Retrieve TLEs from CelesTrak.
2. Propagate every object on a 1 h grid over the forecast window.
3. Screen each grid instant with a KD-tree for pairs closer than 100 km.
4. Refine the time of closest approach (TCA) of each flagged pair with bounded Brent minimisation of the separation over ±6 h.
5. Compute a two-dimensional collision probability (Pc) under an assumed isotropic covariance.
6. Assign one of five risk tiers by Pc (CRITICAL > 1e-4, HIGH > 1e-5, MEDIUM > 1e-6, LOW > 1e-7) [Fig. 1].

The benchmark harness (`benchmarks/`) leaves ORCA's production code unchanged. Each stage is replaced by alternatives, one at a time, while the others are held fixed. Where ORCA itself is measured, its own functions are called with its own inputs.

### B. Data and environment

**Snapshots.** Two catalog snapshots of the CelesTrak `active` group are used [Table 1]:
- **S1:** 15,970 records exported from ORCA's database. TLE epochs run from 2026-08-18 to 2026-10-10, median 2026-10-07.
- **S2:** 15,932 records from a single CelesTrak request on 2026-10-14, median epoch 2026-10-13.

Each snapshot is frozen as a file with a SHA-256 manifest, and no data is re-fetched during the study. The `active` group contains payloads only, with no debris. This is stated as a limitation.

**Conjunction window and populations.** Experiments on conjunctions use S1 with a 24 h window starting 2026-10-10 02:10 UTC (the newest epoch in S1). Objects are low Earth orbit (LEO, apogee altitude ≤ 2,000 km), and each TLE is at most 7 days old at the window start. Three random subsets of 2,000 such objects (seeds 1–3) form the conjunction populations.

**Environment.** All timings come from one laptop:
- AMD Ryzen 9 5900HS, 16 logical CPUs, 15.4 GB RAM, Windows 11
- Python 3.12.0, NumPy 2.5.2, SciPy 1.18.0, sgp4 2.27
- single process, with one warm-up run before timed repeats

**Table 1. Data and environment.**

| Item | Value |
|---|---|
| Source | CelesTrak GP, group `active` (payloads only) |
| S1 / S2 records | 15,970 / 15,932 |
| S1 / S2 median TLE epoch | 2026-10-07 / 2026-10-13 |
| Conjunction window | 24 h from 2026-10-10 02:10 UTC |
| Conjunction populations | 3 × 2,000 LEO objects, TLE age ≤ 7 days |
| Frame / units | TEME; km, km/s |
| Hardware / software | Ryzen 9 5900HS, 15.4 GB; Python 3.12, SciPy 1.18, sgp4 2.27 |

### C. Experiments

Table 2 summarises the five experiments.

**Table 2. Experiment design.**

| Exp | Stage varied | Compared | Reference | Main metrics |
|---|---|---|---|---|
| 1 | Propagation | ORCA engine (two-body + drag); two-body + J2 secular; SGP4 | R1: SGP4 of the same TLE. R2: the next TLE of the same object | Position error, radial / in-track / cross-track spread |
| 2a | Screening cost | Brute force; KD-tree | Exact pair-set equality | Time per step |
| 2b | Screening recall | Snapshot screens, steps 20 s–1 h, radii 10–200 km | Dense 10 s SGP4 search | Recall by relative velocity |
| 3 | TCA | Grid search; grid + quadratic fit on d²; bounded Brent; Brent root-finding on range rate | Range-rate root to 1e-6 s | TCA and miss errors, evaluations |
| 4 | Pc | ORCA legacy; Foster 2D; closed form; Monte Carlo; curved-path integral | Closed form; Monte Carlo | Ratio to Foster, tiers, ranking |
| 5 | End to end | ORCA as built; corrected pipeline | SGP4 near each claimed TCA | Encounters found, miss error, tiers |

#### Exp 1: propagation

Three propagators are compared:
- **ORCA's engine:** two-body motion with an exponential drag term and no J2, built through ORCA's own TLE parser.
- **Two-body + J2 secular:** first-order J2 secular rates of node, perigee and mean anomaly, applied to Brouwer mean elements.
- **SGP4** (sgp4 package) [VERIFY: Vallado et al. 2006].

The J2 tier deliberately uses the Brouwer semi-major axis that SGP4 uses internally. Applying J2 rates to the TLE's Kozai mean motion double-counts part of the J2 effect, which caused ~270 km of in-track drift per day in our first implementation. Its rates agree with SGP4's own secular mean-anomaly rate to within 1e-5 (unit-tested).

Two references are used:
- **R1 (model consistency):** each TLE propagated by SGP4. This measures how far the simpler models drift from the model the TLE was fitted for.
- **R2 (TLE-to-TLE consistency):** the S1 TLE is propagated to the epoch of the same object's S2 TLE, and compared with SGP4 of the S2 TLE at its own epoch.

Errors are split into radial, in-track and cross-track (RIC) components of the reference state. Spreads are robust standard deviations (1.4826 × median absolute deviation).

#### Exp 2a: screening cost

Brute-force all-pairs screening (vectorised, with an exact boundary recheck) and the KD-tree fixed-radius search ORCA uses are run on identical SGP4 snapshots:
- 12 hourly instants, radius 100 km
- catalog sizes from 1,000 to 15,913 objects (all objects in S1 that propagate cleanly)
- 5 timed repeats

The returned pair sets are compared for exact equality at every size and instant.

#### Exp 2b: screening recall

**Reference.** All objects are propagated with SGP4 every Δt = 10 s, and every pair within 200 km is collected at each step with a KD-tree. Each grid local minimum of the separation is refined by bounded Brent minimisation over ±Δt. An encounter with true miss distance d and relative speed v always has a grid sample within Δt/2 of its TCA, at a separation of at most d + vΔt/2. With v ≤ 16 km/s in LEO, every encounter below 10 km is therefore captured (bound 90 km ≤ 200 km).

**Screens.** A snapshot screen with step Δs (a multiple of Δt) and radius r flags the samples at multiples of Δs that lie within r. An encounter counts as **detected** if the screen flags a sample during that encounter's own pass, i.e. the maximal run of consecutive reference samples of the pair. Flags from other passes of the same pair do not count. We also report **pair recall** (the pair is flagged at any time), which is what ORCA retains. Pairs that stay within the query radius for the entire window (docked or formation-flying objects) are reported separately.

#### Exp 3: TCA estimation

**3a, local accuracy.** For every reference encounter, the reference TCA is the root of the range rate (Δr·Δv = 0), found with Brent's method to 1e-6 s. Each method then searches [t_c − 60 s, t_c + 60 s], where t_c = t_ref + U(−30, 30) s stands in for a coarse screening hit. The methods are:
- grid search at 1–60 s
- a 60 s or 10 s grid followed by a parabola through the three samples of d² around the minimum (d² is exactly quadratic in time for straight-line relative motion)
- bounded Brent minimisation of d
- Brent root-finding of the range rate inside the sign-change bracket of a 60 s grid

Cost is counted in pair evaluations (two propagations each).

**3b, ORCA's global refinement.** For each pair with a reference encounter, ORCA's procedure is emulated:
1. Sample the pair hourly.
2. Take the closest sample within 100 km as t_c.
3. Run bounded Brent on d over t_c ± 6 h, with ORCA's tolerance.

It is compared with root-finding every range-rate sign change on a 60 s grid over the same window. Truth is a 10 s grid over the window, with every minimum that could be the closest refined. A method "finds" the closest approach if its TCA lies within 1 s of the truth.

#### Exp 4: collision probability

At each reference TCA, the miss vector and the combined position covariance are projected onto the encounter plane, the plane normal to the relative velocity. Foster's method integrates the resulting 2D Gaussian over the hard-body disc [VERIFY: Foster & Estes 1992]. Our implementation rotates to the covariance principal axes and performs a one-dimensional quadrature.

**Covariances.**
- **ORCA's:** isotropic, σ = 0.5 km + 2 km/day × TLE age per object, summed over the two objects.
- **Anisotropic variants:** volume-preserving, in-track-dominant, with aspect ratio A = 3 and 10.

**Hard-body radii** are ORCA's name-based values (e.g. 5.65 m for Starlink, 3.0 m otherwise).

**Methods compared:**
- ORCA's legacy formula, called through its own functions
- Foster
- the isotropic closed form (a non-central χ² with two degrees of freedom), used to check Foster
- 2D Monte Carlo with 2 × 10⁶ samples and 99.9 % Clopper-Pearson intervals, on the 50 highest-Pc events per seed

**Short-term encounter assumption (Exp 4b).** To test the straight-line assumption, the small-radius measure

$$P \approx \pi R^2 \int N(\mathbf r_{rel}(t);\, 0, C)\, |d\mathbf r_{rel}|$$

is integrated along the actual SGP4 relative path, with C frozen at TCA. For a straight path it equals small-radius Foster (unit-tested). Over several passes it is the expected number of hard-body crossings. It is evaluated for the pass containing the TCA and for all passes within ±3 h. The encounters tested are all those below 1 km/s, plus 200 faster ones as a control.

#### Exp 5: end to end

On each 2,000-object population and window, two pipelines are run:

**Pipeline A, ORCA as built:** ORCA's `ConjunctionSearch`, single process.

**Pipeline B, corrected:**
- SGP4 propagation
- KD-tree screening every 20 s at 200 km, which guarantees capture below 10 km (10 + 16 × 10 = 170 km)
- range-rate root-finding inside each pass
- Foster Pc with ORCA's radii, under two covariances:
  - **B_iso:** ORCA's isotropic σ
  - **B_ric:** in-track σ equal to ORCA's σ, radial and cross-track σ equal to max(σ/100, 0.1 km). This is the shape measured in Exp 1; the 0.1 km floor is an assumption.

Each A event is checked against SGP4 within ±10 min of the TCA that A claims. A counts as finding a B encounter if it reports the same pair within ±10 min.

---

## V. RESULTS AND DISCUSSION

### A. Propagation

**R1, model consistency [Fig. 2].** ORCA's engine departs from SGP4 by a median of 12 km at the TLE epoch, 83 km at 6 h, 303 km at 24 h and 2,920 km at 7 days (about 15,160 LEO objects). Two-body + J2 secular starts at the same 12 km, which comes from treating mean elements as osculating. It then stays at 8–11 km through 24 h and reaches 83 km at 7 days. Its cross-track error stays near 2 km at every horizon, while ORCA's engine reaches 100 km within a day.

The largest single source of propagation error in ORCA is therefore the missing J2 term, and adding J2 removes about 290 km of the 303 km at 24 h. It also costs less per state than ORCA's engine: 8 µs against 38 µs, scalar calls including setup. SGP4 costs 2 µs.

**R2, TLE-to-TLE.** Almost all LEO objects (15,041) fall in a single 5–7 day gap between S1 and S2.

| Population | Propagator | Median error | Robust σ, R / I / C |
|---|---|---|---|
| Non-Starlink | SGP4 | 12.0 km | 0.13 / 14.2 / 0.20 km |
| Non-Starlink | J2 tier | 24.7 km | — |
| Non-Starlink | ORCA's engine | 2,531 km | — |
| Starlink | SGP4 | 148 km | 3.5 / 160 / 0.44 km |
| Starlink | J2 tier | 38 km | — |

Two findings matter downstream:
1. **Real TLE error is strongly anisotropic.** For non-Starlink objects, the in-track spread is about 100 times the radial and 70 times the cross-track spread. ORCA's isotropic σ of about 12.5 km per object at this age matches the in-track spread, but overstates the other two axes by roughly two orders of magnitude.
2. **For Starlink, SGP4 is worse than the J2-only tier, and its error grows with the drag term B\*.** Median errors rise from 15 km in the lowest B\* quartile to 383 km in the highest; for J2 they rise from 21 km to 87 km. For non-Starlink objects, SGP4 is better in every quartile. We hypothesise that Starlink TLE fits absorb low-thrust station-keeping into B\*, which SGP4 then extrapolates as drag. This has not been verified [VERIFY]. Starlink makes up 70 % of LEO objects in this catalog.

A single horizon bin does not allow error growth to be fitted. More snapshots are being collected.

### B. Screening

**Cost [Fig. 3a].** Brute force and the KD-tree returned identical pair sets at every size and instant.

| Catalog objects | Brute force (vectorised) | KD-tree | Speedup |
|---|---|---|---|
| 1,000 | 15 ms | 0.42 ms | 36× |
| 15,913 | 1,473 ms | 8.5 ms | 173× |

The speedup grows with catalog size. ORCA's pure-Python fallback took 1.0 s at 1,000 objects and 4.1 s at 2,000. That gap reflects implementation, not algorithm.

At about 9 ms per step for the full catalog, the spatial search is not ORCA's bottleneck. A 10 s step over 24 h would cost about 75 s of screening.

**Recall [Fig. 3b].** Each seed contains 6,214–6,803 reference encounters below 10 km.

| Screen | Event recall, miss < 10 km (range over 3 seeds) |
|---|---|
| ORCA's 1 h, 100 km | 1.0–1.2 % |
| 10 min, 100 km | 5.6–5.7 % |
| 1 min, 100 km | 40–42 % |
| 20 s, 100 km | 88–90 % |
| 20 s, 200 km | 100 % (sufficient condition holds) |

**Recall depends on relative velocity.** At ORCA's setting, recall is:
- 100 % below 0.1 km/s (4–10 encounters)
- 16–22 % at 0.1–1 km/s
- 1–3 % at 1–5 km/s
- under 1 % above 5 km/s

These values agree with the probability that a straight pass is sampled while inside the radius, about 2r / (v·Δs). For r = 100 km, Δs = 1 h and v = 10 km/s that is 0.56 %.

Pair recall, i.e. the pair is flagged at some other time, is 14–15 %. Because the screen catches slow encounters preferentially, ORCA's output is dominated by co-orbital pairs: in its exported top-100 list, 85 are Starlink–Starlink and 21 % have relative velocity below 0.1 km/s.

### C. Time of closest approach

**Local accuracy [Fig. 4].** The table gives medians over about 6,500 encounters per seed; seed 1 is shown, and the three seeds agree to two significant figures.

| Method | TCA error | Miss-distance error | Pair evaluations |
|---|---|---|---|
| Grid, 60 s | 15 s | 119 km | 3 |
| Grid, 10 s | 2.6 s | 16 km | 13 |
| Grid, 1 s | 0.25 s | 353 m | 121 |
| Grid 60 s + quadratic fit on d² | 12 ms | 0.84 m | 4 |
| Grid 10 s + quadratic fit on d² | — | < 1 mm | 14 |
| Bounded Brent on d | 0.1 ms | < 4 mm | 12 |
| Brent root-finding on range rate | < 5 µs | — | 9 |

**Grid search alone is a poor miss-distance estimator.** At 10 km/s, a half-step timing offset of 0.5 s adds about 5 km to the separation. That error is larger than hard-body radii, and larger than any miss-distance risk boundary in the 100 m range.

**Fitting the parabola to d² instead of d** removes most of the error for the cost of one extra evaluation.

Caveat: the reference and the range-rate root-finder belong to the same family. The independent methods (bounded Brent, quadratic on 10 s) agree with the reference to < 0.1 ms and < 4 mm, which validates it.

**ORCA's global refinement.** Of the pairs with an encounter below 10 km, only 247–293 per seed (8–9 %) are flagged by ORCA's hourly screen at all.

| | ORCA's bounded Brent over ±6 h | Root-finding of every minimum (60 s grid) |
|---|---|---|
| Finds the closest approach in its window | 5.4–6.1 % | 100 % |
| Reported miss − true miss, median | about 30 km | ≈ 0 |
| TCA falls outside the 24 h forecast window | 11–16 % | — |
| Pair evaluations per pair | 19 | 810 |

A ±6 h window holds about 15 approach minima for a LEO pair, so a single bounded Brent run usually stops at the wrong one. The robust alternative is still cheap in absolute terms.

### D. Collision probability

**Accuracy of the implementation.** Foster matches the isotropic closed form to within 1.4 × 10⁻¹² relative difference. In every seed, the Monte Carlo interval contains the Foster value for 50 of 50 events.

**ORCA's legacy formula [Fig. 5].** On identical inputs, the ratio of legacy to Foster Pc follows **1/α² exactly**, where α = miss distance / combined σ:
- the legacy formula overstates Pc by about 46× for α < 0.25
- it understates Pc above α ≈ 1

As a result:
- **Tiers:** every legacy CRITICAL and HIGH event (455–550 per seed) is MEDIUM or LOW under Foster with the same inputs. Overall tier agreement is 49–50 %.
- **Ranking:** the legacy Pc ranking is essentially a miss-distance ranking (Kendall τ = 0.87–0.88; top-100 overlap 96–99 %). The correct Pc ranks events very differently (τ = 0.41–0.43; top-100 overlap 6–11 %).
- **Covariance shape:** making the covariance anisotropic (A = 10) lowers τ further to 0.22–0.23.

**Short-term encounter assumption.**
- **Within a single pass,** the straight-line model holds from 0.1 km/s up. The curved-path measure equals Foster to within 1 % (median 1.00, and p5–p95 also 1.00 for the ≥ 1 km/s control).
- **For the slowest encounters** (below 0.1 km/s) with an anisotropic covariance, the encounter spans the whole ±3 h window and Foster underestimates by about 6×.
- **Across passes,** LEO pairs in the same shell meet again every half orbit, so the expected crossings within ±3 h are 2–7 times the single-pass value.

ORCA reports one row per pair, so its pair-level risk is the single best pass. That is a reporting choice the paper states, not a formula error.

### E. End-to-end comparison

**Table 5.** Seeds 1 / 2 / 3; same objects and window for both pipelines.

| | A (ORCA as built) | B (corrected) |
|---|---|---|
| Events reported | 231 / 204 / 203 | 6,576 / 6,802 / 6,244 (< 10 km) |
| A's events claiming < 10 km that really are < 10 km | 2 of 32 / 3 of 34 / 4 of 29 | — |
| Median \|claimed − true\| miss | 90 / 98 / 85 km | — |
| B's encounters that A also finds | **8 / 6 / 7** | — |
| Runtime (single process) | 2.6 s | 24–25 s |
| Kendall τ, miss vs Pc | 0.87 | 0.41 (B_iso), 0.34 (B_ric) |

**Recall.** ORCA as built reports about 0.1 % of the encounters below 10 km that occur within 24 h. Its reported miss distances are wrong by about 90 km in the median. About one in eight of its TCAs falls outside the forecast window.

**Cost and fidelity of B.** B costs about nine times more computation. It reproduces the dense reference encounter set to within one event per seed.

**Tiers depend mainly on the covariance.** With the same encounters and the same Foster formula:
- under B_iso, no encounter is above MEDIUM
- under B_ric, 471–576 per seed are HIGH

Because TLEs carry no covariance, the risk tier is the least defensible output of any TLE-only pipeline. We therefore report tiers only as conditional on a stated covariance model.

### F. What the results do not establish

- No result is validated against operational conjunction data messages.
- The R2 reference (a later TLE) is itself imperfect, and manoeuvres between the two epochs count as propagation error.
- The covariance shape is measured at a single horizon, and the B_ric floor is assumed.
- Encounter counts come from 2,000-object subsets of a payload-only catalog over one 24 h window. Counts scale with catalog size; the ratios and recall fractions are what we expect to carry over.
- Runtimes come from one machine and depend on implementation.
