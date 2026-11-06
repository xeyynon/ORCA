# Paper draft: full text, Sections I–VI

> Draft 3, 2026-10-29 (adds §IV-D evaluation metrics, candidate reduction in §V-B and the metric summary in §V-F). Draft 2 was 2026-10-15. Written from `MD/research_paper_brief.md` (Section 10) and the committed files in `benchmarks/results/`. Every number below is traceable to one of those files.
>
> **Placeholders:**
> - Citations are keys in [references.bib](references.bib), written as [key]. The verification status of each is in [literature_verification.md](literature_verification.md); keys marked SECONDARY there must be re-checked before submission.
> - **[Fig. n] / [Table n]** follow the brief's plan.
> - All figures, including **F1** (`fig_pipeline`) and **F5** (`fig_mc_convergence`), are in `benchmarks/figures/`.
>
> Sections I and III use the gap verified in `MD/literature_verification.md` §5. An 8-page IEEE version is in `paper/`.
>
> **Length:** IV + V are about 3,500 words including tables, well over their ~4.1-page budget. II is about 650 words against ~0.6 page. Trim after the template is fixed.

---

## I. INTRODUCTION

### A. Background and motivation

Close approaches between catalogued objects in low Earth orbit (LEO) are routine. Operators screen their satellites against the catalog daily and act when the probability of collision P_c crosses a threshold, usually 10⁻⁴ [nasa_ca_handbook2020; merz2019].

The only orbit data freely available for the whole public catalog are two-line element sets (TLEs). Public services and open tools therefore build conjunction pipelines on TLEs, from CelesTrak's SOCRATES [kelso2005socrates] to recent open-source screeners [sonawane2026]. NASA's conjunction-assessment handbook does not recommend TLE-based assessment for operations, "because the TLE accuracy is not sufficient" [nasa_ca_handbook2020]. How much accuracy is lost, and at which stage of a typical pipeline, is rarely measured.

### B. Problem statement

A TLE pipeline has four stages: propagation, screening, refinement of the time of closest approach (TCA), and collision probability with a risk tier. Each stage rests on a choice the user does not see:
- the propagator;
- the screening time step and radius;
- the refinement method;
- the P_c formula;
- the position covariance that TLEs do not carry.

Errors compound. An encounter missed by screening never reaches the P_c stage. A P_c computed with a wrong formula or an unsupported covariance produces a confident tier with no physical meaning. In a working tool, none of this is visible in the output.

### C. Research gap

**What existing work measures:**
- completeness and agreement of commercial and government screening tools on the public TLE catalog [georgeharvey2011];
- accuracy requirements for screening, with a public answer key [auman2025];
- conjunctions missed by orbit filters [woodburn2009];
- P_c formulas compared in isolation [alfano2007review; li2022review];
- collisions missed by snapshot screening, in a synthetic debris-evolution setting [medhin2026].

Open TLE pipelines report speed but not accuracy [sonawane2026].

**What we did not find:**
- a measurement of how much snapshot screening misses on public TLEs as a function of time step, radius and relative velocity;
- an end-to-end, stage-by-stage attribution of accuracy loss in one open pipeline;
- a measurement of how far the choice between an assumed and a measured covariance moves the risk tiers.

### D. Contributions

We benchmark each stage of an open TLE pipeline, ORCA, against a dense reference built from the same public data:

