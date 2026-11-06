# LEO Conjunction Screening & Risk Analysis — Session Context

**Compiled:** 18 August 2026
**Purpose:** Complete record of the project brief, the proposal document produced, and the decisions taken in this session.

> Scope note: everything below is drawn from what was actually stated in this session or read from the attached project. Nothing has been added from outside those sources. Items that were not verified are marked as such.

---

## Part 1 — Project Brief (as provided by the user)

### 1.1 Project identity and purpose

- This is a **capstone + research-paper project**.
- Domain: **Low Earth Orbit (LEO) conjunction screening and collision-risk analysis**.
- The project should be **moderately basic/achievable**, but still academically defensible and connected to a research paper.
- The user is a **beginner in this field** and wants a project that can be understood and defended in a viva.
- The project is also being considered as a research credential for a future **Germany-focused MS/M.Tech/research application**.
- The current project should not require inventing a completely new algorithm.
- The intended contribution is a **scenario-based comparative evaluation** of existing/simple methods.

### 1.2 The core distinction

**Conjunction screening** — the first stage asks:

> Which pairs of orbital objects could come sufficiently close to warrant further analysis?

**Conjunction analysis / risk analysis** — after a candidate conjunction is found, the next stage evaluates:

- Time of Closest Approach (TCA)
- Miss distance
- Relative velocity
- Uncertainty/covariance where available
- Potential collision risk
- Potentially Probability of Collision (Pc)

Core distinction:

> **Screening ≠ collision-risk assessment.**

### 1.3 General pipeline

```text
Public orbital data
→ Orbit propagation
→ Candidate-pair screening
→ Conjunction analysis
→ TCA / miss distance / relative velocity
→ Risk analysis
→ Risk ranking
```

---

## Part 2 — Team and Administrative Details

| Field | Value |
|---|---|
| Project Type | Capstone Project with associated research paper |
| Domain | Space Situational Awareness / Orbital Mechanics / Data Analysis |
| Primary Tools | Python, SGP4 / Skyfield, Orekit, public TLE catalogue data |
| Faculty Guide | Asish Kumar Dalai |
| Faculty ID | 70054 |
| Department ID | 627 |
| Date | August 2026 |

### Team members (in the order used on the proposal)

| # | Name | Registration Number |
|---|---|---|
| 1 | Surya Pratik | 23BCE8602 |
| 2 | Abhinav Pentani | 23BCE8597 |
| 3 | Shaik Saifuddin | 23BCE7306 |
| 4 | Aditi Sharma | 23BCE8592 |

> Note: 70054 was read as the Faculty ID and 627 as the Department ID based on their column positions in the screenshot supplied. This was flagged to the user for confirmation and has not been independently verified.

---

## Part 3 — Proposal Document Content

This is the full text of the delivered PDF, `LEO_Conjunction_Project_Proposal.pdf` (3 pages, A4).

**Title:** Conjunction Screening and Collision-Risk Analysis of Objects in Low Earth Orbit
**Subtitle:** A Scenario-Based Comparative Evaluation Using Public Orbital Data

### 1. Background and Motivation

Low Earth Orbit (LEO) has become congested with active satellites, spent rocket bodies and fragmentation debris. As object density increases, the probability that two catalogued objects pass dangerously close to one another rises accordingly, and operators must decide — often daily — whether a predicted close approach justifies an avoidance manoeuvre. Because manoeuvres cost propellant and mission time, the decision depends on being able to distinguish a genuinely hazardous encounter from a merely close one.

Operationally this is handled as a two-stage process. The first stage, **conjunction screening**, asks a coarse question: which pairs of objects in a large catalogue could come close enough to be worth examining at all? The second stage, **conjunction (risk) analysis**, takes each surviving candidate pair and characterises the encounter precisely — its time of closest approach (TCA), miss distance, relative velocity and, where uncertainty information is available, its probability of collision. The distinction matters and is the conceptual backbone of this project: **screening is a filter, not a risk assessment**. A pair flagged by screening is a hypothesis; only the analysis stage decides whether it is a threat.

### 2. Problem Statement

Screening a full LEO catalogue pairwise is computationally expensive, so practical systems apply cheap geometric filters first. These filters trade accuracy for speed: a filter that is too loose passes an unmanageable number of candidates forward, while one that is too tight risks discarding a pair that would have turned out to be hazardous. The relationship between filter settings, candidate volume and missed events is rarely made visible to a student or non-specialist audience.

