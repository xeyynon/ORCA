# Learning guide: what we did, and why

A walk-through of the whole working session (2026-10-14 to 2026-10-15), from the brief you pasted at the start to the paper and the fixed app. Read it in order: each part builds on the one before. Every number here comes from a file in the repository.

---

## Part 1. Where we started: the brief you pasted (v1)

The brief described an **8-page conference paper** that would compare algorithms at each stage of a TLE-based conjunction pipeline:

```
TLE input -> orbit propagation -> conjunction screening -> time of closest approach (TCA) -> collision probability (Pc) -> risk tier
```

It proposed four "baseline vs alternative" pairs:

| Stage | Baseline | Alternative |
|---|---|---|
| Propagation | Two-body (Kepler) | SGP4 |
| Screening | Brute force (all pairs) | KD-tree |
| TCA | Fixed time-step search | Brent's method |
| Collision probability | Foster (analytical) | Monte Carlo (numerical) |

Around those pairs it also set out:
- four experiments, with prediction horizons, catalog sizes, time steps and Monte Carlo sample counts;
- risk categories based on miss distance;
- hypotheses H1–H4;
- an IEEE-style paper outline (I Introduction … VI Conclusion);
- strong rules: never invent results or citations, and separate what is confirmed from what is proposed.

**The key thing the brief did not know:** it was written without looking at the ORCA code. ORCA already existed and already ran most of this pipeline, so the first job was to compare the brief with reality.

---

## Part 2. The concepts, in plain words

**TLE (two-line element set).** Two lines of numbers describing an object's orbit at one moment (its *epoch*). The US Space Surveillance Network publishes them for the whole catalogue, and CelesTrak redistributes them for free. Two things matter:
- TLEs are **mean elements**: smoothed values designed for one specific prediction model, SGP4. Feeding them to a different model gives wrong answers, even if that model is "more accurate".
- TLEs carry **no covariance**: no statement of how uncertain they are.

**Propagation.** Predicting where an object will be at a later time.
- **Two-body / Kepler:** the Earth as a perfect sphere. Simple, but it ignores the Earth's equatorial bulge (J2), so the orbit plane is wrongly held fixed.
- **SGP4:** the model TLEs are fitted for. It includes J2, drag and more.
- **Error grows with time** since the TLE epoch. Typical TLE error is about a kilometre near epoch and much more days later.

**RIC frame.** Errors are split into **R**adial (up and down), **I**n-track (along the direction of motion) and **C**ross-track (sideways). TLE errors are mostly in-track, because a small timing error moves the object along its path.

**Conjunction screening.** Finding which pairs of objects come close. A catalog of 16,000 objects has 128 million pairs, so screening has to be fast.
- **Snapshot screening:** compute every position every Δt seconds, and at each snapshot find the pairs closer than a radius r.
- **KD-tree:** a spatial index that finds close pairs without checking all of them.
- **The catch:** a fast pass can happen *between* two snapshots. It is guaranteed to be caught only if **r ≥ d + v·Δt/2**, where d is the miss distance and v the relative speed (up to ~15 km/s in low orbit).

**TCA (time of closest approach).** The moment the two objects are nearest; the distance at that moment is the **miss distance**.
- **Grid search:** take the smallest sampled distance. Coarse.
- **Brent's method:** a classic, robust way to find a minimum, or a root, of a function.
- **Range-rate root:** at closest approach the distance stops shrinking. Mathematically, Δr·Δv = 0, which is a root that can be bracketed and solved.
- **Parabola on d²:** for straight-line motion, distance² is exactly a parabola in time, so three samples locate the minimum.

**Collision probability (Pc).**
1. Take the uncertainty (a Gaussian "cloud") of the relative position at TCA.
2. Project it onto the **encounter plane**, the plane perpendicular to the relative velocity.
3. Compute how much of the cloud falls inside a disc whose radius is the combined size of the two objects (the **hard-body radius**).
- **Foster's method** computes that integral numerically.
- **Monte Carlo** samples random positions and counts hits. For a Pc of 10⁻⁶ it needs ~10⁸ samples to be accurate to 10 %.
- **α (alpha)** is the miss distance divided by the uncertainty σ: how many "sigmas" away the miss is.
- **Short vs long encounter:** the standard 2D model assumes a fast, straight-line pass. Slow, co-moving pairs (< 0.1 km/s) break that assumption.

