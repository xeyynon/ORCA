import type { EmptyCause } from '@/lib/catalogState'
import { formatUtc } from '@/lib/time'
import { Button } from '../../atoms/Button/Button'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'

type Props = { cause: EmptyCause; onGoData: () => void }

/**
 * "There are no objects", said for the reason the API recorded (rules.md §2.4-2.5): a refused fetch reads as a
 * failure with Celestrak's own sentence, a catalog nobody has loaded yet reads as an invitation to load it.
 */
export function EmptyCatalog({ cause, onGoData }: Props) {
  const goData = <Button variant="primary" onClick={onGoData}>Open the Data page</Button>
  switch (cause.kind) {
    case 'failed':
      return (
        <EmptyState kind="error" title="The catalog could not be loaded" action={goData}>
          {cause.detail} Nothing is stored yet. Last attempt: {formatUtc(cause.at)}.
        </EmptyState>
      )
    case 'empty':
      return (
        <EmptyState kind="error" title="Celestrak sent no usable data" action={goData}>
          The last refresh ({formatUtc(cause.at)}) came back with nothing to store. Try again from the Data page.
        </EmptyState>
      )
    case 'nothing':
      return (
        <EmptyState kind="error" title="The last refresh saved no objects" action={goData}>
          It finished at {formatUtc(cause.at)} without reporting a problem, yet the catalog is empty. Try the refresh again from the Data page.
        </EmptyState>
      )
    case 'never':
      return (
        <EmptyState kind="idle" title="No objects stored yet" action={goData}>
          Load a catalog from Celestrak on the Data page to get started.
        </EmptyState>
      )
  }
}
