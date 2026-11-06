/** How long after an automatic reload another one is allowed (ms). Stops a reload loop when a chunk is genuinely gone. */
export const RELOAD_COOLDOWN_MS = 60_000

/**
 * After a deploy, a tab opened earlier still asks for the old hashed chunk names; the server answers 404 and a lazy
 * screen throws. One automatic reload fetches the new index.html. Reload only if we have not just done so.
 */
export function shouldAutoReload(lastReloadMs: number | null, nowMs: number): boolean {
  return lastReloadMs === null || !Number.isFinite(lastReloadMs) || nowMs - lastReloadMs >= RELOAD_COOLDOWN_MS
}

/** True for the errors a missing or stale code chunk produces (browser wording differs, so match the known ones). */
export function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(text)
}

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }

const KEY = 'orca:chunk-reload'

/** The tab's sessionStorage, or null when the browser blocks it (private modes). Never throws. */
export function browserSessionStorage(): StorageLike | null {
  try { return window.sessionStorage } catch { return null }
}

/**
 * Reload the page once per cooldown. Returns true if it reloaded. With no usable storage it never reloads by itself,
 * because it could not remember having done so and might loop.
 */
export function autoReloadOnce(storage: StorageLike | null, nowMs: number, reload: () => void): boolean {
  if (!storage) return false
  try {
    const raw = storage.getItem(KEY)
    const last = raw === null ? null : Number(raw)
    if (!shouldAutoReload(last, nowMs)) return false
    storage.setItem(KEY, String(nowMs))
  } catch { return false }
  reload()
  return true
}
