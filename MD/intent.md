# Intent

> Why ORCA exists: the problem, the users, the design principles.

## The problem

Low Earth Orbit is crowded with active satellites, spent rocket bodies and fragmentation debris. Operators decide, often daily, whether a predicted close approach justifies a manoeuvre. Doing that well means telling a genuinely hazardous encounter from a merely close one.

Professional tooling for this (STK, commercial SaaS, government systems) is expensive or closed. There is no small, inspectable, freely runnable reference that takes a learner from "raw TLE text" to "the conjunctions that matter this week". Public services such as CelesTrak SOCRATES exist, but they are one-vs-all and run on commercial tooling. They do not show a learner how screening settings trade candidate volume against missed events.

## The core idea

**Screening is not risk assessment.** Screening is a cheap filter: which pairs could come close enough to look at? Analysis is the expensive step: for each survivor, when is closest approach, how close, how fast, and how likely is a collision? A pair that passes screening is a hypothesis. ORCA keeps the two stages visibly separate in the code, the API and the UI.

## Who it is for

| Who | What they need |
|---|---|
| Capstone evaluator, recruiter | Working orbital mechanics, a real API and a real UI in under five minutes. |
| Student or learner | Short Python modules that map to textbook astrodynamics. |
| Downstream developer | A REST API for propagated states and conjunctions without standing up SGP4 themselves. |
| The team (four students, one faculty guide) | A project that is achievable, defensible in a viva, and tied to a research paper. See [LEO_Conjunction_Project_Context.md](LEO_Conjunction_Project_Context.md). |

## What it deliberately is not

- Not an operational or certified SSA service.
- Not a new screening algorithm. The contribution is a documented pipeline of established methods and an honest account of what public TLE data can and cannot support.
- Not a high-fidelity propagator. No numerical integrator, solar radiation pressure or detailed atmosphere model.

## Design principles

1. **Free and open.** No paid keys, licences or services for core function.
2. **Local first.** One machine, one SQLite file.
3. **Readable end to end.** One engineer can explain every module. Extend the existing modules before adding new top-level files.
4. **Honest data.** Show TLE age beside every object. Name the propagator in use. Distinguish "not loaded yet", "ran and found nothing" and "request failed". State limits next to the numbers they qualify. (Full rules: [rules.md](rules.md) section 2.)
5. **Units are a contract.** The same physical quantity has different units in different layers, and that has caused bugs ([ARCHITECTURE.md](ARCHITECTURE.md) section 7).
6. **Fail loud, not silent.** The worst past bugs were silent: an empty catalog from a dead Celestrak group, and ingestion truncated by a console encoding crash. See [pain.md](pain.md).
7. **Keep the foundation pure.** `orbit_mech_engine.py` never imports another project module.
8. **The API is the security boundary.** The login screen is only the front door.
