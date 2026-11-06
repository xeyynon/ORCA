# ORCA Homepage Redesign --- Design Context

> **Purpose:** This document is the source-of-truth context for
> redesigning the ORCA homepage. Use it when briefing a design or
> development session. It captures the agreed direction, existing
> product identity, page structure, visual references, interaction
> expectations, and implementation constraints.

## 1. Project context

ORCA is a Space Situational Awareness (SSA) research/educational
platform that uses publicly available orbital data to catalogue objects,
screen potential close approaches, and communicate collision-risk
information.

The homepage should feel like a credible **space-monitoring command
centre**, not a generic SaaS landing page. It must help visitors quickly
understand:

1.  How many orbital objects are in the catalogue?
2.  What close approaches have been identified?
3.  What is the collision-risk situation?
4.  How fresh and reliable is the underlying orbital data?

### Agreed design direction

-   **Selected direction:** A --- Space Command Centre.
-   **Earth visualization:** Medium-sized, integrated into the hero on
    the right.
-   **Design principle:** Information-first, technically credible,
    refined and uncluttered.
-   **Scope:** Redesign the homepage only. Do not reinvent ORCA or
    redesign the other application pages as part of this task.

## 2. Existing homepage reference

The current homepage screenshot is included below. Treat it as the
reference for the existing brand, navigation, content and data
presentation---not as a layout to copy unchanged.

![Current ORCA homepage](assets/orca-current-homepage.png)

### Existing content visible in the screenshot

-   ORCA logo at the top left.
-   Navigation: Overview, Globe, Conjunctions, Analytics, Data.
-   Search control and notification indicator at the right.
-   Hero headline: "15,970 objects are circling Earth right now."
-   Hero actions: "Watch them move" and "See the close approaches".
-   One-minute tour link.
-   Three explanatory cards: Track, Screen, Understand.
-   Right Now summary: 95% in low Earth orbit; median TLE age 30 days; 0
    critical and 29 high-risk approaches.
-   Bottom status strip: API status, object count, oldest TLE, last API
    refresh and UTC time.

The screenshot's stored-example-run context must be preserved. Do not
turn example-run values into claims of live operational monitoring.

## 3. Brand and visual identity to retain

Keep the existing ORCA identity recognizable:

-   Dark, near-black navy background.
-   Slightly lighter navy surfaces for cards and panels.
-   Restrained ORCA blue accents.
-   Cool white primary text and muted blue-grey secondary text.
-   Thin, subtle borders.
-   Moderate corner radii.
-   Clean, precise typography.

Suggested design tokens (refine only if the existing codebase already
has equivalent tokens):

  Token                  Suggested value
  ---------------------- -----------------------
  Page background        `#0B0F14`
  Card background        `#151C26`
  Elevated surface       `#192332`
  Primary accent         `#78A5F5`
  Main text              `#E8EDF5`
  Secondary text         `#94A6BF`
  Dividers               `#253142`
  Card radius            14--18px
  Content max-width      approximately 1,300px
  Main section spacing   approximately 24px

Typography should be modern and legible (for example, Inter or Geist).
Use tabular or monospaced numerals for metrics and timestamps where
helpful.

### Avoid

-   Excessive card nesting.
-   A border around every individual content group.
-   Too many rounded containers.
-   Decorative gradients and glow effects used everywhere.
-   Large empty gaps.
-   Unnecessary icons, avatars, notification bells or help controls.
-   Excessive animation.
-   Generic stock imagery where an existing ORCA globe renderer can be
    reused.

## 4. Navigation --- preserve the previous decision

The header should have three visually independent zones:

1.  **Left:** ORCA logo.
2.  **Centre:** Overview, Globe, Conjunctions, Analytics, Data.
3.  **Right:** Search and hamburger/menu control.

### Navigation behaviour

-   Keep the navigation horizontally centred.
-   Keep the logo anchored to the far left.
-   Keep search on the right; when activated, its input should expand
    toward the left.
