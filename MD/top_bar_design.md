# How the ORCA top bar is designed (and how to rebuild it elsewhere)

A reusable guide to the top navigation bar built for ORCA on 2026-11-07. It explains the design, the decisions behind it, the code that makes it work, the bugs that were found while building it, and how to check a copy of it. The code is React + TypeScript + plain CSS with design tokens, but every rule is stated so it carries over to another stack.

**What it looks like:**

```
 ┌──────────────╮       ╭────────────────────────────────────────────╮       ╭──────────────────┐
 │  ◉ ORCA      │       │ ☰ Overview  ◎ Globe  ⚭ Conj…  ▥ Analytics  ⛁ Data │       │   🔍    ≡①       │
 └──────────────╯       ╰──────────────────────────────────────────── ╯       ╰──────────────────┘
 left capsule,          centre tab, hanging from the top edge,               right capsule,
 flush with the         rounded at the bottom, centred on the                flush with the
 left screen edge       viewport whatever the sides' widths                  right screen edge
```

Snapshots of every state are in `snapshots/08-top-bar-2026-11-07/` and `snapshots/09-home-page-2026-11-07/`.

---

## 1. The design in one paragraph

The bar is **three separate shapes on the page background, not one strip**. On the left, a capsule holds only the logo; it is attached to the left edge of the screen and rounded on its right. In the centre, the views (icon + label) sit in a tab that hangs from the top edge and is rounded at its bottom; it is always centred on the viewport. On the right, a capsule attached to the right edge holds two controls: a search icon that expands into a matching capsule, and one hamburger menu that holds everything else. On load the side capsules slide in from their edges and the tab drops in from the top. Blue is used only for the active view, focus, and the notification count.

## 2. Why it is built this way (the decisions)

| Decision | Why |
|---|---|
| Three shapes, not one strip | The owner's sketch. Separate shapes read as calm and intentional; a full-width strip with everything in it read as cluttered and "generated". |
| No "Home" tab | Home is the default page; the logo is the way back (the universal convention). One fewer tab gives the views room. A keyboard shortcut (H) still works. |
| Icon + label tabs, no shortcut badges | Labels are recognisable at a glance; icons help scanning. Shortcut keys moved into the tooltip (`title="Globe (2)"`): little badges beside every tab were clutter. |
| Only the active view is blue (an underline) | Colour carries one meaning. Hover is a neutral state layer, not blue. |
| Search is an icon that expands | A permanent search field costs a third of the bar. An icon that grows into a field on demand keeps the bar quiet. |
| One hamburger holds everything else | Notifications, help, theme and sign out in one predictable place, instead of four icons. The button shows a count when a notification needs action. |
| The centre never moves | A `1fr auto 1fr` grid centres the middle column on the viewport regardless of the side widths, and the search field floats (absolute), so opening it cannot shift the views. |
| Restrained motion | 260 ms, an "emphasized" ease, no bounce, transform and opacity only, off under `prefers-reduced-motion`. |

## 3. Anatomy and the markup

```tsx
// AppBar.tsx
export function AppBar({ left, center, right }: { left: ReactNode; center: ReactNode; right: ReactNode }) {
  return (
    <header className="appbar">
      <div className="appbar__cell appbar__cell--left"><div className="appbar__left">{left}</div></div>
      <nav className="appbar__center" aria-label="Views">{center}</nav>
      <div className="appbar__cell appbar__cell--right"><div className="appbar__right">{right}</div></div>
    </header>
  )
}

// Where it is used
<AppBar
  left={<Brand href="#/home" onNavigate={() => go('home')} />}            // the logo is a link home
  center={<PrimaryNav view={view} onChange={go} />}                        // five icon+label tabs
  right={<>
    <SearchPopover open={searchOpen} onOpen={…} onClose={…} inputRef={searchRef}>
      <ObjectSearch bare … />                                              // the search field + results
    </SearchPopover>
    <AppMenu … notices={notices} onAsk={…} onShortcuts={…} onTour={…} onToggleTheme={…} onSignOut={…} />
  </>}
/>
```

Two details in the markup matter:

- **Each side has a cell and a capsule.** The cell (`appbar__cell`) spans its whole grid column; the capsule (`appbar__left` / `appbar__right`) is only as wide as its content. The right cell is the positioned ancestor of the search field, so the field can grow up to the column's width (section 6).
- **The centre is a `<nav aria-label="Views">`**, and each tab is a real `<button aria-current="page">` for the active one.

