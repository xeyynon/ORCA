# ORCA design system v2

Started 2026-11-07 on branch `ui/design-system-v2`. Direction chosen by the owner: **evolve** the dark instrument look (not a new identity); a **deterministic "Ask ORCA" assistant** with optional AI answers through Groq (decided 2026-11-07; Claude was the first plan); first milestone a **mission-control home with onboarding**.

Reference: the "UI Style Atlas" artifact (50 live specimens). Lessons carried from three earlier frontends (Calley, TARANG, Dukaan Dost) and from `MD/rules.md`.

## 1. The rule that makes a mix work

Fourteen named styles mixed with no roles fight each other and read as generated. **Each one gets one job, a place, and a guardrail.** If a style has no job on a screen, it is not used there.

| Style | Its job in ORCA | Where | Guardrail |
|---|---|---|---|
| **Bento grid 2.0** | Layout of data overview screens: unequal tiles, one hero | Analytics (the home was a bento grid first; see §5 for why it changed) | One hero tile per screen (wider, not taller). Tiles are the 12-column grid's cells, not cards nested in cards. Phone: one column, hero first |
| **Glassmorphism (a little)** | Chrome that floats over the globe | Globe view: playback bar, legend, view chips, the assistant when docked over the globe | Only over the globe (the one colourful background). Never under a number that must be read precisely: data panels stay solid. Opaque fallback under `prefers-reduced-transparency` and where `backdrop-filter` is unsupported. Text on glass must still pass 4.5:1 against the worst case behind it, so the glass alpha is a measured token |
| **Neumorphism** | Tactile feel for a few physical controls | Playback transport (play, step), segmented controls, toggles | Never for content cards or anything that must be found (its low contrast is why the atlas warns against it). Every neumorphic control also has a 1px border and the normal focus ring, and its label passes 4.5:1. Pressed state is shown by inset shadow **and** `aria-pressed`/colour, never by shadow alone |
| **Material Design** | Elevation and state system | Surfaces (levels 0 to 4), state layers (hover 8%, focus 12%, pressed 12%), the one primary action per screen | Elevation means "above", not decoration: page 0, cards 1, floating panels 2, menus 3, dialogs 4. No Material colour palette: ORCA's tokens stay |
| **Storytelling** | Turn results into a narrative people can follow | The home page as a whole (hook, how it works, right now), first-run tour, conjunction walk-through (later) | A story only re-orders and explains real data. It never invents a number, and every step links to the evidence |
| **Breadcrumbs** | Show where you are and the way back | Under the app bar on detail states: `Mission control / Overview / 2021-091D` | Last crumb is the page (`aria-current="page"`), not a link. Hidden on the home itself |
| **Microinteractions** | Confirm that something happened | Copy buttons ("Copied"), toggles sliding, the menu, a run starting, a row selected, numbers counting in once | 120 to 240 ms, `transform`/`opacity` only. All off under `prefers-reduced-motion`. A microinteraction never carries information that is not also in text |
| **Skeleton loading** | Waits for a small block | KPI figures, tile contents, table rows, filter counts | Shape of what is coming. The labelled loader is for a whole section; a button's own spinner for a button. Never a `0` while loading |
| **Empty states & onboarding** | Teach and start | Empty results, first visit, a section with nothing yet | Three kinds of empty stay distinct (idle, ran-and-found-nothing, failed). The tour is skippable, remembered, re-openable from the menu, and retires itself once each step has been done for real |
| **Gesture-based UI** | Natural touch on phones | Globe: pinch zoom, drag rotate, double-tap to focus; bottom sheets: drag to expand or close; swipe between conjunction pairs | Every gesture has a visible button equivalent (WCAG 2.5.1, 2.5.7). No gesture is the only way to do something |
| **Conversational UI** | "Ask ORCA": find, show and explain by typing | A panel opened from the app bar and with `.` (period) | Deterministic first: answers come from the loaded data and a fixed intent set, with quick-reply chips. If a Groq key is set on the server (`.env`, `GROQ_API_KEY`), questions the built-in intents do not cover go to it, and every AI answer is labelled as AI with the data it was given |
| **Atomic design** | How everything is built | `components/{atoms,molecules,organisms,views}` (already in place) | `rules.test.ts` enforces it |
| **Accessibility-first (WCAG 2.2 AA)** | A constraint on every item above | Everywhere | `npm run contrast` and `rules.test.ts` stay green. 44 px targets on touch, visible focus, real labels, reduced motion and transparency honoured |
| **Human-centered design process** | How we decide what to build next | Each milestone | Personas from `MD/intent.md`. Each milestone: a task list per persona, a hallway test or a self-test against it, findings written in `MD/ux_audit.md`, then the next change |

