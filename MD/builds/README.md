# Builds and InBuls

Every tag in the repository, oldest first. Builds 1000 to 1007 were tagged after the fact on 2026-11-17: each tag sits on the commit where `main` reached that state, and related work merged on the same day is one build. No commit was changed to do this. Rules: [../version_control.md](../version_control.md).

| Tag | Commit | Date | What it contains |
|---|---|---|---|
| `build-1000` | `c08677f` | 2026-10-03 | First version: TLE download and storage, orbit engine, conjunction search, API and React app |
| `build-1001` | `0ebf5d7` | 2026-10-03 | Sign-in with the animated debris scene, rebuilt Globe (floating cards, playback, filters, conjunction overlay), reworked Analytics, brighter orbit paths |
| `build-1002` | `d1c5961` | 2026-10-09 | Hosted online: Vercel frontend, Oracle backend, deploy on every push to `main`; sign-in blur fixed in production |
| `build-1003` | `12a147e` | 2026-10-16 | PR #1: conjunction engine v2 (SGP4, gap-free screening, exact TCA, Foster Pc), method and limits shown beside the results, evaluator panel, benchmark study and paper |
| `build-1004` | `fcd3b07` | 2026-11-07 | PR #2 and PR #4: API health link on the Data page; UX audit fixes (search survives navigation, answer-first results, saved example run, phone layout, header menu, whole-catalogue Analytics) |
| `build-1005` | `0096c59` | 2026-11-07 | PR #5 and PR #6: design system v2, Mission control home, first-run tour, Ask ORCA, new top bar, Reports view |
| `build-1006` | `7c63c6e` | 2026-11-16 | PR #7 and PR #9: declutter pass on every page, Globe constellation colours, API health page, README back at the root, smaller status bar, Vercel analytics |
| `build-1007` | `34e0032` | 2026-11-16 | PR #8 and PR #10: bug sweep (sidereal time, epoch precision, one-transaction catalogue insert, unusable records, keyboard), floating status bar, CelesTrak 120 s timeout |
| `build-1008` | `43c2d06` | 2026-11-17 | PR #11: new wording on every page, in the report and in Ask ORCA; nine more glossary terms, a correct Pc method note, shorter tour steps. Report: [build-1008.md](build-1008.md) |
| `InBul01` | `97fa0ce` | 2026-11-17 | Version notes: this list, the build-1008 report and `version_control.md` |
| `build-1009` | this commit | 2026-11-18 | PR #12 and What's new: the Home Earth keeps turning after the collision scene; a What's new list in the menu with the current build. Report: [build-1009.md](build-1009.md) |

The older tag `orca-as-built-2026-10-14` marks the engine the research paper measured; it is kept as it is.
