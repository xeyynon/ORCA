/**
 * What's new: every build, newest first, in plain words for the people using ORCA. Each entry is one `build-N` tag
 * of the repository. Internal changes (InBul tags: docs, scripts, tests) are not listed, because nothing on screen changed.
 */
export interface BuildNote {
  build: number
  /** Day the build reached `main`, YYYY-MM-DD. */
  date: string
  title: string
  changes: readonly string[]
}

export const BUILDS: readonly BuildNote[] = [
  {
    build: 1009,
    date: '2026-11-18',
    title: 'A turning Earth and this list',
    changes: [
      'The Earth on the home page keeps turning after the collision scene. It used to stop after a few seconds and look stuck.',
      "What's new: this list, in the menu, with the build you are using.",
    ],
  },
  {
    build: 1008,
    date: '2026-11-17',
    title: 'Clearer words everywhere',
    changes: [
      'Ask ORCA and the term tooltips explain nine more terms, such as conjunction, screening and epoch.',
      'The note on collision probability now describes the method the app really uses.',
      'Tour cards are shorter: three sentences at most.',
    ],
  },
  {
    build: 1007,
    date: '2026-11-16',
    title: 'Bug sweep and a floating status bar',
    changes: [
      'Objects on the globe are drawn in more accurate places, after two small errors in how ORCA counts time were fixed.',
      'The catalog is stored in one step, and objects with unusable data are skipped instead of breaking a page.',
      'The status bar floats over the page as two small capsules, so pages use the full height.',
      'Downloading the whole catalog from CelesTrak can now take up to 2 minutes, instead of giving up after 10 seconds.',
    ],
  },
  {
    build: 1006,
    date: '2026-11-16',
    title: 'Less clutter on every page',
    changes: [
      'Every page was trimmed: each figure is said once, long tables show a page at a time and notes are one line.',
      'The Globe can colour objects by constellation (Starlink, OneWeb, Kuiper, Qianfan).',
      "A new page, opened from Data, says in plain words whether ORCA's server is answering.",
    ],
  },
  {
    build: 1005,
    date: '2026-11-07',
    title: 'A new look',
    changes: [
      'A new design across the app and a new top bar.',
      'Mission control: a home page with the main figures and the worst close approaches.',
      'A first-run tour, Ask ORCA for questions in plain words, and a Reports page that saves a PDF.',
    ],
  },
  {
    build: 1004,
    date: '2026-11-07',
    title: 'Easier to follow',
    changes: [
      'A conjunction search keeps its result when you move to another page.',
      'Results start with the answer, and a saved example run can be explored without waiting.',
      'Better phone layout, a menu in the header, and Analytics over the whole catalog.',
    ],
  },
  {
    build: 1003,
    date: '2026-10-16',
    title: 'A more accurate conjunction search',
    changes: [
      'The close-approach search was rebuilt: every object is checked every 20 seconds, so no approach closer than the report distance is missed.',
      'Each approach gets its exact time and a collision probability, with the method and its limits shown beside the results.',
    ],
  },
  {
    build: 1002,
    date: '2026-10-09',
    title: 'ORCA goes online',
    changes: ['ORCA is hosted on the internet and updates itself whenever new work is merged.'],
  },
  {
    build: 1001,
    date: '2026-10-03',
    title: 'Sign-in and a new Globe',
    changes: [
      'A sign-in page with an animated scene of orbiting debris.',
      'A rebuilt Globe with playback, filters and close approaches drawn on it, and a reworked Analytics page.',
    ],
  },
  {
    build: 1000,
    date: '2026-10-03',
    title: 'The first version',
    changes: ['Satellite data downloaded and stored, orbits computed, a search for close approaches, and the web app to see them.'],
  },
]

/** The newest build: the one this copy of ORCA was built from or after. */
export const LATEST_BUILD: BuildNote = BUILDS[0]

/** "18 November 2026" from "2026-11-18", without depending on the browser's locale or time zone. */
export function formatBuildDate(iso: string): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`
}
