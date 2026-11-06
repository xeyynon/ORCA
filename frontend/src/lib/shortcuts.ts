/** The single list the help panel renders. Keep it in step with the bindings in App.tsx. */
export interface ShortcutDef { keys: readonly string[]; description: string }
export interface ShortcutGroup { title: string; items: readonly ShortcutDef[] }

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: 'Navigate',
    items: [
      { keys: ['H'], description: 'Mission control (home)' },
      { keys: ['1'], description: 'Overview' },
      { keys: ['2'], description: 'Globe' },
      { keys: ['3'], description: 'Conjunctions' },
      { keys: ['4'], description: 'Analytics' },
      { keys: ['5'], description: 'Data' },
      { keys: ['/'], description: 'Search objects' },
      { keys: ['Esc'], description: 'Close, then clear selection (one step per press)' },
    ],
  },
  {
    title: 'Interface',
    items: [
      { keys: ['T'], description: 'Toggle light / dark theme' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
  {
    title: 'Globe',
    items: [
      { keys: ['Space'], description: 'Pause / resume auto-rotate' },
    ],
  },
]