**Risk tiers.** Bands of Pc: CRITICAL > 10⁻⁴, HIGH > 10⁻⁵, MEDIUM > 10⁻⁶, LOW > 10⁻⁷, otherwise NEGLIGIBLE. NASA recommends taking action above 10⁻⁴.

**Recall.** Of all the true encounters, the fraction a method found.

**Kendall τ.** How similar two rankings are: 1 means identical, 0 means unrelated.

---

## Part 3. What the v1 brief got wrong (checked against the code)

We created a branch, read ORCA's code and its existing measurements, and rewrote the brief as **v2** (`MD/research_paper_brief.md`, Section 1 lists 17 corrections). The important ones:

1. **ORCA's "SGP4Propagator" was not SGP4.** It was two-body motion plus a drag term. The production pipeline was *already* the "baseline".
2. **Two-body vs SGP4 does not measure accuracy.** TLEs are SGP4's mean elements, so two-body is a model mismatch. Accuracy needs an independent reference, such as the object's *next* TLE.
3. **KD-tree vs brute force can only differ in speed.** The KD-tree search is exact, so both return the same pairs. The real problem was the **time step**: ORCA screened once an hour at 100 km, which almost guarantees missing fast passes.
4. **ORCA already used Brent**, but over a ±6 h window that contains many approaches, so it often found the wrong one.
5. **ORCA's Pc formula was wrong.** It equals the correct value divided by α², which inflates close approaches up to ~400×.
6. **The Monte Carlo sample counts (10³–10⁵) were far too small** for Pc around 10⁻⁶.
7. **The risk tiers should be Pc-based**, not miss-distance-based. ORCA already used Pc tiers.
8. **LEO–GEO isn't a real conjunction class:** those orbits don't cross.
9. **The catalog was ~16,000 active payloads with no debris**, not 50,000 objects.

**Lesson:** always check a plan against the real system before running experiments.

---

## Part 4. The experiments, one by one

All experiments use **frozen catalog snapshots** (with sha256 checksums), **fixed random seeds** (1, 2, 3), and a **dense reference** built from the same data. Code is in `benchmarks/`, results in `benchmarks/results/`.

### Exp 2b: screening recall

- **Question:** what fraction of real close approaches does a snapshot screen catch?
- **Method:**
  1. Propagate 2,000 LEO objects with SGP4 every 10 s for 24 h. This is the reference: it provably catches every encounter under 10 km.
  2. Replay screens with steps from 20 s to 1 h and radii from 10 to 200 km.
- **Result:** ORCA's 1 h / 100 km screen caught **1.0–1.2 %** of encounters during their pass. A 20 s / 200 km screen caught 100 %.
- **Physics check:** the formula 2r/(v·Δt) predicted ~0.56 % for fast passes, which matches.
- **Lesson (a mistake we fixed):** my first scoring counted a flag from a *different* pass of the same pair, which made coarser steps look better. Counting only the encounter's own pass fixed it. Always sanity-check that a metric behaves monotonically.

### Exp 2a: screening speed

- **Result:** KD-tree vs brute force gave identical pairs at every size, with the KD-tree 36× faster at 1,000 objects and 173× faster at 16,000 (8.5 ms per step).
- **Lesson:** speed was never the problem. Recall was.

### Exp 3: TCA

- **Local accuracy:**
  - a plain grid is a bad miss-distance estimator: even a 1 s grid is off by ~350 m, because at 10 km/s half a second is 5 km;
  - a parabola on d² from a 60 s grid gets ~1 m from 4 evaluations;
  - range-rate root-finding is essentially exact.
- **ORCA's ±6 h Brent search** found the true closest approach for only **5–6 %** of pairs.

### Exp 4: collision probability