1. **Screening recall.** On public TLEs, a 1 h / 100 km snapshot screen sees only 1.0–1.2 % of the encounters closer than 10 km during their pass. Recall follows the sampling law 2r/(vΔt) and depends strongly on relative velocity.
2. **Stage-by-stage audit of a working tool.** ORCA's propagator drifts ~300 km from SGP4 in a day. Its TCA refinement finds the closest approach for 5–6 % of the pairs it flags. Its P_c formula is off by exactly 1/α², which makes every one of its CRITICAL and HIGH labels an artefact. End to end, it reports about 0.1 % of the encounters closer than 10 km. A corrected pipeline, validated against the reference, recovers them at about 9 times the cost and is now ORCA's production engine.
3. **Covariance decides the tier.** We measure TLE position error from successive public TLEs:
   - along-track is ~100 times radial;
   - Starlink is ~15 times worse in-track than other LEO objects.

   On the same encounters, assumed covariances give between 0 and ~500 HIGH-tier events per 2,000 objects per day. The measured, ESA-floored covariance gives 0–4. The P_c ranking also departs sharply from the miss-distance ranking (Kendall τ 0.30–0.43).

Code, result files and snapshot manifests accompany the paper.

**Organisation.** Section II gives the background, Section III reviews related work, Section IV describes the method and experiments, Section V reports the results, and Section VI concludes.

---

## II. PRELIMINARIES

### A. Two-line element sets and SGP4

**What a TLE is.** A two-line element set (TLE) is a set of *mean* orbital elements, fitted by the US Space Surveillance Network to its tracking data, plus a drag term B\*. The elements are defined by the SGP4 theory they were fitted with. Spacetrack Report #3 warns that "inputting NORAD element sets into a different model … will result in degraded predictions" [hoots1980str3]. One detail matters later: SGP4 first converts the published Kozai mean motion to Brouwer's form [hoots1980str3; vallado2006revisiting]. We use the reference SGP4 code [vallado2006revisiting] through the sgp4 package [rhodes_sgp4].

**How accurate TLEs are.** TLE predictions are accurate to roughly the kilometre level [vallado2006revisiting]. Their error is dominated by the along-track component [flohrer2009improving] and grows by about 1.5 km per day against precise orbits [levit2011improved].

**No covariance.** TLEs carry no covariance [flohrer2009improving; nasa_ca_handbook2020]. Any collision probability computed from them therefore rests on an uncertainty model supplied from outside. For that reason NASA's Conjunction Assessment handbook does not recommend TLE-based conjunction assessment for operations [nasa_ca_handbook2020].

### B. Conjunction screening

**The all-vs-all problem.** Comparing every pair in a catalog of N objects means N(N−1)/2 pairs: about 1.3 × 10⁸ for N = 16,000. Two families of shortcuts exist:
- **Filters** discard pairs whose orbits cannot come close [hoots1984]. Their pads must be chosen with care or conjunctions are missed [woodburn2009].
- **Time-sampled (snapshot) screening** propagates all objects to a grid of times t_k = kΔt and, at each step, finds every pair closer than a screening radius r. A k-d tree [bentley1975] finds those pairs in close to O(N log N) time per step instead of O(N²).

**When snapshots can miss an encounter.** An encounter with miss distance d and relative speed v is caught only if a sample falls while the pair is inside r. Over a straight pass, the time inside r is 2√(r² − d²)/v. So an encounter is guaranteed to be caught only if

$$ r \;\ge\; d + v\,\Delta t / 2 . $$

Otherwise the probability of catching it is about 2√(r² − d²)/(vΔt). For LEO, v reaches about 15 km/s.

### C. Time of closest approach

The time of closest approach (TCA) minimises the separation d(t) = |r₂(t) − r₁(t)|. Equivalently, it is a root of the range rate

$$ \dot d \propto \Delta\mathbf r \cdot \Delta\mathbf v = 0 , $$

with a sign change from negative to positive. Two ways to find it:
- **Root-finding.** Bracketing the root on a coarse grid and refining it with Brent's method [brent1973] is robust.
- **Fitting.** For straight-line relative motion, d²(t) is exactly quadratic in t. A parabola through d² at three samples therefore locates the TCA without further propagation.

A pair in low Earth orbit has several approach minima per orbit. A single bounded minimisation over a long window can stop at any one of them.

### D. Collision probability

