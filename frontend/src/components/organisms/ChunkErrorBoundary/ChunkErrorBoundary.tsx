import { Component } from 'react'
import type { ReactNode } from 'react'
import { autoReloadOnce, browserSessionStorage, isChunkLoadError } from '@/lib/chunkReload'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'

type Props = { children: ReactNode }
type State = { failed: boolean }

/**
 * Wraps a lazily loaded screen. A missing chunk (typically after a deploy, in a tab opened before it) reloads the page once
 * to pick up the new build; any other error, or a chunk that still fails, shows a plain message with a Reload button instead
 * of a blank screen. A class, because React only supports error boundaries as classes. The reload rule lives in lib/chunkReload.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State { return { failed: true } }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error)) autoReloadOnce(browserSessionStorage(), Date.now(), () => window.location.reload())
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <EmptyState kind="error" title="This screen did not load" action={<Button onClick={() => window.location.reload()}>Reload</Button>}>
        The app may have been updated since this tab was opened. Reloading fetches the latest version.
      </EmptyState>
    )
  }
}
