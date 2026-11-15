# Literature verification log

2026-10-14. Three research passes (collision probability; propagation and TLE accuracy; screening, TCA and prior work).
**CONFIRMED** means the source itself was opened: a publisher or Crossref DOI record, an agency PDF, or the author's page.
**SECONDARY** means the source was seen only in other papers' reference lists; re-check these before submission.
BibTeX for everything: [references.bib](references.bib).

## 1. Corrections to our own text

| Where | Was | Now |
|---|---|---|
| Brief and draft, Exp 3 | "Brent root-finding of the range rate [VERIFY: Alfano & Negron 1993]" | Alfano & Negron 1993 fit **cubic polynomials to the distance waveform** and find their real roots (abstract only, SECONDARY). Part II (Alfano 1994) uses relative velocity. Our method is range-rate root-finding with Brent's method [brent1973]. Cite Alfano & Negron only as related work. |
| Brief, filters | "Rodríguez, Martínez Fadrique & Klinkrad 2002" | The first author is **Alarcón-Rodríguez** [alarcon2002] (SECONDARY). |
| Brief, Section 7 / Exp 4 | Risk tiers "described as NASA CARA / ESA calibrated" | Now sourced. NASA CA Handbook 2020, best practice 6.3.B: "Pursue mitigation if the Pc value exceeds 1E-04" [nasa_ca_handbook2020]. ESA: 1/10,000 is a "quasi-standard … presumably often applied without being scrutinized" [merz2019]. |
| Brief, Section 1 row 11 | Anisotropy [VERIFY: Flohrer et al. 2008] | Cite the 2009 SDC5 paper instead, which was opened: [flohrer2009improving]. The AMOS 2008 paper is SECONDARY. |

## 2. Findings that change or qualify our results

1. **TLE-to-TLE comparison underestimates error near epoch.** Kelso 2007 [kelso2007validation], conclusion 2: TLE consistency analysis "does reasonably approximate the true error of a TLE prediction … although it does underestimate it near the epoch". Flohrer et al. 2009 give LEO uncertainties **at epoch** of 0.102 / 0.471 / 0.126 km (radial / along-track / cross-track, n = 8,454). Our young-TLE values, 0.014 / 0.16 / 0.014 km at 0.33 d for non-Starlink objects, are 3–9× smaller.
   - **Consequence:** our measured covariance is probably too tight at short ages. The Exp 4/5 "0–3 HIGH" result is therefore likely optimistic. A larger σ moves km-scale misses out of the dilution region and raises Pc.
   - **Action:** state this in the paper, and add a variant with a floor at the Flohrer epoch values.
2. **Starlink: the hypothesis now has support.**
   - CelesTrak publishes "SupGP" Starlink elements fitted to SpaceX ephemerides, at a separate endpoint (`sup-gp.php?FILE=starlink`). Our `GROUP=active` data is the regular 18 SDS GP.
   - CelesTrak's own comparison table (2026-10-14 snapshot, parsed in this pass, 10,451 Starlinks): 18 SDS GP vs SupGP median **6.8 km** (IQR 2.8–15.8 km) at median GP age 0.61 d; SupGP vs SpaceX ephemeris median 0.22 km.
   - Lang & Jiang 2025 [lang2025starlink]: Starlinks use "continuous low-thrust electric propulsion", and prediction errors come mainly from thrust and manoeuvre modelling.
   - Liu et al. 2024 [liu2024maneuver] (SECONDARY content): frequent manoeuvres lower TLE accuracy.
   - Jankovic 2026 [jankovic2026] (unrefereed) gives Starlink TLE-to-TLE error of about 1 km at 6 h and about 38 km at 7 d.
   - Not found: any peer-reviewed proof that B\* specifically absorbs thrust. Vallado 2006 says only, in general, that B\* has "soaked up" force-model errors.
   - **Wording:** "consistent with low-thrust station-keeping being absorbed into the fitted elements". Do not claim it as proven.