Two reference points bound this work. Publicly accessible screening is not new — CelesTrak's SOCRATES service (Kelso and Alfano, 2005) has screened active payloads against the public catalogue daily since 2004 — but it is one-vs-all and runs on commercial tooling. At the other end, Stevenson, Rodriguez-Fernandez, Urrutxua and Camacho (2023) benchmark deep-learning approaches to *all-vs-all* screening, including the debris–debris pairs that carry much of the collision risk; their study is the closest published work to this project's task, but it relies on high-fidelity simulated ephemerides and its datasets are not public. Neither line of work reports how much screening quality is lost when only public TLE data is available.

This project does not attempt to invent a new screening algorithm. Instead it implements a small, well-documented screening-and-analysis pipeline using established methods, and uses it to run a **scenario-based comparative evaluation**: how do standard filtering strategies and screening thresholds behave across different orbital regimes and encounter geometries?

### 3. Objectives

- Build a reproducible pipeline that ingests public two-line element (TLE) data and propagates objects over a defined analysis window.
- Implement conjunction screening using standard coarse filters (apogee–perigee filtering, orbit-path/geometric filtering, and a time-window filter).
- For each candidate pair, compute refined encounter parameters: TCA, miss distance and relative velocity.
- Apply a simple, documented collision-probability formulation to the refined encounters, using assumed hard-body radii and representative covariance values.
- Rank candidate conjunctions by risk and compare the ranking obtained from miss distance alone against the ranking obtained from probability of collision.
- Evaluate screening threshold sensitivity across defined scenarios and report the trade-off between candidate count and retained high-risk events.

### 4. Scope and Deliberate Limitations

The scope is intentionally bounded so the work remains achievable and fully defensible:

- Data source is limited to publicly available TLE catalogue data; no operational or restricted ephemerides are used.
- Propagation uses the standard SGP4 model appropriate to TLE data; higher-fidelity numerical propagation is out of scope.
- Covariance information is not published with TLEs, so uncertainty is treated parametrically using representative assumed values rather than claimed as operationally accurate.
- Results are presented as a comparative and methodological study, not as an operational collision warning service.

Stating these limits explicitly is part of the contribution: it establishes what conclusions the public-data pipeline can and cannot legitimately support.

### 5. Methodology

| Stage | Description | Output |
|---|---|---|
| 1. Data acquisition | Retrieve TLE sets for a chosen LEO population and analysis epoch. | Curated object catalogue |
| 2. Propagation | Propagate all objects over the analysis window at a fixed step using SGP4. | Position/velocity time series |
| 3. Screening | Apply coarse filters in sequence to eliminate pairs that cannot approach closely. | Candidate pair list |
| 4. Refinement | Refine the approach interval for each candidate to locate the true minimum separation. | TCA, miss distance, relative velocity |
| 5. Risk analysis | Compute probability of collision using assumed hard-body radius and covariance. | Pc per candidate event |
| 6. Ranking & comparison | Rank events; compare distance-based and probability-based orderings across scenarios. | Risk ranking and analysis tables |

**Scenario design.** The comparison is run over a small set of contrasting cases — for example a dense sun-synchronous shell versus a sparser regime, and a near head-on high-relative-velocity encounter versus a low-relative-velocity co-planar encounter. Each scenario is evaluated at several screening thresholds so that filter behaviour, not just a single result, is characterised.

### 6. Expected Outcomes

- A working, documented and reproducible screening-and-analysis pipeline in Python.
- A quantified account of how screening threshold choice affects candidate volume and retention of high-risk events.
- Evidence of where miss-distance ranking and probability-of-collision ranking disagree, and an explanation of why (relative velocity and uncertainty size, not separation alone, drive risk).
- A short research paper presenting the comparative evaluation, its assumptions and its limitations.

### 7. Indicative Timeline

| Phase | Activity | Duration |
|---|---|---|
| I | Literature review; fundamentals of orbital mechanics and conjunction assessment | 3 weeks |
| II | Data acquisition and propagation module; validation against known cases | 3 weeks |
| III | Screening filter implementation and tuning | 3 weeks |
| IV | Refinement, probability-of-collision computation and risk ranking | 3 weeks |
| V | Scenario runs, comparative evaluation and result visualisation | 3 weeks |
| VI | Paper writing, documentation and viva preparation | 3 weeks |

### 8. Evaluation and Validation

Correctness will be established rather than assumed. Propagation output will be checked against independently published positions for selected objects; screening output will be verified by confirming that every event found by an unfiltered brute-force search on a reduced catalogue is also retained by the filtered pipeline; and probability computations will be checked against worked examples from the literature. Sensitivity of all headline results to the assumed hard-body radius and covariance will be reported explicitly.

### 9. Relevance