-   Keep the hamburger isolated at the far right.
-   Use a subtle blue active-state indicator rather than a large filled
    tab.
-   Do not add a breadcrumb, avatar, extra notification bell or help
    button.
-   The three zones should not feel like one oversized navigation
    container.
-   Preserve existing routes and navigation behaviour.

## 5. Homepage structure and content

Implement the following sections in this order.

### Section 01 --- Mission overview / Hero

**Purpose:** Establish ORCA's mission and provide the two primary
navigation actions.

**Layout:** Approximately 60% text on the left and 40% visualization on
the right.

**Suggested content:**

Eyebrow: `SPACE SITUATIONAL AWARENESS`

Headline: `Understanding what's happening in Earth's orbit.`

Supporting copy:
`Track orbital objects, identify close approaches and assess potential collision risks using publicly available orbital data.`

Primary action: `Explore Globe`

Secondary action: `View Conjunctions`

Context line: `DATA SNAPSHOT · [actual snapshot date/time] UTC`

**Earth visualization:**

-   Medium-sized 3D Earth on the right.
-   Reuse the existing ORCA globe or visualization component if
    available.
-   Show a restrained number of orbital trajectories and satellite
    markers.
-   Use subtle stars and atmospheric lighting.
-   Keep the visualization secondary to the text and avoid making it a
    cinematic full-screen background.
-   Do not use a generic static Earth illustration if the real
    application renderer can be reused.

**Visual reference brief / image prompt:**

> A professional dark-navy aerospace mission-control dashboard hero.
> Text and concise actions occupy the left 60%; a medium-sized realistic
> 3D Earth with a few fine blue orbital paths and satellite markers
> occupies the right 40%. Restrained atmospheric glow, precise
> data-platform aesthetic, generous but controlled spacing, no excessive
> gradients, no decorative clutter.

### Section 02 --- Orbital intelligence / KPI metrics

**Purpose:** Make the platform's most important information immediately
visible.

Use four aligned metric cards on desktop:

  ------------------------------------------------------------------------
  Metric                          Value from current Supporting label
                                          screenshot 
  --------------------- ---------------------------- ---------------------
  Catalogued objects                          15,970 Objects in the
                                                     tracked catalogue

  Close-pair encounters                      442,786 Pairs within 10 km in
                                                     the stored example
                                                     run

  High-risk approaches                            29 Flagged by the stored
                                                     screening run

  Critical approaches                              0 In the stored example
                                                     run
  ------------------------------------------------------------------------

**Important data rule:** The 442,786 close-pair count comes from the
existing hero copy and is a count of pairs that came within 10 km during
the example run. It must not be described as 442,786 confirmed
conjunctions or collision events. Keep run-specific labels attached to
the risk values.

**Interaction:** Clicking a metric should open the relevant page,
ideally with the appropriate filter or view selected.

**Visual reference brief / image prompt:**

> Four compact horizontal KPI cards for a premium dark aerospace
> dashboard, navy surfaces, subtle borders, large aligned numerals,
> small muted labels, restrained blue icons, no heavy shadows, no
> oversized colourful badges.

### Section 03 --- Close approach intelligence / Conjunction monitoring

**Purpose:** Put ORCA's differentiating functionality at the centre of
the homepage.

Heading: `Close approach intelligence`

Supporting copy:
`Potential encounters identified through orbital screening.`

Action: `View all conjunctions →`

Recommended table columns:

  Column                       Meaning
  ---------------------------- -----------------------------------------
  Object pair                  Primary and secondary catalogue objects
  TCA                          Time of closest approach
  Miss distance                Predicted separation
  Collision probability (Pc)   Probability estimate, where available
  Risk                         ORCA risk classification

Display up to five relevant records, selected from actual screening
results. Prefer ordering by risk and/or TCA according to the product's
existing logic.

Risk presentation: - High: restrained red/orange. - Medium: restrained
amber. - Low: neutral blue/grey.