**The short-term encounter model.** Most methods assume the relative motion is straight and fast during the encounter [akella2000; chan2008]. The relative position at TCA is then projected onto the *encounter plane* normal to the relative velocity. The probability of collision P_c is the 2D Gaussian density integrated over a disc of radius R, the combined hard-body radius, centred on the miss vector m:

$$ P_c = \iint_{|\mathbf x| \le R} \frac{1}{2\pi\sqrt{|C|}} \exp\!\Big(-\tfrac12 (\mathbf x - \mathbf m)^{\!\top} C^{-1} (\mathbf x - \mathbf m)\Big)\, d\mathbf x . $$

Here C is the combined 2×2 position covariance in that plane.

**Ways to evaluate it.**
- Foster's method integrates this numerically [foster1992].
- Closed and series forms exist [alfano2005numerical; patera2001; chan2008]; see the review [li2022review].
- For R ≪ σ the integral tends to πR² times the density at the disc centre.
- Monte Carlo sampling converges to the same value but, by binomial variance, needs about (1 − P_c)/(P_c ε²) samples for relative error ε. We report exact Clopper–Pearson intervals [clopper1934].

**When the model fails.** When the relative speed is low, the encounter lasts long, curvature matters, and the 2D model no longer holds [coppola2012; alfano2009mc].

### E. Risk tiers

Operators act on P_c thresholds. NASA's handbook recommends mitigation above 10⁻⁴ [nasa_ca_handbook2020], and the same 1/10,000 is a "quasi-standard" at ESA [merz2019]. ORCA reports five tiers with boundaries at 10⁻⁴, 10⁻⁵, 10⁻⁶ and 10⁻⁷. Every tier inherits the covariance assumption behind P_c (§II-A).

---

## III. LITERATURE REVIEW

### A. TLE-based orbit prediction

SGP4 and its element sets were published in Spacetrack Report #3 [hoots1980str3]. The reference implementation, which is the one used here, was revisited by Vallado et al. [vallado2006revisiting], who put TLE prediction accuracy "generally in the kilometer-level range". Flohrer et al. derived TLE uncertainties per orbit class for ESA's collision-risk tool [flohrer2009improving]: LEO averages of 0.10, 0.47 and 0.13 km radial, along-track and cross-track at epoch. Kelso compared SGP4 with GPS precise ephemerides and found that TLE-to-TLE consistency approximates the true error but underestimates it near epoch [kelso2007validation]. Against precise laser-ranging orbits, Levit and Marshall reported SGP4 error growth of about 1.5 km per day, and showed that fitting to TLE histories reduces it [levit2011improved].

**Starlink.** Megaconstellations add a specific problem. Starlink satellites manoeuvre every one to two days in their operational shells [liu2024maneuver], and continuous low-thrust propulsion makes them hard to predict [lang2025starlink]. SpaceX publishes operator ephemerides [ou2025starlink], from which CelesTrak derives supplemental element sets and publishes a comparison against the regular TLEs [celestrak_supgp]. An unrefereed study measured how quickly Starlink TLEs lose accuracy against operator-updated truth [jankovic2026].

### B. Conjunction screening

**Filters and parallel screening.** Hoots et al. introduced the classic apogee–perigee, orbit-path and time filters [hoots1984]. Woodburn et al. showed that these filters need pads to avoid missed conjunctions: 4 of 5,338 conjunctions were lost without them [woodburn2009]. Parallel and sieve methods followed [healy1995; alarcon2002]. George's sort-and-sweep screener [george2011] and Budianto-Ho et al.'s k-d tree and spatial-hash screener [budianto2014] avoid sampling misses by screening *swept* volumes between time steps.

**Comparisons and benchmarks.**
- George and Harvey compared six screening tools on the public TLE catalog. Tools missed between 33 and 326 conjunctions, which they traced to filter pads [georgeharvey2011].
- Stevenson et al. benchmarked machine-learning screening against classical filters on simulated ephemerides [stevenson2023].
- Medhin and Servadio quantified the "boundary blindness" of snapshot grid methods in a synthetic debris-evolution setting [medhin2026].
- Sonawane screened the CelesTrak catalog with grid and k-d tree methods, reporting speed-ups but no recall [sonawane2026].

