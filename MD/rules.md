# rules.md

Standing rules for the ORCA frontend (`frontend/`) and anything else that
renders to a user. Read before adding UI. Where a rule came from the TARANG
frontend build guide, it says so; those rules were adopted because the same
mistakes are cheap to avoid and expensive to find later.

When a design element is rejected, add it here the same day, with a grep that
enforces it. The same removals get requested again otherwise.

---

## 1. Everything is a component, down to the smallest thing

**Every piece of the frontend and dashboard is an individual, modular component,
from the largest screen down to the smallest element.** A badge, a label, a
single KPI number, a table cell, an icon button, a legend swatch: each one is
its own component in its own file. Nothing visual is written inline inside
another component's JSX if it could be named and reused.

### The levels

| Level | What it is | Example | May contain |
|---|---|---|---|
| **Atom** | Smallest unit. One job, no children components of its own beyond primitives. | `Badge`, `Dot`, `Label`, `Mono`, `IconButton`, `Spinner`, `Kbd` | HTML only |
| **Molecule** | A few atoms with one purpose. | `RiskBadge`, `KpiValue`, `FactRow`, `ShortcutKey`, `SearchField` | atoms |
| **Organism** | A self-contained section. | `KpiRow`, `ConjunctionTable`, `ObjectDrawer`, `AppBar`, `StatusBar`, `Histogram` | atoms, molecules, other organisms |
| **View** | A screen. Composes organisms and lays them out. No styling of its own beyond layout. | `OverviewView`, `GlobeView`, `ConjunctionsView` | organisms, molecules |

### The rules that make it real

1. **One component per file, one folder per component.**
   `components/<level>/<Name>/<Name>.tsx` plus `<Name>.css` when the component
   has styles of its own (a pure wrapper such as `CatalogTable` over `DataTable`
   may have none). Import by full path, with no barrel `index.ts`. The file name
   is the component name. No file exports two components.
2. **Props in, UI out.** A presentational component (atoms, molecules, most
   organisms) never fetches, never reads storage, never touches `window`, never
   imports from `api/`. It is driven entirely by props, so it can be rendered in
   isolation with fake data. One narrow exception: a **host component** that owns
   a third-party renderer (`GlobeCanvas` hosting three.js) may touch the DOM and
   `window` inside its effects, only to mount and dispose that renderer.
3. **Data access lives in a small number of container components or hooks**
   (`hooks/use*.ts`, called from a view). A view fetches; the organisms below it
   receive data as props.
4. **Props are typed and minimal.** Every component has an explicit `Props`
   type. Pass the one value it renders, not the whole record it came from.