Use small, understated labels rather than oversized badges. Support
sorting if the existing data model and table components permit it.
Selecting a row should open the existing detailed conjunction analysis.

**Do not create fake object names, TCA values, miss distances,
probabilities or risk records.** If no real records are available, show
a clear empty state rather than sample data presented as real.

**Visual reference brief / image prompt:**

> A precise dark-navy satellite conjunction-monitoring table in an
> aerospace research dashboard. Compact rows, readable object-pair
> identifiers, TCA timestamps, miss-distance values, Pc column and
> subtle risk labels. Minimal blue accents, restrained red/amber risk
> colours, high information density without visual clutter.

### Section 04 --- Orbital distribution and data quality

**Purpose:** Provide useful analytical context without requiring users
to open Analytics.

Use two side-by-side panels on desktop.

**Left panel --- Where are objects orbiting?**

Show counts and percentages for: - LEO - MEO - GEO - Other /
unclassified

Use the actual catalogue classification and counts. A horizontal bar
chart or compact distribution chart is preferred.

**Right panel --- Data quality**

Show: - Median TLE age. - Latest successful API refresh. - Catalogue
coverage, if the backend provides a meaningful definition. - Data-source
availability/status.

Use explicit freshness labels and explanatory text. Do not imply that a
30-day-old median TLE is real-time data.

**Visual reference brief / image prompt:**

> A clean dark aerospace analytics dashboard with two side-by-side
> panels: an orbital altitude distribution chart for LEO, MEO, GEO and
> other objects, and a data-quality panel showing TLE freshness and
> source refresh status. Restrained navy and blue palette, compact
> labels, clear chart hierarchy.

### Section 05 --- ORCA system status

**Purpose:** Replace the cramped bottom status strip with a readable but
compact status area.

Suggested fields: - API status. - Catalogue size. - Oldest TLE age. -
Last successful API refresh. - Current display time in UTC, if useful.

Use the actual values and exact timestamps from the system. Clearly
distinguish: - API connection status. - Time of the last successful
refresh. - Age of the orbital data itself.

Do not treat a connected API as proof that every underlying TLE record
is fresh.

Keep this section visually secondary. It should not become another large
hero or a dense developer console.

## 6. Final page hierarchy

1.  Navigation --- logo, centred tabs, search and menu.
2.  Mission overview --- headline, description, actions and medium Earth
    visualization.
3.  Orbital intelligence --- four KPI cards.
4.  Close approach intelligence --- real conjunction table preview.
5.  Orbital distribution and data quality --- two analytical panels.
6.  ORCA system status --- compact system information.

Move the existing "Track / Screen / Understand" explanatory cards out of
the main homepage. Retain their content in the one-minute guided tour or
an appropriate About/help section. Preserve the existing tour
functionality.

## 7. Responsive behaviour

  -----------------------------------------------------------------------
  Element                 Desktop                 Mobile
  ----------------------- ----------------------- -----------------------
  Navigation              Three-zone header with  Logo, menu and compact
                          centred tabs            search

  Hero                    Text and medium Earth   Text followed by
                          side-by-side            smaller Earth

  KPI metrics             Four columns            Two columns

  Conjunction table       Full table              Horizontally scrollable
                                                  table or carefully
                                                  designed compact rows

  Distribution / quality  Two columns             Stacked panels

  System status           Compact horizontal or   Collapsible or stacked
                          grid layout             information
  -----------------------------------------------------------------------

Maintain comfortable touch targets, readable data and no horizontal page
overflow. A conjunction table may scroll horizontally within its own
container.

## 8. Interaction and accessibility requirements

-   Metric cards should navigate to meaningful destinations.
-   Hero actions must use the existing Globe and Conjunctions routes.
-   Conjunction rows should open the relevant detail view.
-   Search should expand toward the left and remain keyboard accessible.
-   Navigation must expose clear active states.
-   Risk must not be communicated by colour alone; include text labels.
-   Charts must include readable labels and accessible supporting
    information.
