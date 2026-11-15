# ML Model

The detection model, how it was evaluated, and the measured accuracy.

## Status: not applicable

ORCA has **no machine-learning component**. Nothing in `parser_pipeline.py`, `orbit_mech_engine.py`, `conjunction_detection.py`, `Analytics.py`, `api_server.py`, `auth.py`, `dashboard.py` or `frontend/` trains, loads or calls a model. `requirements.txt` has no ML library. There is no accuracy figure to report, and none is invented here.

Detection is classical: SGP4, KD-tree screening every 20 s, exact refinement of the time of closest approach, and Foster's 2D collision probability with an uncertainty model measured from successive TLEs (engine v2, 2026-10-15). See [flow.md](flow.md) and [conjunction_engine_v2.md](conjunction_engine_v2.md).

## Where ML appears in the project's background

The proposal's main reference, Stevenson et al. (2023), benchmarks deep-learning approaches to all-vs-all conjunction screening. ORCA cites it as the closest published work and does not implement it. See [external_research.md](external_research.md).

## If ML is added later

Fill in this file with:

1. The task (for example, predicting which candidate pairs survive refinement, to replace or tighten the KD-tree filter).
2. Training data and its source (public TLEs only, per the project scope).
3. The baseline to beat: the KD-tree pipeline, with brute force on a reduced catalogue as ground truth.
4. Metrics that matter here: recall of true close approaches first, then candidate count.
5. Measured results on held-out scenarios, with the TLE age and orbital regime of each.

Also update [system_design_and_boundary.md](system_design_and_boundary.md), where ML is listed as out of scope.
