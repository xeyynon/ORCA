# External Research

> Log of outside systems, data and tools ORCA depends on or learned from. Each entry says what was checked, what was found, and where it came from, so it can be repeated.
> Sources: ORCA's own decision log and observed behaviour, and the literature review summarised in [LEO_Conjunction_Project_Context.md](LEO_Conjunction_Project_Context.md). Anything not checked at its source says so.

## 1. Celestrak (the data source)

| Item | Finding | Basis |
|---|---|---|
| Endpoint | `https://celestrak.org/NORAD/elements/gp.php`, 3-line TLE text, selected by `GROUP` | Used by `CelestrackClient.fetch_group` |
| `last-30-days` group | Returned **404** on 2026-08-18. Removed or renamed. | Observed, [DECISIONS.md](DECISIONS.md) |
| `active` group | Returned 200 with real data. ~2.7 MB, ~48k lines, roughly 9-16k objects. After a refresh on 2026-10-03 the catalog held 15,968 objects. | Observed |
| Rate limiting | Repeated `active` requests in a short window returned **403 Forbidden**. `stations` (~20 objects) kept returning 200. Looks volume-based and transient, not a permanent block. | Observed 2026-08-18 |
| Failure shape | ORCA swallows the failure into an empty list, so a 403 looks like zero results. | Code and [TASKS.md](TASKS.md) |

How to repeat: `curl -s -o /dev/null -w "%{http_code}\n" "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"`. Use `stations` for smoke tests. Do not hammer `active`.

Not yet checked: Celestrak's published usage and rate guidance, and whether `FORMAT=json` or OMM would give richer fields than TLE text.

## 2. TLE and SGP4

- **TLEs carry no covariance** (Flohrer et al. 2009; NASA CA Handbook 2020). ORCA's uncertainty model, `CovarianceModel` in `conjunction_detection.py`:
  - is measured from successive public TLEs (2026-10-14, three snapshots);
  - has non-Starlink LEO in-track σ of 0.16 km at 0.33 d and 14.6 km at 6.3 d, with radial about 100× smaller;
  - puts Starlink about 15× higher in-track;
  - is floored at ESA's at-epoch LEO values, 0.102 / 0.471 / 0.126 km (Flohrer et al. 2009), because TLE-to-TLE comparison underestimates error near epoch (Kelso 2007).
  - It replaced the assumed `0.5 km + 2 km/day` isotropic σ on 2026-10-15.
- **The `sgp4` PyPI package** is a hard dependency (`>=2.23`; 2.27 used). It wraps the reference C++ SGP4 of Vallado et al. 2006. Since 2026-10-15, ORCA's `SGP4Propagator` is real SGP4. The old two-body + drag model measured 297 km median error at 24 h; it is kept as `TwoBodyDragPropagator`.
- **TLEs are SGP4-specific mean elements** (Spacetrack Report #3). SGP4 first converts the Kozai mean motion to Brouwer's form; a J2 model must use Brouwer, or it double-counts J2 (found the hard way in Exp 1).
- `sgp4` returns mean motion (`no_kozai`) in rad/min. ORCA stores rad/s, so divide by 60. A past unit bug lived here.
- Reference implementation named in the proposal: Vallado, Crawford, Hujsak and Kelso (2006), *Revisiting Spacetrack Report #3*, AIAA 2006-6753.

## 3. Prior work

From the project literature review (Pass B, August 2026). Citations were verified at source by that review unless noted. This file did not re-verify them.

| Work | Why it matters to ORCA |
|---|---|
| **SOCRATES** (Kelso and Alfano, 2005), CelesTrak | Public daily screening of active payloads against the public catalogue, running since 2004. One-vs-all. ORCA's pipeline is similar in spirit but all-vs-all and open. Know its outputs and limits before a viva. |
| **Stevenson, Rodriguez-Fernandez, Urrutxua and Camacho (2023)**, *Adv. Space Res.* 72(7) | Closest published work: benchmarks deep-learning all-vs-all screening. Uses high-fidelity simulated ephemerides with non-public datasets. Does not measure the penalty of using public TLEs. Primary reference. |
| **Levit and Marshall (2011)**, *Adv. Space Res.* 47(7):1107-1115 | Improved orbit prediction from TLEs. SGP4 TLE error grows about 1.5 km/day against precise orbits. Also reports all-vs-all checking on ~200 cores in about a minute, so frame the motivation as accessibility, not impossibility. Volume and pages confirmed via the DOI. |
| **Li, Yang and Luo (2022)**, *Astrodynamics* 6(2) | Review of collision-probability methods. Background for the Foster Pc ORCA uses since 2026-10-15. |
| **Hoots, Crawford and Roehrich (1984)**, *Celest. Mech.* 33 | Analytic close-approach method. Basis of the classic filter family (apogee-perigee, geometric, time). |
| **Orekit** | Confirmed 2026-10-14: since 12.0 its SSA package has short-term Pc methods (Alfano, Patera, Chan, Laas, Alfriend). No catalog screening module was found. |

Open positioning question (from the review): its Gap 2 would quantify the screening penalty of public TLE/SGP4 data against high-fidelity ephemerides. The proposal kept the safer scenario-comparison framing.

**Update 2026-10-14/15.** Every source used by the paper was re-checked at source. The full log, including the closest prior work (George & Harvey 2011, Medhin & Servadio 2026, Sonawane 2026, Auman et al. 2025, Alfano 2007), is in [literature_verification.md](literature_verification.md), with BibTeX in [references.bib](references.bib).

**Starlink.** CelesTrak publishes Starlink *supplemental* elements fitted to SpaceX ephemerides, at `sup-gp.php?FILE=starlink`, separate from `GROUP=active`. On 2026-10-14 its comparison table put the regular Starlink TLEs a median 6.8 km from them at a median age of 0.6 d.

## 4. Pc thresholds and hard-body radii

- Risk tiers: CRITICAL above 1e-4, HIGH 1e-5, MEDIUM 1e-6, LOW 1e-7. The CRITICAL boundary is now sourced:
  - NASA's CA Handbook (NASA/SP-20205011318, 2020), best practice 6.3.B: "Pursue mitigation if the Pc value exceeds 1E-04".
  - ESA (Merz et al. 2019) calls 1/10,000 a "quasi-standard".
  - The lower boundaries are ORCA's own.
- Hard-body radii are looked up by name keyword (Starlink 5.65 m, OneWeb 4.0 m, Iridium 3.9 m, CubeSat 0.5 m, debris 0.1 m, other 3.0 m). These are ORCA's own assumptions. A name containing no keyword gets 3.0 m whatever the object is.

## 5. Front-end libraries

- three.js (`^0.186.1`) for the globe, React 19, Vite 8. The old Streamlit dashboard (removed) inlined three.js r128 and loaded Plotly from a CDN.

## 6. To research next

1. Celestrak's stated rate limits and caching guidance, to design a backoff.
2. Whether Space-Track CDMs could validate ORCA's Pc on a few known events (needs an account).
3. ~~Verify the CARA/ESA threshold source~~ Done 2026-10-14 (NASA CA Handbook; Merz et al. 2019).
4. ~~Verify Orekit's conjunction API~~ Done 2026-10-14 (Pc methods yes, catalog screening no).
5. ~~Compare ORCA's propagated positions against `sgp4`~~ Done 2026-10-03, and the engine moved to SGP4 on 2026-10-15. Next: split TLE error by altitude, eccentricity and TLE age.
6. Validate screening against the public TraCSS answer key (Auman et al. 2025, CC0).
7. Compare Starlink TLEs against CelesTrak SupGP (operator-derived) elements.
