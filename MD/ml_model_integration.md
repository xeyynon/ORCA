# ML Model Integration

> How a hosted model would be wired into the backend.

## Status: not applicable

There is **no model integration** in ORCA. The backend (`api_server.py`) makes one outbound call, to Celestrak for TLEs. It does not call Hugging Face or any other model host, and no endpoint returns a model prediction. See [ml.md](ml.md).

## Seam to use if a model is added

Keep the existing boundaries from [system_architecture_2026-09-11.md](system_architecture_2026-09-11.md):

- Put model calls inside an existing module (most likely `conjunction_detection.py`), not a new top-level file. `orbit_mech_engine.py` must stay free of project imports.
- Expose the result through the existing API, behind the existing auth guard.
- Treat the remote call as untrusted and failure-prone. Do not repeat the Celestrak mistake of turning a failure into an empty result: return a distinguishable error.
- Show the model's name and version in the UI beside its output, as the propagator is named today (`MethodNote`).
- Document any new environment variable in [deployment.md](deployment.md) and any secret as a secret.
