import { useCallback } from 'react'
import type { RefObject } from 'react'

/** Toggle fullscreen for an element. Browsers can refuse (no user gesture, embedded frame): that is ignored, not an error. */
export function useFullscreen(ref: RefObject<HTMLElement | null>): () => void {
  return useCallback(() => {
    if (document.fullscreenElement) { void document.exitFullscreen().catch(() => {}); return }
    void ref.current?.requestFullscreen?.().catch(() => {})
  }, [ref])
}