-   Provide loading, empty, stale-data and API-error states.
-   Respect reduced-motion preferences.
-   Keep contrast and focus indicators accessible.

## 9. Data integrity and technical constraints

These are non-negotiable:

1.  Do not modify backend functionality, APIs, orbital calculations,
    SGP4 implementation, screening logic or risk classification as part
    of this homepage redesign.
2.  Reuse existing data sources, components and application routes
    wherever possible.
3.  Never invent satellite records, conjunctions, collision
    probabilities, refresh times or catalogue statistics.
4.  Do not label stored example-run values as live monitoring.
5.  Preserve the existing Globe, Conjunctions, Analytics and Data pages
    and their functionality.
6.  Preserve the existing ORCA branding and agreed navigation structure.
7.  Implement the homepage as one coherent information hierarchy, not as
    a collection of unrelated cards.
8.  Keep the implementation responsive and include loading/error/empty
    states.
9.  Do not remove or break the one-minute tour; relocate its explanatory
    content if needed.
10. Before implementation, inspect the current codebase and reuse
    existing components rather than assuming a new architecture.

## 10. Recommended implementation sequence

1.  Inspect the existing homepage, design tokens, routes, data contracts
    and globe renderer.
2.  Refine the three-zone navigation without breaking existing
    navigation.
3.  Implement the mission overview hero and integrate the existing Earth
    visualization.
4.  Implement the four KPI cards using real, correctly labelled data.
5.  Implement the conjunction preview using actual screening records.
6.  Implement orbital distribution and data-quality panels.
7.  Redesign the system-status area.
8.  Add responsive layouts, accessibility and all loading/error/empty
    states.
9.  Verify every route, metric, filter and interaction.
10. Compare the result against the original screenshot and this
    specification.

## 11. Acceptance checklist

-   [ ] Existing ORCA logo and identity are preserved.
-   [ ] Navigation retains Overview, Globe, Conjunctions, Analytics and
    Data.
-   [ ] Header uses the agreed left / centre / right arrangement.
-   [ ] Search expands leftward when activated.
-   [ ] Hero uses text on the left and a medium Earth visualization on
    the right.
-   [ ] The hero has Explore Globe and View Conjunctions actions.
-   [ ] KPI cards show real values with accurate contextual labels.
-   [ ] Close-approach preview uses real screening records only.
-   [ ] TCA, miss distance, Pc and risk are presented accurately where
    available.
-   [ ] Orbital distribution uses actual catalogue classifications.
-   [ ] TLE freshness and API refresh are clearly distinguished.
-   [ ] The system status area is readable and compact.
-   [ ] The one-minute tour remains available.
-   [ ] Existing application pages and backend functionality remain
    intact.
-   [ ] Desktop and mobile layouts work without page overflow.
-   [ ] Loading, empty, stale-data and error states are handled.

## 12. Short design brief for the implementation session

Redesign the ORCA homepage as a professional Space Situational Awareness
command centre. Retain the existing ORCA identity, dark navy palette,
blue accents, logo and navigation. Use the agreed three-zone header:
logo on the left, centred Overview / Globe / Conjunctions / Analytics /
Data navigation, and search plus menu on the right. Build a compact
mission hero with text and two actions on the left and a medium-sized
reuse of the existing Earth/orbit visualization on the right. Follow it
with four accurate KPI cards, a real-data close-approach table,
side-by-side orbital distribution and data-quality panels, and a compact
system-status section. Move the Track / Screen / Understand explanation
into the existing guided tour. Preserve all existing routes and backend
behaviour. Do not invent data or imply that stored example-run values
are live. Inspect and reuse the current codebase before making changes.
Prioritize information hierarchy, clarity, responsive behaviour and
technical credibility over decoration.

------------------------------------------------------------------------

**Document status:** Agreed design direction and homepage specification.

**Selected direction:** Space Command Centre.

**Earth visualization:** Medium.

**Primary design objective:** Make ORCA communicate what its orbital
screening has discovered, while clearly showing the provenance and
freshness of the data.