### C. Time of closest approach

Alfano and Negron located close approaches by fitting cubic polynomials to the separation history and finding their roots [alfano1993]. Brent's method [brent1973] is the standard bracketed root-finder and minimiser. Open pipelines commonly fit a parabola through grid samples [sonawane2026], but the accuracy of these refinements, and how often a long-window minimiser settles on the wrong approach, is seldom reported.

### D. Collision probability

**Short-term encounters.**
- Foster's 2D integral [foster1992] and its refinements [akella2000; patera2001; alfano2005numerical; chan2008] are the standard methods; Li et al. review them [li2022review].
- Alfano compared Foster, Chan, Patera and Alfano numerically over about 60,000 cases and found all of them accurate to two or more significant figures [alfano2007review].
- Monte Carlo test cases [alfano2009mc] and NASA's open CARA tools [cara_tools] support validation.

**Long encounters.** For slow encounters, Coppola extended P_c to 3D with velocity uncertainty [coppola2012].

**Covariance.** Because TLEs carry no covariance, it must be supplied: from look-up tables [flohrer2009improving], or estimated from public TLE histories, as COVGEN did [peterson2001covgen].

**Thresholds.** NASA recommends mitigation above 10⁻⁴ [nasa_ca_handbook2020]. ESA notes that 1/10,000 has become a quasi-standard, "presumably often applied without being scrutinized" [merz2019].

### E. Public services and open tools

- SOCRATES screens payloads against the public catalog daily [kelso2005socrates].
- Orekit ships short-term P_c methods [orekit12], and NASA's CARA SDK provides P_c tools with test cases [cara_tools].
- The TraCSS validation work defines screening accuracy requirements and a public answer key [auman2025].

### F. Gap

**Covered elsewhere:** screening speed, filter design, tool agreement, and P_c formulas in isolation.

**Not measured:**
- recall of snapshot screening on public TLEs as a function of step, radius and relative velocity;
- the accuracy of each stage inside one working TLE pipeline, end to end;
- the effect of a measured rather than assumed covariance on the risk tiers that users see.

These are the three contributions of this paper (§I-D).

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
- **SGP4** (sgp4 package [rhodes_sgp4], which wraps the reference code of [vallado2006revisiting]). TLEs are mean elements specific to SGP4 [hoots1980str3], so a two-body tier measures model mismatch as well as missing physics.

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

At each reference TCA, the miss vector and the combined position covariance are projected onto the encounter plane, the plane normal to the relative velocity. Foster's method integrates the resulting 2D Gaussian over the hard-body disc [foster1992; akella2000]. Our implementation rotates to the covariance principal axes and performs a one-dimensional quadrature.

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

### D. Evaluation metrics

Every experiment is scored with the following measures.