## 4. The layout CSS

All colours, radii, shadows, durations and easings are design tokens (CSS custom properties), so the same CSS works in light and dark themes.

```css
.appbar {
  position: relative;
  z-index: 30;                         /* menus and search results always draw above page content */
  display: grid;
  grid-template-columns: 1fr auto 1fr; /* the centre column is centred on the viewport */
  grid-template-areas: "left center right";
  align-items: start;
  height: var(--appbar-h);             /* 56px */
  gap: var(--gap-4);
  background: transparent;             /* no strip: the page shows between the shapes */
}
.appbar__cell { display: flex; align-items: center; height: 100%; min-width: 0; }
.appbar__cell--left  { grid-area: left;  justify-content: flex-start; }
.appbar__cell--right { grid-area: right; justify-content: flex-end; position: relative; }

/* the three shapes share one surface: panel colour, hairline border, light elevation */
.appbar__left, .appbar__right, .appbar__center {
  display: flex; align-items: center; min-width: 0;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  box-shadow: var(--elev-1);
}
.appbar__left {                       /* flush left, rounded on the right */
  height: 44px;
  padding: 0 var(--gap-5);
  border-left: 0;
  border-radius: 0 var(--radius-pill) var(--radius-pill) 0;
  animation: appbar-from-left 260ms var(--ease-emphasized) backwards;
}
.appbar__right {                      /* flush right, rounded on the left */
  height: 44px;
  gap: var(--gap-1);
  padding: 0 var(--gap-4) 0 var(--gap-3);
  border-right: 0;
  border-radius: var(--radius-pill) 0 0 var(--radius-pill);
  animation: appbar-from-right 260ms var(--ease-emphasized) backwards;
}
.appbar__center {                     /* hangs from the top edge, rounded at the bottom */
  grid-area: center;
  justify-content: center;
  gap: 2px;
  height: var(--appbar-h);            /* full bar height: its labels share the capsules' centreline */
  padding: 0 var(--gap-4);
  border-top: 0;
  border-radius: 0 0 22px 22px;
  animation: appbar-from-top 260ms var(--ease-emphasized) backwards;
}
@keyframes appbar-from-left  { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
@keyframes appbar-from-right { from { opacity: 0; transform: translateX(24px);  } to { opacity: 1; transform: none; } }
@keyframes appbar-from-top   { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
```

**The three numbers that make it "fit":** the bar is 56 px tall; the capsules are 44 px and vertically centred, so their middle is at 28 px; the centre tab is the full 56 px, so its tab buttons are also centred at 28 px. Logo, labels and icons then sit on one line. (A first version had a 46 px tab: its labels sat 6 px higher than the logo and icons, which was visible.)

Tokens used (example values, dark theme): `--appbar-h: 56px`, `--radius-pill: 999px`, `--gap-1..5: 4/8/12/16/24px`, `--border`, `--bg-panel`, `--elev-1` (a small two-layer shadow), `--ease-emphasized: cubic-bezier(0.3, 0, 0, 1)`, `--accent`, `--accent-ink`, `--state-hover` (a translucent tint), `--focus-ring`.

## 5. The view tabs

```tsx
// NavTab.tsx: one view switch, icon + label, the key in the tooltip
<button type="button" className={cx('nav-tab', active && 'nav-tab--active')}
  aria-current={active ? 'page' : undefined} title={`${label} (${hotkey})`} onClick={onClick}>
  <span className="nav-tab__icon" aria-hidden="true">{icon}</span>
  <span className="nav-tab__label">{label}</span>
</button>
```

```css
.nav-tab {
  position: relative; isolation: isolate;
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 10px;
  border: 0; border-radius: var(--radius-md); background: transparent;
  color: var(--text-secondary); font-weight: 500; white-space: nowrap;
}
/* hover = a neutral state layer, not a colour change */
.nav-tab::before { content: ''; position: absolute; z-index: -1; inset: 0; border-radius: inherit;
  background: var(--state-hover); opacity: 0; transition: opacity var(--dur-1) var(--ease-standard); }
.nav-tab:hover { color: var(--text-primary); }
.nav-tab:hover::before { opacity: 1; }
/* active = blue label + a 2px underline that grows in */
.nav-tab--active { color: var(--accent-ink); }
.nav-tab::after { content: ''; position: absolute; left: 10px; right: 10px; bottom: -4px; height: 2px;
  border-radius: 2px; background: var(--accent); transform: scaleX(0);
  transition: transform var(--dur-2) var(--ease-standard); }
.nav-tab--active::after { transform: scaleX(1); }
@media (pointer: coarse) { .nav-tab { height: 44px; } }   /* touch targets */
```

