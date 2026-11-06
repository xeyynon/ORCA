/**
 * What to tell the user while the position snapshot is computed. One request serves all objects: the server
 * propagates the whole catalog in one pass whatever `limit` is, and the first N rows are not a sample of the
 * catalog (see GlobeView), so there is no honest partial picture to show. Instead the wait is stated, with the
 * seconds elapsed, and a way out once it is longer than any measured load.
 */
export type WaitNote = { title: string; body: string; canRetry: boolean }

/** Measured warm load is 1.5 to 4 s; a cold start was observed at up to a minute. */
export const SLOW_AFTER_MS = 6_000
export const STALLED_AFTER_MS = 60_000

export function positionsWaitNote(elapsedMs: number): WaitNote {
  const s = Math.max(0, Math.floor(elapsedMs / 1000))
  if (elapsedMs < SLOW_AFTER_MS) {
    return {
      title: 'Computing positions…',
      body: 'Every object’s position is calculated from its element set with SGP4, in one pass. This usually takes a few seconds; the first load after the server starts can take up to a minute. The points appear together when it finishes.',
      canRetry: false,
    }
  }
  if (elapsedMs < STALLED_AFTER_MS) {
    return {
      title: `Still computing positions (${s} s)`,
      body: 'The whole catalog is propagated in one pass, so the points appear all at once, not one by one. The counts on the left stay blank until then.',
      canRetry: false,
    }
  }
  return {
    title: `Taking longer than expected (${s} s)`,
    body: 'This is longer than the first load has taken before. The server may be busy or unreachable. You can keep waiting or try again.',
    canRetry: true,
  }
}