| Metric | Experiment | Definition |
|---|---|---|
| Position error | 1 | Distance from the reference position, split into radial, in-track and cross-track; median and robust spread over objects |
| TCA error | 3, 5 | Time difference from the root-found closest approach (s); median and 95th percentile |
| Miss-distance error | 3, 5 | Distance difference from the root-found miss distance (m); median and 95th percentile; with the share of true closest approaches found |
| Runtime | 2a, 3, 5 | Wall-clock time per step or per run, one machine |
| Speedup | 2a | Ratio of the slower method's runtime to the faster one's |
| Recall | 2b | Share of reference encounters whose pass the screen flags |
| Candidate reduction | 2b | All object pairs, n(n−1)/2, divided by the pairs the screen flags in the window. Meaningful only together with recall: flagging nothing reduces candidates without bound |
| Pc difference | 4 | Ratio of a method's Pc to Foster's on identical inputs; agreement with the closed form and with Monte Carlo (Clopper–Pearson intervals) |
| Risk classification agreement | 4, 5 | Share of encounters given the same tier (and within one tier) by two methods; HIGH and CRITICAL counts per setting; Kendall τ between each ranking and miss distance |

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
2. **For Starlink, SGP4 is worse than the J2-only tier, and its error grows with the drag term B\*.** Median errors rise from 15 km in the lowest B\* quartile to 383 km in the highest; for J2 they rise from 21 km to 87 km. For non-Starlink objects, SGP4 is better in every quartile. We hypothesise that Starlink TLE fits absorb low-thrust station-keeping into B\*, which SGP4 then extrapolates as drag. This is consistent with published evidence that Starlink prediction errors stem mainly from continuous low-thrust propulsion [lang2025starlink], with manoeuvres every one to two days [liu2024maneuver], and with CelesTrak's comparison of the public Starlink elements against operator-derived ones (median 6.8 km at a median TLE age of 0.6 d on 2026-10-14) [celestrak_supgp]. That B\* specifically absorbs the thrust is not established in the literature. Starlink makes up 70 % of LEO objects in this catalog.

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

**Candidate reduction.** Out of 1,999,000 pairs per 2,000-object seed:

| Screen | Pairs flagged | Reduction | Event recall |
|---|---|---|---|
| ORCA's 1 h, 100 km | 1,378–1,497 | 1,335–1,451× | 1.0–1.2 % |
| 5 min, 100 km | 12,248–12,889 | 155–163× | about 10 % |
| 1 min, 100 km | 29,139–30,751 | 65–69× | 40–42 % |
| 20 s, 100 km | 56,649–60,109 | 33–35× | 88–90 % |
| 20 s, 200 km | 193,600–197,688 | about 10× | 100 % |

The screen that discards the most candidates also discards almost every encounter, so reduction is reported only next to recall.

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

**Monte Carlo cost [Fig. 5].** For the three highest-Pc encounters (Pc ≈ 1.2 × 10⁻⁶), Monte Carlo returns zero hits up to 10⁵ samples. It reaches ±15 % of Foster only at 10⁸ samples. Foster lies inside the 95 % interval in 22 of 24 runs. At the probabilities that matter operationally, Monte Carlo is therefore a validation tool, not a practical estimator.

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
- under B_iso, no encounter is above MEDIUM;
- under B_ric (assumed shape), 471–576 per seed are HIGH;
- under the measured covariance, 1–3 per seed are HIGH, and about half of all encounters are NEGLIGIBLE;
- under the measured covariance floored at ESA's at-epoch values, 1–4 per seed are HIGH.

The measured covariance comes from TLE-to-TLE errors across three snapshots, interpolated by TLE age (§V-A). The floor answers the concern that TLE consistency underestimates error near epoch [kelso2007validation]; it barely matters here, because most TLEs were 2–9 days old at TCA.

Because TLEs carry no covariance, the risk tier is the least defensible output of any TLE-only pipeline, and assumptions alone move it over two orders of magnitude. We therefore report tiers only as conditional on a stated covariance model.

**The corrected pipeline in production.** Pipeline B, with the measured and floored covariance, is now ORCA's production engine:
- Checked against the reference on all three seeds, it finds every encounter except slow pairs deduplicated by design and one at the first grid step.
- Its miss distances agree to a median of 0.5 mm (6 cm worst case).
- On the full catalog (15,970 objects, 24 h) it finds about 426,000 approaches closer than 10 km in about 1.5–2 minutes on a laptop: about 30 HIGH and 800 MEDIUM.

### F. Summary of metrics

Two results not stated above:
- **TCA error in time** follows miss-distance error. Medians over the three seeds: 0.25 s for a 1 s grid, 2.5 s for a 10 s grid, 12 ms for a parabola on d² from a 60 s grid, 0.1 ms for bounded Brent, 2.4 µs for Brent on the range rate.
- **Tier agreement.** ORCA's tiers match Foster's (same covariance) for 49–50 % of encounters, and for 92–93 % within one tier. None of the 455–550 HIGH and CRITICAL events per seed stays in those tiers under Foster. Foster and the exact closed form agree on the tier for 100 % of encounters.