Icons are 16×16 stroke icons drawn from one path string each (no icon font, no download), 15 px in the tabs: list (Overview), globe (Globe), two overlapping circles (Conjunctions, "two objects meeting"), bar chart (Analytics), database cylinder (Data). Pick icons that mean the thing; an abstract squiggle was replaced because it read as a rendering fault.

## 6. Search: an icon that grows into a capsule

**Behaviour:** the icon opens a floating field that grows **leftwards** from the right edge, in the same capsule shape. It opens with the icon, `/` or Ctrl/Cmd+K, focuses its input, and closes with Esc or a click outside. The views never move.

```tsx
export function SearchPopover({ open, onOpen, onClose, inputRef, children }) {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (open) inputRef.current?.focus() }, [open, inputRef])
  useEffect(() => {                                  // outside click closes
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose])
  return (
    <div className="search-pop" ref={rootRef}
      onKeyDown={(e) => { if (open && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose()
        rootRef.current?.querySelector<HTMLElement>('.icon-btn')?.focus() } }}>
      <IconButton label="Search objects (/ or Ctrl+K)" popup="menu" expanded={open} onClick={() => (open ? onClose() : onOpen())}>
        <Icon name="search" />
      </IconButton>
      {open ? <div className="search-pop__panel">{children}</div> : null}
    </div>
  )
}
```

```css
.search-pop { display: inline-flex; }                 /* NOT positioned: see below */
.search-pop__panel {
  position: absolute; z-index: 60;
  top: 50%; right: 0;
  width: min(380px, 100%);                            /* 100% = the whole right grid column */
  padding: var(--gap-1) var(--gap-2) var(--gap-1) var(--gap-3);
  border: 1px solid var(--border-strong); border-right: 0;
  border-radius: var(--radius-pill) 0 0 var(--radius-pill);   /* same shape as the capsule */
  background: var(--surface-2); box-shadow: var(--elev-3);
  transform: translateY(-50%); transform-origin: right center;
  animation: search-pop-grow var(--dur-2) var(--ease-emphasized);
}
.search-pop__panel:focus-within { border-color: var(--focus-ring); box-shadow: var(--elev-3), 0 0 0 1px var(--focus-ring); }
@keyframes search-pop-grow { from { opacity: 0; transform: translateY(-50%) scaleX(0.6); }
                             to   { opacity: 1; transform: translateY(-50%) scaleX(1); } }
@media (max-width: 640px) {   /* phone: the field takes the whole first row */
  .search-pop__panel { position: fixed; top: var(--gap-2); left: var(--gap-2); right: var(--gap-2); width: auto; transform: none; }
}
```

**The trick that keeps it off the views.** The panel is positioned against the **right grid cell** (the nearest positioned ancestor), which spans the whole right column up to the gap before the centre tab. `width: min(380px, 100%)` therefore can never reach the views, at any screen width. Measured: 287 px wide at 1180 px, 337 at 1280, 380 at 1440 and 1920, always at least 16 px clear of the last tab.

**Inside the capsule the input is "bare"**: no border, no background, no ring of its own (a `bare` prop on the search field). The capsule's border turns blue on `:focus-within`, so there is exactly one outline and still a visible focus indicator.

**Keyboard:** `/` is a plain shortcut (ignored while typing in a field). Ctrl/Cmd+K is a modifier chord, so it needs its own listener: the plain-shortcut hook deliberately ignores chords so browser shortcuts keep working.

```ts
export function useSearchChord(onOpen: () => void, enabled = true) {
  const ref = useRef(onOpen); ref.current = onOpen
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.shiftKey) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
```

## 7. The hamburger: one menu for everything else

**Contents, in this order** (sections separated by a hairline, small uppercase headings):

1. "Signed in as **name**"
2. **Notifications**: only real, current conditions, or "Nothing needs your attention."
3. **Help**: Ask (the assistant) `.`, Keyboard shortcuts `?`, Take the tour
4. Switch to light/dark theme `T`
5. Sign out

