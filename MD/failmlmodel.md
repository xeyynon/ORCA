# ML Model Failure Modes

Every known way the ML model fails.

## Status: not applicable

There is no ML model in ORCA, so there are no ML failure modes to list.

The failure modes of the **actual** detection pipeline (stale TLEs, a simplified propagator, assumed covariance, a missed fast pass between screening steps, name-keyword hard-body radii) are in [pain.md](pain.md).

If a model is added later, record here, for each failure: the input that triggers it, what the output looks like (it must not look like a normal result), how it was found, and the guard against it.
