# Tried and Failed

> Approaches that did not work, so nobody repeats them. Each entry gives what was tried, what happened, and the lesson. Drawn from [DECISIONS.md](DECISIONS.md) and the code. Add to the top.

## 22. Two snapshots to fit TLE error growth
- **Tried:** Fitting uncertainty against TLE age from two catalog snapshots.
- **Happened:** Both were single fetches, so 15,041 LEO objects all had the same ~6-day gap: one bin, nothing to fit. A straight-line fit across sparse bins went negative near zero age.
- **Lesson:** Take snapshots across time (the third, 8.6 h later, added short horizons). Interpolate measured bins in log-log space instead of forcing a line. Run `benchmarks/refresh_measured.ps1` daily.

## 21. The small-radius closed form for Pc at large miss distances
- **Tried:** Pc = pi R^2 times the density at the disc centre, for R much smaller than sigma.
- **Happened:** Up to 7 % off when the miss is many sigma away, because the density varies across the disc. The unit test caught it.
- **Lesson:** Use Foster's own 1D integral, vectorised with Gauss-Legendre (exact at any miss distance). Keep adaptive quadrature for radii that are not small.

## 20. Reading the miss distance off the parabola's minimum value
- **Tried:** Using the vertex value of the d^2 parabola from the screening grid as the miss distance.
- **Happened:** The TCA came out within 0.5 ms, but the miss distance was off by a median of 63 m (up to 2 km), which dropped some encounters near the 10 km cut.
- **Lesson:** The parabola locates the time well, but not the value. Re-propagate exactly at that time, and apply the cut after refinement with a margin on the estimate.