Each row shows the key that does the same with the menu closed (recognition over recall). The button shows a small count when a notification needs action.

**One shared component for menu behaviour** (`PopoverMenu`), so every menu behaves identically:

```tsx
export function PopoverMenu({ label, icon, menuLabel, badge = 0, tourId, children }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const items = () => Array.from(popRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []).filter((el) => el.offsetParent !== null)
  const close = (restoreFocus: boolean) => { setOpen(false); if (restoreFocus) rootRef.current?.querySelector<HTMLElement>('.icon-btn')?.focus() }

  useEffect(() => { if (open) items()[0]?.focus() }, [open])                 // focus enters the menu
  useEffect(() => {                                                          // outside click closes
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return }  // one press = one step
    if (e.key === 'Tab') { setOpen(false); return }
    const list = items()
    const next = nextMenuIndex(list.indexOf(document.activeElement as HTMLElement), list.length, e.key) // Up/Down wrap, Home/End
    if (next !== null) { e.preventDefault(); list[next]?.focus() }
  }
  const named = badge > 0 ? `${label} (${badge})` : label                   // the count is in the accessible name too
  return (
    <div className="pop-menu" ref={rootRef} onKeyDown={onKeyDown} data-tour={tourId}>
      <IconButton label={named} popup="menu" expanded={open} onClick={() => setOpen((o) => !o)}>{icon}</IconButton>
      {badge > 0 ? <span className="pop-menu__badge" aria-hidden="true">{badge > 9 ? '9+' : badge}</span> : null}
      {open ? <div className="pop-menu__popover" role="menu" aria-label={menuLabel} ref={popRef}>{children(close)}</div> : null}
    </div>
  )
}
```

```ts
// pure and tested: where focus goes after a key, wrapping at both ends
export function nextMenuIndex(current: number, count: number, key: string): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowDown': return current < 0 ? 0 : (current + 1) % count
    case 'ArrowUp':   return current < 0 ? count - 1 : (current - 1 + count) % count
    case 'Home':      return 0
    case 'End':       return count - 1
    default:          return null
  }
}
```

The popover: `position: absolute; right: 0; top: calc(100% + 6px); min-width: 260px; max-width: calc(100vw - 24px)`, the elevated surface, a stronger border, `--elev-3`, and a 200 ms rise-and-fade on open (closing is instant so focus never waits). The badge: a small accent pill with the number, `pointer-events: none`.

**Notifications must be real.** They are computed by one pure, tested function from the app's actual state; nothing is invented to fill the list, and good news does not count on the badge:

```ts
export function buildNotices({ apiStatus, stale, searchPhase, searchSource }): Notice[] {
  const out: Notice[] = []
  if (apiStatus === 'offline') out.push({ id: 'api', tone: 'bad', title: 'The API is not answering', detail: '…', go: 'data' })
  if (searchPhase === 'failed') out.push({ id: 'search-failed', tone: 'bad', title: 'The search failed', detail: '…', go: 'conjunctions' })
  if (stale) out.push({ id: 'stale', tone: 'warn', title: stale.title, detail: '…', go: 'data' })
  if (searchPhase === 'running') out.push({ id: 'search-running', tone: 'ok', title: 'A search is running', detail: '…', go: 'conjunctions' })
  if (searchPhase === 'done' && searchSource === 'live') out.push({ id: 'search-done', tone: 'ok', title: 'Your search finished', detail: '…', go: 'conjunctions' })
  return out
}
export const badgeCount = (n: readonly Notice[]) => n.filter((x) => x.tone !== 'ok').length
```

Each notice row is a menu item with a status **dot and words** (never colour alone) and opens the place to act.

## 8. Narrow screens and touch

```css
@media (max-width: 1100px) {
  .appbar { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "left right" "center center"; height: auto; gap: var(--gap-2) var(--gap-3); }
  .appbar__cell { height: 54px; }
  .appbar__center {                      /* the views become a full-width band that scrolls sideways */
    justify-content: flex-start; height: auto; padding: 2px var(--gap-3) 6px;
    border-left: 0; border-right: 0; border-radius: 0;
    overflow-x: auto; scrollbar-width: none;
  }
  .appbar__center::-webkit-scrollbar { display: none; }
}
@media (max-width: 1100px) { .nav-tab { flex: none; } }   /* natural width; squeezing tabs made labels collide */
@media (pointer: coarse)   { .nav-tab, .icon-btn { min-height: 44px; } }
```

