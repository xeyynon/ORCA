// What a copy button shows, from the last copy attempt that hooks/useClipboard remembers.

export type CopyState = 'idle' | 'copied' | 'failed'

/** The state of the copy button for `key`, given the last attempt (null once its confirmation has faded). */
export function copyState(last: { key: string; ok: boolean } | null, key: string): CopyState {
  if (last === null || last.key !== key) return 'idle'
  return last.ok ? 'copied' : 'failed'
}

/** The sentence announced (role="status") for a state. `what` names the value: "Username" -> "Username copied". */
export function copyMessage(state: CopyState, what: string): string {
  if (state === 'copied') return `${what.charAt(0).toUpperCase()}${what.slice(1)} copied`
  if (state === 'failed') return 'Copy failed — select the text'
  return ''
}
