import type { ResultAnswer } from '@/lib/conjunctionSummary'
import { Button } from '../../atoms/Button/Button'
import { Dot } from '../../atoms/Dot/Dot'
import { Mono } from '../../atoms/Mono/Mono'
import { Spinner } from '../../atoms/Spinner/Spinner'
import { StatusIndicator } from '../../molecules/StatusIndicator/StatusIndicator'
import { BentoTile } from '../BentoTile/BentoTile'
import './ConjunctionTile.css'

/** What the workspace's conjunction search has to show: the three kinds of empty stay distinct (rules.md §2.4). */
export type ConjunctionTileState =
  | { kind: 'idle' }
  | { kind: 'running'; elapsedSeconds: number }
  | { kind: 'failed'; message: string }
  /** A finished search (or the saved example). `answer` is null when it found no approach at all; `none` then says so. */
  | { kind: 'done'; answer: ResultAnswer | null; none: string; context: string; saved: boolean }

type Props = {
  state: ConjunctionTileState
  onOpen: () => void
  onExploreSaved: () => void
  /** True while the saved example's chunk is loading. */
  loadingSaved: boolean
}

const TONE = { alert: 'critical', watch: 'high', calm: 'low' } as const
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/** The latest conjunction search in a sentence, or an invitation to run one or look at the saved example first. */
export function ConjunctionTile({ state, onOpen, onExploreSaved, loadingSaved }: Props) {
  let body
  if (state.kind === 'idle') {
    body = (
      <>
        <p className="conj-tile__lead">Which objects come close to each other?</p>
        <p className="conj-tile__text">
          No search has run in this session. A search screens every stored object for close approaches and takes several minutes; the saved
          example shows what a result looks like straight away.
        </p>
        <div className="conj-tile__actions">
          <Button onClick={onOpen}>Run a search</Button>
          <Button onClick={onExploreSaved} disabled={loadingSaved}>{loadingSaved ? 'Opening…' : 'Explore the saved example'}</Button>
        </div>
      </>
    )
  } else if (state.kind === 'running') {
    body = (
      <>
        <p className="conj-tile__lead conj-tile__running">
          <Spinner size={16} label="In progress" /> Search running <Mono>{clock(state.elapsedSeconds)}</Mono>
        </p>
        <p className="conj-tile__text">Screening the stored catalog for close approaches. It keeps running while you look around; the result will wait on Conjunctions.</p>
        <div className="conj-tile__actions"><Button onClick={onOpen}>Open Conjunctions</Button></div>
      </>
    )
  } else if (state.kind === 'failed') {
    body = (
      <>
        <p className="conj-tile__lead"><StatusIndicator tone="bad" label="The last search failed" /></p>
        <p className="conj-tile__text">{state.message}</p>
        <div className="conj-tile__actions"><Button onClick={onOpen}>Open Conjunctions</Button></div>
      </>
    )
  } else {
    body = (
      <>
        {state.saved ? <p className="conj-tile__saved">Saved example run, not live</p> : null}
        {state.answer ? (
          <>
            <p className="conj-tile__lead conj-tile__answer"><Dot tone={TONE[state.answer.tone]} size={9} /> {state.answer.headline}</p>
            <p className="conj-tile__text">{state.answer.detail}</p>
          </>
        ) : <p className="conj-tile__lead">{state.none}</p>}
        <p className="conj-tile__context">{state.context}</p>
        <div className="conj-tile__actions"><Button onClick={onOpen}>{state.saved ? 'Open the example' : 'Open the result'}</Button></div>
      </>
    )
  }
  return <BentoTile title="Conjunctions" span={6}>{body}</BentoTile>
}
