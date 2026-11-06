import { integer } from '@/lib/format'
import { NO_DATA } from '@/lib/time'
import { Button } from '../../atoms/Button/Button'
import { Mono } from '../../atoms/Mono/Mono'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import { LegendItem } from '../../molecules/LegendItem/LegendItem'
import { BentoTile } from '../BentoTile/BentoTile'
import './HomeHeroTile.css'

export interface HeroTypeCount { label: string; value: number; color: string }

type Props = {
  /** Objects stored. Null while unknown. */
  total: number | null
  /** The figure on screen while it counts up (aria-hidden); `total` is what is announced. */
  shownTotal: number | null
  /** The catalog's story in one sentence, built from real counts (lib/homeStory). */
  story: string | null
  /** Where each part of the story comes from, when the parts cover different sets of objects. */
  scope: string | null
  /** Object types over the whole catalog, when the server has counted them. */
  types: readonly HeroTypeCount[] | null
  /** How the types were decided, as the server words it. */
  typeBasis: string | null
  loading: boolean
  /** Said instead of the numbers when they could not be loaded. */
  unavailable: string | null
  onShowOnGlobe: () => void
}

/** The one hero of Mission control: how many objects, what kind of orbit most are in, and how old the data is. */
export function HomeHeroTile({ total, shownTotal, story, scope, types, typeBasis, loading, unavailable, onShowOnGlobe }: Props) {
  return (
    <BentoTile title="What is in orbit" span={8} hero busy={loading}>
      <p className="hero-tile__figure">
        {total !== null ? (
          <>
            <span className="hero-tile__number" aria-hidden="true"><Mono>{integer(shownTotal ?? total)}</Mono></span>
            <span className="hero-tile__sr">{integer(total)}</span>
          </>
        ) : loading ? <Skeleton width="6ch" height="var(--text-hero)" /> : <span className="hero-tile__number"><Mono>{NO_DATA}</Mono></span>}
        <span className="hero-tile__unit"> objects tracked</span>
      </p>
      {story ? <p className="hero-tile__story">{story}</p> : loading ? <Skeleton width="min(36ch, 100%)" height="1.4em" /> : null}
      {unavailable ? <p className="hero-tile__note">{unavailable}</p> : null}
      {scope ? <p className="hero-tile__note">{scope}</p> : null}
      {types ? (
        <div className="hero-tile__types">
          <div className="hero-tile__type-list">
            {types.map((t) => <LegendItem key={t.label} shape="circle" color={t.color} label={t.label} value={integer(t.value)} />)}
          </div>
          {typeBasis ? <p className="hero-tile__note">{typeBasis}</p> : null}
        </div>
      ) : null}
      <div className="hero-tile__action">
        <Button variant="primary" onClick={onShowOnGlobe}>See them on the globe</Button>
      </div>
    </BentoTile>
  )
}
