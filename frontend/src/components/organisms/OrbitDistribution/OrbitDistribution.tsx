import { REGIME_COLOR } from '@/lib/chartColors'
import { REGIME_NAME, sharePercent } from '@/lib/homeStory'
import { REGIMES } from '@/lib/orbit'
import type { Regime } from '@/lib/orbit'
import { Skeleton } from '../../atoms/Skeleton/Skeleton'
import { ArrowLink } from '../../molecules/ArrowLink/ArrowLink'
import { BlockHeader } from '../../molecules/BlockHeader/BlockHeader'
import { EmptyState } from '../../molecules/EmptyState/EmptyState'
import { BarList } from '../BarList/BarList'
import './OrbitDistribution.css'

type Props = {
  /** Counts over the whole stored catalogue, by regime. Null while loading or when unavailable. */
  counts: Record<Regime, number> | null
  unclassified: number
  total: number | null
  failed: boolean
  onOpen: () => void
}

/**
 * "Where are objects orbiting?": the whole catalogue by orbit regime, as labelled bars with the count and share printed
 * (never read from bar length alone). Classified from each TLE's orbit; objects that cannot be classified are shown too.
 */
export function OrbitDistribution({ counts, unclassified, total, failed, onOpen }: Props) {
  const items = counts && total
    ? [
        ...REGIMES.map((r) => ({ label: r, title: REGIME_NAME[r], value: counts[r] ?? 0, color: REGIME_COLOR[r], share: sharePercent(counts[r] ?? 0, total) ?? undefined })),
        ...(unclassified > 0 ? [{ label: 'Other', title: 'Not classified: the orbit data is not physical', value: unclassified, color: 'var(--risk-negligible)', share: sharePercent(unclassified, total) ?? undefined }] : []),
      ]
    : null
  return (
    <section className="home-panel orbit-dist" aria-labelledby="orbit-dist-title">
      <BlockHeader id="orbit-dist-title" title="Where are objects orbiting?" sub="The whole catalogue, by orbit regime."
        action={<ArrowLink label="See the charts" onClick={onOpen} />} />
      {items ? (
        <>
          <BarList items={items} ariaLabel="Catalogued objects by orbit regime" />
          <p className="home-panel__note">LEO low Earth · MEO medium Earth · GEO geostationary · HEO highly elliptical. Classified from each TLE's orbit.</p>
        </>
      ) : failed ? (
        <EmptyState kind="error" title="Not available">The catalogue summary could not be loaded.</EmptyState>
      ) : (
        <div className="orbit-dist__loading" aria-busy="true" aria-label="Loading the orbit regimes">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} width="100%" height="12px" />)}
        </div>
      )}
    </section>
  )
}
