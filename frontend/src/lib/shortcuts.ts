const ACTIVATION_KEYS: ReadonlySet<string> = new Set([' ', 'Enter'])
const ACTIVATABLE_TAGS: ReadonlySet<string> = new Set(['BUTTON', 'A', 'SUMMARY'])
const ACTIVATABLE_ROLES: ReadonlySet<string> = new Set(['button', 'link', 'checkbox', 'switch', 'tab', 'menuitem'])

/**
 * Space and Enter press a focused button or link. A global shortcut bound to Space must leave them alone: its
 * preventDefault stops the browser from clicking the button, so a keyboard user could not press Play on the globe.
 */
export function pressesFocusedControl(key: string, tagName: string, role: string | null): boolean {
  return ACTIVATION_KEYS.has(key) && (ACTIVATABLE_TAGS.has(tagName.toUpperCase()) || ACTIVATABLE_ROLES.has(role ?? ''))
}

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
      { keys: ['Esc'], description: 'Close things, then clear the selection (one step each time you press it)' },
    ],
  },
  {
    title: 'Interface',
    items: [
      { keys: ['T'], description: 'Switch between the light and dark theme' },
      { keys: ['?'], description: 'Show this help' },
      { keys: ['.'], description: 'Ask ORCA (type to find, show or explain things)' },
    ],
  },
  {
    title: 'Globe',
    items: [
      { keys: ['Space'], description: 'Pause or restart the automatic rotation' },
    ],
  },
]
