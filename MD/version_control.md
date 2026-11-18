# Version control

How ORCA numbers its changes. Started on 2026-11-17; the whole earlier history was tagged the same day (see [builds/README.md](builds/README.md)).

## Builds (user-visible)
- Numbers start at **1000**, tag `build-N`. The tag is the source of truth: never in commit titles, never moved or renumbered.
- Report `MD/builds/build-N.md`: what changed, why, verified how, not verified, next, files. ORCA has no changelog script, so reports are written by hand and the file list comes from `git diff --stat`.
- Related work goes in one build: a PR, or a few PRs merged the same day for the same purpose.
- Every build also gets an entry in `frontend/src/lib/builds.ts`, the in-app What's new (menu > What's new), in plain words for users. `lib/builds.test.ts` fails if a `build-N` row here has no entry there.

## InBuls (internal: docs, MD, scripts, tests, tooling, merges)
- Commit title `InBulNN: <plain words>` + annotated tag `InBulNN`; no report.

## Commit flow
1. Stage the changed files by name (never `git add -A`).
2. Run the checks: `python -m unittest discover -s tests` (with `PYTHONIOENCODING=utf-8`), and in `frontend/`: `npm test`, `npm run typecheck`, `npm run build`.
3. Commit with a plain-words title and a body that says what, why and what was and was not verified. Only the owner's name; no co-author or "Generated with" lines.
4. Tag the commit (`build-N` or `InBulNN`), push only when told: `git push origin main`, then the tag by name.

## Branches
`main` plus one UI branch (and one backend branch if two streams run). Merge via PR, then delete the merged branch. A teammate's PR may be combined into one commit by the owner when the commit must carry the owner's name (Vercel deploys only commits by members of the Vercel team).

Next free: build-1010 · InBul02 (re-check with `git tag -l` before using)