- **On identical inputs**, ORCA's Pc equalled Foster's divided by α², exactly.
- **Consequence:** every one of its CRITICAL and HIGH labels became MEDIUM or LOW under the correct formula.
- **ORCA's "risk ranking" was really a miss-distance ranking** (τ = 0.87). The correct Pc ranks events very differently (τ ≈ 0.42).
- **Monte Carlo convergence:** at Pc ≈ 10⁻⁶ there were zero hits up to 10⁵ samples, and it was within 15 % only at 10⁸.
- **Exp 4b (curved paths):** the straight-line model is fine above 0.1 km/s and ~6× too low for slow, co-moving pairs.

### Exp 1: propagation

| Reference | Finding |
|---|---|
| R1, against SGP4 of the same TLE | ORCA's model drifted ~300 km in a day. Adding J2 kept it to ~11 km. |
| R2, against the next TLE | Real TLE error is strongly elongated: in-track ≈ 100× radial. Starlink is ~15× worse in-track, and SGP4 is even worse than plain J2 for Starlink, growing with the drag term B* (likely thrust absorbed into the elements). |

**Lessons (two mistakes we caught):**
- The first J2 model double-counted part of J2. TLE mean motion is Kozai's, SGP4 uses Brouwer's. Testing my rates against SGP4's own rates caught it.
- With only two snapshots, every object had the same ~6-day gap. Your third snapshot added short horizons, which made a measured covariance possible.

### Exp 5: end to end

| | ORCA as built | Corrected pipeline (SGP4 + 20 s / 200 km screen + root-finding + Foster) |
|---|---|---|
| Encounters < 10 km found | 6–8 of ~6,500 (~0.1 %) | essentially all |
| Median miss-distance error | ~90 km | under a millimetre |
| Runtime | 1× | ~9× |

**The covariance result.** For the *same* encounters, the number of HIGH events depended almost entirely on the assumed uncertainty:

| Uncertainty used | HIGH events per seed |
|---|---|
| ORCA's isotropic σ | 0 |
| Assumed elongated shape | ~500 |
| Measured TLE-to-TLE | 0–3 |
| Measured, with ESA's at-epoch values as a minimum | 0–4 |

**Main message of the paper: in a TLE pipeline, the covariance model, not the geometry, decides the risk tier.**

---

## Part 5. Checking the literature

Three research passes, then two follow-ups, checked every citation at its source. The results are in `MD/references.bib` and `MD/literature_verification.md`.

**What we learned:**
- **NASA's handbook** says TLE-based conjunction assessment "is not recommended because the TLE accuracy is not sufficient". That supports our framing: we measure *how* insufficient.
- **Closer prior work exists**, so the novelty claim was narrowed honestly:
  - George & Harvey 2011 compared screening tools;
  - Medhin & Servadio 2026 showed snapshot blindness, but on synthetic data;
  - Sonawane 2026 built a similar pipeline but measured only speed;
  - Alfano 2007 already compared Pc formulas.
- **Our three contributions:**
  1. recall vs time step on public TLEs;
  2. a stage-by-stage audit of a working tool;
  3. measured vs assumed covariance.
- **Corrections from the checks:**
  - Alfano & Negron 1993 is not range-rate root-finding;
  - the "smart sieve" first author is Alarcón-Rodríguez;
  - Liu et al. 2024 is about manoeuvre frequency, not TLE accuracy;
  - Kelso 2007 warns that TLE-to-TLE comparison underestimates error near epoch, which is why we added ESA's floor.

**Lesson:** a citation must support the exact sentence it is attached to.

---

## Part 6. Fixing the app (making it honest)

**Protecting the baseline first:**
- The original code is tagged `orca-as-built-2026-10-14`.
- Frozen copies live in `benchmarks/legacy/`, so the paper's baseline can always be reproduced.

**Engine v2** (`conjunction_detection.py`):
- real SGP4;
- a 20 s screen with a radius that guarantees no miss;
- a parabola plus exact SGP4 refinement;
- vectorised Foster Pc;
- measured, ESA-floored uncertainty per object;
- long encounters flagged.