**Table 6. Summary of evaluation metrics (medians, seeds 1–3).**

| Metric | Result |
|---|---|
| Position error | ORCA vs SGP4: 83 km (6 h), 303 km (24 h); with J2: about 11 km at 24 h |
| TCA error | 0.25 s (1 s grid); 12 ms (parabola); 2.4 µs (range-rate roots) |
| Miss-distance error | 371 m (1 s grid); 0.89 m (parabola); below 1 mm (roots); 90 km (ORCA as built) |
| Runtime | KD-tree 8.5 ms per step at 15,913 objects; 2.6 s as built vs 24–25 s corrected (2,000 objects, 24 h) |
| Candidate reduction | 1,300–1,450× at 1 h / 100 km (1 % recall); 10× at 20 s / 200 km (100 % recall) |
| Speedup | KD-tree over brute force: 36× (1,000 objects), 173× (15,913) |
| Pc difference | ORCA = Foster / α²; Foster vs closed form 1e-12 |
| Tier agreement | ORCA vs Foster: 49–50 % exact, 92–93 % within one tier; Kendall τ 0.87 vs 0.41–0.43 |

### G. What the results do not establish

- No result is validated against operational conjunction data messages.
- The R2 reference (a later TLE) is itself imperfect, and manoeuvres between the two epochs count as propagation error.
- The covariance is measured from three snapshots taken over one day. Non-Starlink objects have no usable 1–5 day horizon bin, so the model interpolates across that gap.
- Encounter counts come from 2,000-object subsets of a payload-only catalog over one 24 h window. Counts scale with catalog size; the ratios and recall fractions are what we expect to carry over.
- Runtimes come from one machine and depend on implementation.

---

## VI. CONCLUSION AND FUTURE WORK

### A. Conclusion

We benchmarked each stage of an open TLE-based conjunction-assessment pipeline against a dense reference built from the same public data. Every stage lost accuracy, and the losses compound:

| Stage | As built | Effect |
|---|---|---|
| Propagation | Two-body model treating mean elements as osculating | Drifted ~300 km from SGP4 within a day |
| Screening | 1 h / 100 km snapshots | Saw 1.0–1.2 % of encounters closer than 10 km during their pass, as the sampling law r ≥ d + vΔt/2 predicts |
| TCA refinement | One bounded search over ±6 h | Found the closest approach for 5–6 % of flagged pairs |
| Collision probability | Formula off by exactly 1/α² | Every CRITICAL and HIGH label was an artefact |
| End to end | | About 0.1 % of the encounters closer than 10 km were reported |

**What fixes it.** The fixes are standard but must be applied together, at about nine times the cost:
- SGP4;
- a screening radius matched to the time step;
- root-finding on every approach;
- Foster's integral.

**Covariance.** Measured TLE error is strongly anisotropic (along-track ~100× radial) and much worse for Starlink. Under a measured covariance almost none of these encounters is high-risk, while plausible assumed covariances produce anything from none to hundreds. In a TLE pipeline the tier is decided by the covariance model, not by the encounter geometry. A tool should therefore state its covariance model next to every tier, as NASA's guidance on TLE-based assessment implies [nasa_ca_handbook2020].

### B. Future work

- Daily snapshots over several weeks, to measure error growth with TLE age without interpolation gaps.
- Validation of the screening against the public TraCSS answer key [auman2025], and of P_c against Monte Carlo test cases [alfano2009mc].
- Starlink runs against operator-derived elements [celestrak_supgp], and the debris population, which the `active` catalog excludes.
- A 3D, long-encounter P_c [coppola2012] for co-moving pairs.