3. **NASA does not recommend TLE-based conjunction assessment.** NASA CA Handbook Sec. 1: TLE-based CA "is not recommended because the TLE accuracy is not sufficient". App. E: SGP4 TLEs lack "a meaningful covariance". This supports the framing: we measure *how* insufficient, stage by stage.
4. **TLEs are model-specific.** STR#3 [hoots1980str3]: "inputting NORAD element sets into a different model … will result in degraded predictions." This is the citation for Section 1, row 4 (two-body on TLEs is a model mismatch). STR#3 and Vallado 2006 also confirm the Kozai → Brouwer conversion that our J2 tier needed.
5. **Error growth reference.** Levit & Marshall 2011: SGP4 TLE error grows about 1.5 km/day against ILRS precise orbits. Its preprint also says all-vs-all screening for 7 days takes about a minute on ~200 cores.
6. **Low-relative-velocity encounters.** Coppola 2012 handles "long-term encounters where the assumptions required by short-term formula are not met". Alfano 2009 gives low-velocity error bounds. Cite both for Exp 4b.

## 3. Closest prior work (research gap)

| Work | Did | Did not |
|---|---|---|
| George & Harvey 2011 [georgeharvey2011] | Six screening tools on the public TLE catalog (11,807 objects, 7 d, 10 km). Missed conjunctions per tool (33–326, from orbit-path filter pads). TCA and range agreement. | No sweep of time step or radius; no Pc; no open code. |
| Auman et al. 2025 [auman2025] and the Aerospace / Office of Space Commerce test set (Mar 2026, CC0) | Screening accuracy requirements; a public answer key built from Space-Track TLEs of 1 Jan 2025 with CSieve | Pc explicitly excluded; no time-step sweep. **Usable as external ground truth for our screening.** |
| Woodburn et al. 2009 [woodburn2009] | Filter-induced misses (4 of 5,338) and speedups | No recall vs sampling step; no Pc |
| George 2011; Budianto-Ho et al. 2014 | k-d tree / spatial hash / sweep screening over **swept** per-Δt volumes (conservative by design) | Do not measure recall loss of point-snapshot screening, because they avoid it |
| Medhin & Servadio 2026 [medhin2026] | Quantify "boundary blindness" of snapshot grid screening (miss rate 7.09 % → 0.55 %), temporal vs geometric | Synthetic / statistical (MOCAT-MC) setting, not TLE conjunction assessment |
| Sonawane 2026 [sonawane2026] (abstract only) | Python grid and k-d tree screening vs brute force on CelesTrak SGP4 data (~15,800 objects): 61× fewer pairs, same pairs; TCA and Pc | **Unknown:** whether it sweeps time step, compares Pc formulas or audits TCA. **Read before writing the gap.** |
| Stevenson et al. 2023 | ML screening vs classical filters | Simulated data, not TLEs |
| Orekit 12 [orekit12] | Ships short-term Pc methods (Alfano, Patera, Chan, Laas, Alfriend) | No catalog screening module found |
| COVGEN (Peterson et al. 2001, SECONDARY) | Covariance estimated from historical TLE series | Prior art for our measured covariance: cite it, do not claim the idea |

**Gap we can state honestly:**
- Not found in the literature: a sweep of snapshot-screening recall against time step, by radius and relative velocity, on public TLEs.
- Not found in the literature: one open pipeline that attributes accuracy loss stage by stage (screening → TCA → Pc) and audits an existing tool.
- **Not novel:** k-d tree screening, Pc from TLEs, the Pc formulas themselves, estimating covariance from TLE history.

## 4. Still to do before submission

- Read Sonawane 2026 and Medhin & Servadio 2026 in full.
- Check Alfano's AGI "Review of Conjunction Probability Methods for Short-term Encounters" before calling a Pc-formula comparison new.
- Fill the TITLE-TODO fields in references.bib from their DOI / arXiv pages.
- Re-check every SECONDARY entry, or drop it.
- **Optional, and they would strengthen the paper:**
  - validate Exp 2b against the Auman/Aerospace screening answer key;
  - rerun Exp 1 for Starlink against CelesTrak SupGP;
  - add a covariance variant floored at the Flohrer epoch values.