**Not used, and why:** aurora gradients, neon, claymorphism, Memphis, skeuomorphism. They are decoration with no job here, and the owner has already called out a generated look (rules.md 11.18).

## 2. Personas and the tasks each milestone is tested against

From `MD/intent.md`.

| Persona | Arrives with | Must be able to, in under five minutes |
|---|---|---|
| Capstone evaluator, recruiter | No context, a phone or a laptop | Understand what ORCA does from the home; see the catalog on the globe; see a conjunction result (saved example) and what it means |
| Student or learner | Curiosity, little vocabulary | Follow the tour; learn what TLE, Pc and TCA mean where they appear; find one object and see its orbit |
| Downstream developer | Wants the API | Find the API status, docs and the build from the Data page |
| The team, in a viva | Needs to defend every number | Point at where each figure comes from and what it does not say |

## 3. Tokens added in v2

All in `frontend/src/styles/tokens.css`, both themes, same names. Values are starting points; contrast is measured by `npm run contrast`.

- **Elevation** (Material levels): `--elev-0` (none), `--elev-1` (cards), `--elev-2` (floating panels), `--elev-3` (menus, popovers), `--elev-4` (dialogs). Dark theme uses lighter surfaces as well as shadow, because shadow alone barely shows on near-black.
- **Surfaces by level:** `--surface-0` page, `--surface-1` card, `--surface-2` floating, `--surface-3` overlay.
- **State layers:** `--state-hover`, `--state-focus`, `--state-pressed` (translucent ink over a surface).
- **Shape:** `--radius-sm` 4px (inputs, chips, tables: still a precision tool), `--radius-md` 8px (cards), `--radius-lg` 14px (bento tiles, sheets), `--radius-pill`.
- **Motion:** `--dur-1` 120ms, `--dur-2` 200ms, `--dur-3` 320ms; `--ease-standard` cubic-bezier(.2,0,0,1), `--ease-emphasized` cubic-bezier(.3,0,0,1), `--ease-exit` cubic-bezier(.3,0,1,1).
- **Glass:** `--glass-bg`, `--glass-border`, `--glass-blur`; opaque fallbacks `--glass-bg-solid`.
- **Neumorphic:** `--neu-light`, `--neu-dark` (the two shadows), `--neu-surface`, per theme.
- **Type scale:** `--text-xs` 11, `--text-sm` 12, `--text-md` 13, `--text-lg` 16, `--text-xl` 20, `--text-2xl` 28, `--text-hero` 40 (px; rem conversion is a later step for text scaling).

## 4. Milestones

1. **Foundations.** Tokens above; base motion and reduced-motion/transparency rules; rules tests extended to the new tokens.
2. **Mission-control home** (`#/home`, the new landing): bento grid with one hero tile telling the catalog's story, freshness, regimes, a conjunction tile (latest run or the saved example), the globe entry, data status, quick actions; skeleton tiles; breadcrumbs across the app; first-run tour.
3. **Ask ORCA** assistant: deterministic intents and quick replies; optional AI answers through Groq.
4. **Glass and tactile controls on the Globe; gestures** on phones (bottom sheet, pinch, double-tap).
5. **Conjunction story:** a step-by-step walk through one pair.
6. **HCD pass:** run the persona tasks, write findings, fix.

## 5. Lesson: a dashboard is not a landing page (2026-11-07)

The first Mission control was a seven-tile bento dashboard: catalog story, freshness, regimes, conjunctions, globe, system, glossary. It was accurate and compact, and the owner judged it right: "too much clutter; someone who does not know the system has no hook and will leave."

A dashboard answers "what is the status?" for a returning user. A first visit needs "why should I care?" and "what do I do?" first. The home is now, in this order:

1. **The hook** (`HomeHero`): one true, striking sentence as the page's h1 ("15,970 objects are circling Earth right now."), the pair count from a run with its source stated, one primary action ("Watch them move") and one secondary ("See the close approaches"), the tour link, and ORCA's orbit animation.
2. **How it works** (`HowItWorks`): Track, Screen, Understand; one sentence and one way in each.
3. **Right now** (`HomeFacts`): three short facts (where they orbit, how fresh the data is, close approaches), each with a link.

Status detail (API, build, refresh times, age breakdowns) lives on the Data page. Rule: a landing page leads with one hook and at most two actions; anything a newcomer cannot act on goes further down or to its own view.
