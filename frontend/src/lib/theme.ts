export type Theme = 'dark' | 'light'

/**
 * The colour the browser paints its own toolbar and overscroll with. It is the page background (`--bg-canvas`) of each
 * theme, written here because a <meta> cannot read a CSS variable; src/lib/rules.test.ts fails if it drifts from tokens.css.
 */
export const THEME_COLOR: Record<Theme, string> = { dark: '#0b0f14', light: '#eef1f5' }

/** Point the <meta name="theme-color"> at the active theme's colour. Safe to call when the tag is absent. */
export function applyThemeColor(theme: Theme, doc: Document = document): void {
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}