## 5. Full reading of the closest work (2026-10-15)

**Sonawane 2026 [sonawane2026]: a speed / HPC paper.**
- **Pipeline:** CelesTrak active TLEs (15,830 objects), SGP4, grid and k-d tree screening against brute force (about 61x fewer pair checks), a parabolic TCA, Foster Pc with assumed per-regime covariance, and tiers. Code: github.com/Aditya29072002/Satellite-Conjunction-Assessment.
- **Not done:**
  - no time-step sweep, recall or ground truth: only "a snapshot misses pairs", stated qualitatively;
  - no relative-velocity conditioning;
  - TCA and Pc accuracy are never evaluated;
  - no measured covariance.
- **Effect on our claims:** contributions 1-3 are not covered. It is the same kind of open pipeline our audit approach applies to.

**Medhin & Servadio 2026 [medhin2026]: synthetic debris-evolution study (cube method and an overlapping "Double Cube").**
- **What it shows:** snapshot sampling misses collisions: 7.09 % (cube) vs 0.55 % at a 0.5 s interval, split into temporal and spatial parts.
- **Not done:** no TLEs, two step values only, no velocity conditioning, no TCA, no 2D Pc.
- **Effect on our claims:** related evidence for contribution 1, not a duplicate.

**Alfano 2007 [alfano2007review]: numerical comparison of Foster, Chan, Patera and Alfano 2D Pc.**
- **Scope:** about 60,000 encounter-plane cases against a 1e-9-tolerance integral. All four are accurate to about 2+ significant figures; Foster is the slowest.
- **Effect on our claims:** comparing Pc formulas is prior art; cite it, do not claim it. Our finding is different: an audit of a formula as implemented in a working tool, and its effect on tiers and rankings end to end.

**Novelty, final wording:**
1. A sweep of snapshot-screening recall against time step, by radius and relative velocity, on public TLEs.
2. Stage-by-stage attribution of accuracy loss in one open pipeline, including an audit of a working tool (Pc off by 1/alpha^2, end-to-end recall ~0.1 %) and a validated correction.
3. The swing in risk tiers between assumed and measured (TLE-to-TLE, ESA-floored) covariance.

**Prior art to cite, not claim:** k-d tree / grid screening (budianto2014; sonawane2026), Pc formulas and their comparison (alfano2007review; li2022review), covariance from public TLE data (peterson2001covgen), and snapshot blindness in a synthetic setting (medhin2026).

All TITLE-TODO entries in references.bib are now filled.
## 6. Second check of SECONDARY entries (2026-10-15)

| Entry | Now | Note |
|---|---|---|
| flohrer2008assessment | CONFIRMED (amostech.com) | pages from a secondary list |
| georgeharvey2011 | CONFIRMED (amostech.com, poster) | |
| woodburn2009 | CONFIRMED (AGI PDF; Univelt Vol. 135, 2010) | pages secondary |
| alfano2009mc | volume CONFIRMED (Univelt Vol. 134) | pages secondary |
| alfano2007review | number and volume CONFIRMED (Vol. 127) | the quoted pp. 719-746 conflicts with the 44-page length: omitted |
| liu2024maneuver | abstract CONFIRMED | manoeuvre frequency only (about every 2 d in Shell 1, about daily in Shells 2-5); **says nothing about TLE accuracy**. Text reworded: Liu for manoeuvre frequency, Lang & Jiang for prediction error |
| foster1992 | SECONDARY | not on NTRS; August 1992 per two citing papers |
| alfano1993 | SECONDARY | no DOI exists (JAS on Crossref starts at vol. 45) |
| alarcon2002 | SECONDARY | ADS blocked; editors Battrick & Preyssl per a library record |
| peterson2001covgen | SECONDARY (pages) | Vol. 108 fits the meeting; pp. 201-214 per George (AMOS 2012) |

**Still SECONDARY:** foster1992, alfano1993, alarcon2002, and the pages of peterson2001covgen. All are standard, widely cited works; keep them, but these are the ones to check in a library before submission.