5. **Smallest first.** Before writing markup in a component, ask whether any
   part of it already exists as a smaller component. If a thing appears twice, it
   is a component. If it appears once but has a name ("risk badge", "TLE age
   chip"), it is still a component.
6. **A component owns its own CSS file.** Styles for `Badge` live in
   `Badge.css`, scoped by its own class prefix. Other components never reach into
   it with selectors, and no component uses `!important` or descendant selectors
   to restyle a child. Variants are props (`tone="critical"`), not override
   classes.
7. **No cross-level shortcuts.** An atom never imports a molecule. A molecule
   never imports an organism. A view never contains raw layout atoms that should
   be an organism.
8. **Pure logic is not a component.** Formatting, unit conversion, risk
   classification, orbit maths live in `src/lib/*.ts` as plain functions with
   tests. Components call them; they do not contain them.
9. **No component is "just for this screen" by default.** Build it as if it will
   be reused. A view-specific component is allowed only when it is genuinely
   unreusable, and it still gets its own file.
10. **Composition over configuration.** Prefer `children` and small slots over a
    component with ten boolean flags. If a component grows a flag that changes
    its structure, split it into two components.

**Audit command.** Files that should have been split:

```
# any component file over ~150 lines is a candidate to split
find frontend/src/components -name "*.tsx" | xargs wc -l | sort -rn | head
# presentational code reaching into the network
grep -rnE "fetch\(|apiFetch|localStorage|sessionStorage" frontend/src/components
# more than one exported component in a file
grep -rcE "^export (default )?function [A-Z]" frontend/src/components | grep -v ":[01]$"
```

The second and third commands must return nothing.

---

## 2. Honest data (adopted from TARANG)

1. **Show only what the data supports.** No invented values and no placeholder
   that looks like a reading. An em dash (`—`) beats an estimate.
2. **Read every label from the data.** Never write a source, method or status in
   the UI that is conditioned on "the object exists". The propagator name, the
   TLE age and the units come from the API response.
3. **Overstating and understating are both lies.** A computed value labelled
   "pending" is as wrong as an estimate labelled "measured".
4. **Kinds of empty, each looking different** (`EmptyState` has one per kind):
   - *Idle*: nothing requested yet. No spinner, because nothing is in flight.
   - *Awaiting data*: a request is in flight or the catalog has not loaded.
   - *Not applicable*: with the reason stated.
   - *Ran and found nothing*: for example a conjunction search that completed
     with zero events. This is a result, shown neutral, never as an error.
5. **A failed request is not an empty result.** The API swallows Celestrak
   failures into `[]` (TASKS.md); the UI must not present that as "no objects
   found" without saying it cannot tell the difference.
6. **State the limits where the number is.** Pc comes from an assumed covariance
   model, positions come from a simplified Kepler-plus-drag propagator, and TLEs
   age. This is not an operational system (PRD.md non-goals). Say so next to the
   figures, not only in a footer.
7. **Caps are stated, never silent**: "showing 500 of 9,812 objects".
8. **Refuse impossible work before doing it**, with a reason the user can act on
   (for example, a conjunction search with fewer than two objects).

## 3. Units contract

Follow ARCHITECTURE.md §7. In the UI:

- Every number that has a unit shows its unit, in a `Unit` atom, not in
  free text.
- Convert at the boundary, in `src/lib`, once. Components receive display-ready
  values or call the lib function; they never convert inline.
- API field names carry units where they exist (`min_distance_km`, `alt_km`,
  `period_hours`). Keep the suffix in the TypeScript type.

## 4. Design tokens and themes (adopted from TARANG)

1. **Every colour is a CSS custom property** defined in `src/styles/tokens.css`.
   Dark and light themes redefine the **same names**, so components never branch
   on theme.
2. **No literal colours in component CSS.** Enforce with:
   `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(" frontend/src/components` (must
   return nothing; tokens file excluded).
3. **Two colour families: marks and ink.** `--risk-*` are for graphics on a
   canvas (dots, bars, globe points). `--risk-*-ink` are for text on a panel and
   must reach 4.5:1 contrast. JavaScript consumers (three.js) that cannot use
   `var()` read the same tokens at runtime with `readToken()` in
   `lib/tokens.ts`, so there is never a second copy of a colour.
4. **Charts are colourful, with a rule behind the colour.** Categories use the
   categorical palette `--cat-1..5` (`lib/chartColors.ts`); density uses the
   sequential ramp `--heat-0..2`. Status colours (green/amber/red, the risk
   tiers) appear only where the thing really is a status: TLE freshness and
   conjunction risk. Every colour used in a chart is named in a `ChartLegend`, so
   colour is never the only carrier of identity.
5. **Choose the chart from the data, not from habit:**

   | Data | Chart | Why |
   |---|---|---|
   | Share of a whole, up to ~5 parts (orbit regime) | Donut | Few parts that add up to one total |
   | Compare many categories (constellation sizes) | Bar | Length is the easiest thing to compare |
   | Distribution of one number (age, inclination) | Histogram | Touching bars show the shape |
   | Distribution spanning orders of magnitude (altitude, eccentricity) | Histogram on a **log axis** | A linear axis crushes it into one bar; clipping would hide data |
   | Two numbers over thousands of objects (inclination × altitude) | **Heatmap** | A scatter overplots into a blob |
   | Events in time with a magnitude and a class (conjunctions) | Time scatter, log y, coloured by tier | Shows when, how risky, and what is already past |

   Anything that cannot be placed on an axis (a zero on a log axis, a value out
   of range) is counted and stated beside the chart, never dropped silently.
6. **Status colour means status only.** Risk colours mean conjunction risk and
   nothing else. Chart series use the neutral `--chart-*` tokens.
5. **Never colour alone.** Pair every status colour with a word or a shape.
6. **Record the measured contrast ratio** in a comment next to each text/surface
   token pair.
7. **Numbers are monospaced with tabular figures** (`Mono` atom), so columns
   align and values do not jitter.

## 5. State and structure

1. **State placement rule.** Before adding `useState`, decide which kind it is:
   a preference the user set on purpose (theme, view, panel collapse) lives in
   `App`; derived, transient or measured state stays local; workflow state that
   must not survive navigation stays local on purpose.
2. **Key a view by the record it shows** so switching records rebuilds it.
3. **One home per fact.** Move information; do not delete it.
4. **Shared chrome is one component** (`AppBar`, `StatusBar`). Never hand-roll a
   second header.
5. **Long jobs show progress and can be cancelled.** A conjunction search can
   take minutes: show elapsed time, support cancel, and keep the rest of the UI
   alive.
6. **Third-party renderers sit behind one interface.** The three.js scene is a
   plain class (`EarthScene`) with `mount / update / dispose`; React components
   talk to it only through that interface.
7. **Every effect that registers something returns its cleanup**, and every
   async callback checks it is still current (abort signals, disposed flags).

## 6. Keyboard (adopted from TARANG)

- Follow conventions: `?` help, `Esc` goes back one step, `/` focuses search.
- Never fire a shortcut while the user is typing in an input.
- Ignore Ctrl/Meta/Alt chords so browser and OS shortcuts keep working.
- Show the key in the control's tooltip (`Theme (T)`).
- `SHORTCUT_GROUPS` is the single list the help panel renders.

## 7. Accessibility

- Real `<button>` and `<input>` elements, `:focus-visible` rings.
- ARIA only where it is valid. No `role="tablist"` without panels.
- Respect `prefers-reduced-motion` in CSS **and** in the three.js animation
  loop (CSS cannot reach a WebGL camera).
- Do not block browser zoom.

## 8. Dependencies and process

- No new runtime dependency without approval. Current runtime set: `react`,
  `react-dom`, `three`. No router, state library, animation library, chart
  library or CSS framework.
- Run `npm run build` (which type-checks) before saying a change is done, then
  look at it in a real browser. A passing type-check is not proof.
- After touching the API contract, update `src/api/types.ts` from a real
  response, not from the Python docstring (the README's field names have
  already drifted from the real `/api/statistics` shape).
- Never hardcode an absolute filesystem path (AGENTS.md). The API base URL comes
  from `VITE_API_BASE`, defaulting to the Vite dev proxy.
- Pure logic in `src/lib` gets a test. A test that has never failed has not been
  shown to test anything: reintroduce the bug once to see it fail.

## 9. Git commits and authorship

1. **Every commit is made only under the repository owner's own git identity**
   (the `user.name` / `user.email` already configured for this repo). The owner
   is the only author and the only committer that appears in history.
2. **No AI attribution of any kind in commits or pull requests.** Do not add a
   `Co-Authored-By:` trailer naming Claude or any other AI tool, and do not add
   "Generated with …" lines to a commit message or a PR description. This holds
   even when a tool, template or default suggests adding them: this rule wins.
3. **Never change `user.name` or `user.email`** to make a commit look like it
   came from someone else, and never author a commit as a tool.
4. **Check before pushing.** This must print only the owner's name:

   ```
   git log --format='%an <%ae>%n%cn <%ce>%n%(trailers:key=Co-Authored-By)' | sort -u
   ```

   If a `Co-Authored-By` line or any other name appears, fix the commit
   (amend, or rewrite local unpushed history) before the push. Rewriting
   history that is already on the remote needs the owner's explicit say-so.