## 19. Adding J2 secular rates to the TLE's Kozai mean motion
- **Tried:** A two-body + J2 propagator built from `no_kozai`.
- **Happened:** About 270 km of in-track error per day, because Kozai's mean motion already contains part of J2.
- **Lesson:** SGP4 converts to Brouwer first (Spacetrack Report #3). Use Brouwer `a`, and test the rates against SGP4's own (`mdot`).

## 18. Scoring a screen hit anywhere within +-step of the encounter
- **Tried:** Counting an encounter as detected if the pair was flagged within one step of its TCA.
- **Happened:** At a 1 h step that window spans more than an orbit, so flags from a *different* pass counted, and coarser steps looked better.
- **Lesson:** A metric must behave monotonically. Count a detection only within the encounter's own pass.

## 17. The "Alfano 2D" Pc formula in ORCA as built
- **Tried:** `pc = (beta^2 / (2 alpha^2)) exp(-alpha^2 / 2)` for alpha >= beta, labelled "Alfano (2005)".
- **Happened:** It is the correct small-object result divided by alpha^2: ~46x too high for close approaches (alpha < 0.25) and too low beyond alpha of about 1. Every CRITICAL and HIGH label in the app came from this error. It also made the "risk ranking" a miss-distance ranking (Kendall tau 0.87).
- **Lesson:** Test any probability formula against a closed form. Replaced by Foster on 2026-10-15.

## 16. A single bounded Brent search over +-6 h for TCA
- **Tried:** `minimize_scalar(method='bounded')` of the separation over +-6 h around the best grid sample.
- **Happened:** The closest approach was found for only 5-6 % of pairs, because a +-6 h window holds about 15 approach minima for a LEO pair.
- **Lesson:** Find every minimum (range-rate sign changes) and refine each one, or refine locally inside a pass.

## 15. Hourly snapshot screening at 100 km
- **Tried:** Positions every 1 h (2 h by the UI's default), with a KD-tree at 100 km.
- **Happened:** 1.0-1.2 % of encounters under 10 km were caught during their pass, and under 1 % above 5 km/s. The output was dominated by slow co-orbital pairs.
- **Lesson:** Snapshot screening is safe only if r >= d + v*dt/2. Choose the step and radius from that bound, not from runtime.

## 14. A two-body propagator named `SGP4Propagator`
- **Tried:** Two-body motion with an exponential drag term, no J2, used for every conjunction number.
- **Happened:** It drifted ~300 km from SGP4 in a day (17 km already at epoch, because it treats mean elements as osculating).
- **Lesson:** TLEs are SGP4-specific mean elements, so use SGP4 with them. Name things for what they are. Fixed 2026-10-15.

## 13. Trusting the research brief written without the code
- **Tried:** Planning experiments from a handoff brief (v1) that had never looked at ORCA's code.
- **Happened:** It planned "Two-body vs SGP4" when production was already the two-body model, and expected KD-tree vs brute force to differ in recall. It also proposed Monte Carlo sample counts that would return zero, and LEO-GEO conjunctions that cannot happen.
- **Lesson:** Check a plan against the real system first (research_paper_brief.md section 1 lists 17 corrections).

## 1. Celestrak `last-30-days` as the default group
- **Tried:** `fetch_group(group="last-30-days")` hardcoded in `api_server.py` and `parser_pipeline.py`.
- **Happened:** Celestrak returned 404. The failure was logged only, so every fresh install had an empty catalog and `/api/statistics` returned `{}`.
- **Lesson:** An external group name is not a constant. A smoke test that fetches once and asserts a non-empty catalog would have caught it. Fixed by switching to `active`.

## 2. Hammering the `active` group while testing
- **Tried:** Repeated `POST /api/update-tles` against `GROUP=active` (~2.7 MB) during development.
- **Happened:** Celestrak answered 403. `stations` kept working.
- **Lesson:** Seed from `stations` for development and test loops. Wait before retrying `active`. No backoff exists yet (open task).

## 3. Printing a Unicode check mark on the ingestion path
- **Tried:** `print("✓ Success: ...")` for every parsed TLE.
- **Happened:** On Windows (cp1252) it raised `UnicodeEncodeError` mid-parse, inside a background task, after the API had already answered 200. Ingestion silently truncated.
- **Lesson:** No non-ASCII `print()` on a hot path. The shipped workaround is `PYTHONIOENCODING=utf-8`, which is operational, not a code fix. Changing the print would be the real fix.

## 4. A hardcoded developer path in `dashboard.py`
- **Tried:** `db_path=r"C:\Users\Lkd\Desktop\proj\ssa_data.db"` at one call site while a portable `DB_PATH` sat unused at the top of the file.
- **Happened:** Every Streamlit page crashed with `sqlite3.OperationalError` on any other machine.
- **Lesson:** Use the existing constant. Never hardcode an absolute path.

## 5. Starting the catalog search at the first object's TLE epoch
- **Tried:** `search_catalog` used the first TLE epoch as the start of its time grid.
- **Happened:** With a 45-day-old catalog, a "7-day horizon" returned events 41-44 days in the past. `assess_pair` defaulted to now, so the UI disagreed with the search it came from.
- **Lesson:** Defaults must agree across entry points, and tests must cover time, not just shape. Fixed with `start_epoch=utcnow()` and `tests/test_search_start.py`.

## 6. Server-side export to `/tmp`
- **Tried:** `GET /api/export/conjunctions` writes a file under `/tmp` and returns it.
- **Happened:** Fails on Windows, where `/tmp` does not exist.
- **Lesson:** Never hardcode a temp path. Fixed 2026-10-03: `tempfile.mkdtemp` per request, removed after the response, and the handler is a plain `def` so the long search no longer blocks the event loop.

## 7. Treating screening as risk assessment
- **Tried (conceptually):** Reading "passed the KD-tree screen" as "dangerous".
- **Happened:** Screening only says two objects were within `initial_screen_km` at a grid step. Danger depends on TCA, miss distance, relative velocity and uncertainty.
- **Lesson:** Keep the stages separate in code, API and UI. This is the project's core distinction ([intent.md](intent.md)).

## 8. Two-way scatter plot in the frontend
- **Tried:** A `ScatterPlot` organism on the Analytics view (the files are deleted in the working tree).
- **Happened:** Replaced by a density heatmap, bar lists and donut charts. The git history does not record why.
- **Lesson:** Not recorded. If you know why it was dropped, add it here. A scatter over ~16k points overplots, which is one plausible reason.

## 9. Installing the OCI CLI with pipx on Windows
- **Tried:** `pipx install oci-cli`.
- **Happened:** Failed with `OSError: No such file or directory` on a help file. The full path (`...\pipx\venvs\oci-cli\Lib\site-packages\oci_cli\help_text_producer\...`) exceeds Windows' 260-character limit, and long paths are off on this machine.
- **Lesson:** Install into a short path: `python -m venv C:\oci`, then `C:\oci\Scripts\pip install oci-cli`.

## 10. Using a new OCI API key straight away
- **Tried:** Running CLI commands right after `oci setup bootstrap`.
- **Happened:** `401 NotAuthenticated` for several minutes, on and off and per service (identity first, then compute, then networking). A partly failed script left a half-built network.
- **Lesson:** Wait for the key to propagate, retry on 401 only, and make provisioning scripts idempotent (look up by display name before creating).

## 11. Oracle Ampere A1 in Hyderabad
- **Tried:** Launching `VM.Standard.A1.Flex` (2/12, then 1/6) in a retry loop on 2026-10-08.
- **Happened:** "Out of host capacity" on every attempt. Retrying faster than every ~2 minutes also hit `429 Too many requests`. Other regions are not an option: Always Free compute is home-region only.
- **Lesson:** Do not plan on A1 being available on day one. The AMD micro VM (`VM.Standard.E2.1.Micro`) launched immediately. Keep retrying A1 slowly.

## 12. Opening ports with `iptables -I INPUT 6`
- **Tried:** The commonly copied rule position for Oracle's Ubuntu images.
- **Happened:** On Ubuntu 24.04 the catch-all `REJECT` is at position 5, so the ACCEPT rules for 80/443 landed below it and never matched.
- **Lesson:** Insert at the position of the `REJECT` line, found at run time (deploy/ORACLE.md §4), and check with `iptables -L INPUT -n --line-numbers`.