The project sits within Space Situational Awareness, an area of sustained and growing research and operational activity in Europe and internationally. It builds directly transferable competence in orbital dynamics, uncertainty quantification and scientific data analysis, and produces a written research output suitable as a supporting credential for further graduate research in the field.

### 10. References

Drawn from the project literature review (Pass B, August 2026); citations verified at source unless noted.

1. Stevenson, E., Rodriguez-Fernandez, V., Urrutxua, H., & Camacho, D. (2023). Benchmarking deep learning approaches for all-vs-all conjunction screening. *Advances in Space Research*, 72(7), 2660–2675. doi:10.1016/j.asr.2023.01.036 **[primary reference]**
2. Kelso, T. S., & Alfano, S. (2005). Satellite Orbital Conjunction Reports Assessing Threatening Encounters in Space (SOCRATES). *15th AAS/AIAA Space Flight Mechanics Conference*, Paper AAS 05-124.
3. Levit, C., & Marshall, W. (2011). Improved orbit predictions using two-line elements. *Advances in Space Research*, 47(7), 1107–1115. Preprint: arXiv:1002.2277.
4. Li, J.-S., Yang, Z., & Luo, Y.-Z. (2022). A review of space-object collision probability computation methods. *Astrodynamics*, 6(2), 95–120. doi:10.1007/s42064-021-0125-x
5. Hoots, F. R., Crawford, L. L., & Roehrich, R. L. (1984). An analytic method to determine future close approaches between satellites. *Celestial Mechanics*, 33, 143–158. doi:10.1007/BF01234152
6. Vallado, D. A., Crawford, P., Hujsak, R., & Kelso, T. S. (2006). Revisiting Spacetrack Report #3. *AIAA/AAS Astrodynamics Specialist Conference*, AIAA 2006-6753. (SGP4 reference implementation; see also Vallado, *Fundamentals of Astrodynamics and Applications*, 4th ed., for background.)

*Note: journal volume/issue/pages for [3] follow the commonly cited journal version and remain to be confirmed by DOI lookup; the arXiv version is confirmed. The full reference set is maintained in the project literature review.*

---

## Part 4 — Session Decisions and Revision History

| # | Decision / change | Detail |
|---|---|---|
| 1 | Output format | PDF chosen over Word and Markdown. |
| 2 | Length | 2–3 pages requested; delivered at 3 pages (briefly 4 before references were trimmed). |
| 3 | Reference correction | The first draft's references were written from general domain knowledge, **not** from the project literature review. This was an error and was corrected — all references were replaced with citations taken from `LEO_Conjunction_LitReview_PassB.md`. |
| 4 | Stevenson paper added | Stevenson et al. (2023) added as reference [1], marked primary, and discussed substantively in §2 rather than only listed. |
| 5 | Reference count | Trimmed from 14 to 6 at the user's request. |
| 6 | Author block | Team names and registration numbers added; order set to Surya, Abhinav, Saif, Aditi. |
| 7 | Faculty details | Faculty Guide, Faculty ID and Department ID added to the header block. |

### Files produced

| File | Description |
|---|---|
| `LEO_Conjunction_Project_Proposal.pdf` | The deliverable — 3-page A4 proposal, ReportLab/Platypus, Times family. |
| `proposal.py` | The Python/ReportLab generator script that builds the PDF. |
| `LEO_Conjunction_Project_Context.md` | This document. |

---

## Part 5 — Open Item Flagged but Not Acted On

The project literature review (`LEO_Conjunction_LitReview_PassB.md`, Pass B, compiled 11 August 2026) argues for a stronger positioning than the current proposal adopts. Specifically, its **Gap 2** proposes quantifying the screening performance penalty incurred by relying on public TLE/SGP4 data rather than high-fidelity ephemerides — a cost the review states is widely assumed but never measured. Adopting that framing would convert the project from a comparative study into a measured result.

The current proposal instead uses the safer scenario-comparison framing the user originally described. This was raised with the user and left unchanged; it remains available as a reframing option.

Other items the literature review flags as relevant context, for reference:

- **SOCRATES** (CelesTrak) has run publicly since May 2004, screening active payloads against the full public catalogue using SGP4 on public TLEs. The review recommends knowing its outputs and limits before the viva.
- **Levit & Marshall (2010)** report all-vs-all conjunction checking on ~200 NASA Pleiades cores in about one minute, which complicates any claim that all-vs-all is computationally infeasible. The review recommends framing motivation around *accessibility* rather than *impossibility*.
- **Orekit** includes conjunction analysis and collision probability (Alfano, Patera, Chan methods), which may remove the need to implement a Pc integrator from scratch. The review notes this came from a secondary source and should be verified at orekit.org.

---

*End of context document.*