**Checking it:**
- Against the reference, every encounter was found and miss distances agreed to 0.5 mm.
- On the full catalogue: ~426,000 approaches under 10 km per day, found in ~1.5–2 minutes.

**The honest UI** (Conjunctions page):
- no step control;
- a "How this list is made, and what it cannot tell you" panel, written by the server;
- counts over *all* approaches ("Top 100 of 426,632");
- uncertainty and TLE-age columns;
- "Long" badges;
- a probability note saying tiers depend on the assumed uncertainty.

**Also built:**
- An **evaluator login panel** on the sign-in page.
- **Screenshots** taken with a headless Chrome driver. They caught three UI bugs:
  - "1σ" displayed as "1Σ";
  - "d^2" printed as text;
  - a clipped TCA column.

**Not live yet:** nothing is pushed, so the hosted site still runs the old engine.

---

## Part 7. The paper

| File | What it is |
|---|---|
| `MD/paper_draft.md` | The full draft, Sections I–VI (~5,000 words), with every claim cited or traced to a result |
| `paper/main.tex` | The 8-page IEEE conference version: 7 figures, 4 tables, 40 references. Compile it on Overleaf. |
| `benchmarks/figures/` | The figures, built only from result files |

---

## Part 8. Good research habits used throughout

1. **Freeze your data.** Snapshot files with sha256 manifests; never refetch mid-study.
2. **Build a reference you can trust.** Use a dense search with a mathematical guarantee (r ≥ d + vΔt/2), not "the other method".
3. **Check the code against the claim.** A class called "SGP4Propagator" was not SGP4.
4. **Validate before believing.**
   - Foster was checked against an exact formula.
   - Monte Carlo was checked against Foster.
   - The J2 rates were checked against SGP4's own.
   - Results were repeated over 3 seeds.
5. **Predict, then compare.** The sampling law predicted the recall before we measured it.
6. **Keep the baseline reproducible after fixing it.** Use tags and frozen copies.
7. **Say what you did not establish.** Every results section ends with limitations.
8. **Cite what you read, and only for what it says.**

---

## Part 9. Run it yourself

```powershell
# Daily: new snapshot, refit the uncertainty, rerun Exp 4 and Exp 5
powershell -ExecutionPolicy Bypass -File benchmarks\refresh_measured.ps1

# Individual experiments (from the repo root, using the project .venv)
.venv\Scripts\python.exe benchmarks\screening_recall.py --n 2000 --hours 24 --seed 1
.venv\Scripts\python.exe benchmarks\tca_estimation.py
.venv\Scripts\python.exe benchmarks\pc_comparison.py
.venv\Scripts\python.exe benchmarks\end_to_end.py
.venv\Scripts\python.exe benchmarks\figures.py

# Tests
.venv\Scripts\python.exe -m unittest discover -s tests
cd frontend; npm test; npm run typecheck
```

---

## Part 10. Practice questions (viva preparation)

1. Why can't you feed a TLE into a two-body propagator and call the result accurate?
2. Derive why a snapshot screen with step Δt and radius r always catches an encounter with miss d and speed v if r ≥ d + vΔt/2.
3. Why did KD-tree and brute force give *identical* candidates, and what was the real screening problem?
4. Why is d², not d, exactly quadratic in time for straight-line motion, and why does that matter for TCA?
5. Why did ORCA's ±6 h Brent search usually find the wrong approach?
6. Show why ORCA's Pc formula is wrong by a factor of 1/α². Which events does it overstate?
7. How many Monte Carlo samples do you need for Pc = 10⁻⁶ at 10 % relative error, and why?
8. What is the encounter plane, and when does the 2D (short-encounter) model fail?
9. Why is TLE error mostly in-track? What did we measure for radial vs in-track?
10. Why might SGP4 do *worse* than plain J2 for Starlink?
11. What does "the covariance decides the tier" mean, and what evidence supports it?
12. What did prior work already do, and what exactly is new in this paper?
13. What does this study *not* establish?