Things that only make sense with a keyboard (the "Keyboard shortcuts" row) are hidden on touch devices with `@media (pointer: coarse)`.

## 9. Accessibility checklist (all done in ORCA)

- Real `<button>`s, a `<nav aria-label="Views">`, `aria-current="page"` on the active tab.
- Menu buttons: `aria-haspopup="menu"` and `aria-expanded`; popovers `role="menu"` with `role="menuitem"` rows; non-interactive text in the menu has `role="presentation"`.
- Focus moves into a menu on open and back to its button on close; Esc is swallowed so it does not also trigger a page-wide action.
- The notification count is part of the button's accessible name ("Menu (1)").
- A visible focus ring everywhere (the search capsule shows it on `:focus-within`).
- 44 px targets on touch; all text and icons pass WCAG contrast (checked with a token contrast test).
- Motion: transform and opacity only, about 200 to 260 ms, and all of it off under `prefers-reduced-motion`.

## 10. Bugs found while building it (avoid them)

| Symptom | Cause | Fix |
|---|---|---|
| The open search field was only 92 px wide | An entrance animation with `animation-fill-mode: both` keeps its final `transform` applied forever. An element with an applied transform becomes the **containing block** of its absolute descendants, so the field measured itself against the small capsule instead of the column. | Use `animation-fill-mode: backwards`. It applies the start frame before the animation and nothing after, and the resting state equals the end frame anyway. |
| The search field covered the last tab | It was sized from the search icon (`width: 360px`), wider than the free space at 1440 px. | Position it against the right grid cell and size it `min(380px, 100%)`. |
| Search results drew behind page content | The page's hero had a transformed element later in the DOM, creating a stacking context above the bar's popover. | Give the header `position: relative; z-index: 30`. |
| View labels 6 px higher than logo and icons | The hanging tab was 46 px tall; the capsules' centre is at 28 px. | Make the tab the full bar height (56 px); measure all three centres. |
| Tab labels ran into each other on a phone | `flex: 1 1 0` with `min-width: 0` squeezed six tabs into 366 px. | Natural-width tabs (`flex: none`) and a horizontally scrolling row. |
| A "measurement" said it fitted, a screenshot said it did not | The check ran mid-animation. | Wait for animations to end (or bring the tab to the front) before measuring. |

## 11. How to check your copy

Look at it, then measure it: a screenshot can look right while something is a few pixels off.

```js
// paste into the browser console (or run with Playwright) at 1180, 1280, 1440 and 1920 px wide
const r = (s) => document.querySelector(s).getBoundingClientRect()
const mid = (b) => Math.round((b.top + b.bottom) / 2)
const nav = r('.appbar__center')
console.log({
  navCentredOffBy: Math.round((nav.left + nav.right) / 2 - innerWidth / 2),       // expect 0
  centreline: [mid(r('.brand-link')), mid(r('.nav-tab')), mid(r('.appbar__right .icon-btn'))], // expect all equal
})
// then open search (Ctrl+K) and check:
const p = r('.search-pop__panel')
console.log({ panelWidth: Math.round(p.width), clearOfViews: p.left >= nav.right })   // expect true
```

Also check, by hand: Ctrl/Cmd+K and `/` open search with the cursor in it; Esc and an outside click close it and focus returns to the icon; the hamburger opens with focus on its first row, arrows wrap, Esc closes; at 390 px there is no sideways scroll; the light theme shows three distinct shapes on the page background.

## 12. To reuse it in another project

1. Copy the tokens you need (surfaces, border, elevation, radii, gaps, easings, accent, state layers) or map them to your own.
2. Build `AppBar` (cells + capsules), `NavTab` + `PrimaryNav`, `PopoverMenu`, `SearchPopover`, then your hamburger content on top of `PopoverMenu`.
3. Decide what goes in the hamburger. Keep it to who you are, notifications, help, preferences and sign out. Do not add standalone header buttons; add a row.
4. Make notifications a pure function of real state, with a test, so the bell never lies.
5. Keep the centre column for navigation only, and keep the search field floating.
6. Use `animation-fill-mode: backwards` for entrance animations on anything that contains positioned children.
7. Run the checks in section 11 at four widths, in both themes, and on a phone.
