import { useId } from 'react'
import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'
import './BentoTile.css'

export type TileSpan = 3 | 4 | 5 | 6 | 7 | 8 | 12

type Props = {
  /** The tile's h2. Styled small: the content, not the heading, is what the eye should land on. */
  title: string
  /** Columns of the 12-column grid from 1100 px up. Between 700 and 1100 px a tile takes half (the hero all). Phone: all. */
  span: TileSpan
  /** The one hero tile of the screen: full width below 1100 px and roomier. Emphasis is size and type, never colour. */
  hero?: boolean
  /**
   * For a tile that is a single action: the whole tile becomes the link (a stretched link with a Material state layer).
   * Only when the tile holds no other control, or the stretched area would cover it.
   */
  link?: { label: string; href: string }
  /** True while the tile's numbers are loading (announced as busy). */
  busy?: boolean
  children: ReactNode
}

/** One bento tile: a section with its own heading on the card surface (level 1). Not a card nested in a card. */
export function BentoTile({ title, span, hero = false, link, busy = false, children }: Props) {
  const id = useId()
  return (
    <section className={cx('bento-tile', `bento-tile--span-${span}`, hero && 'bento-tile--hero', link && 'bento-tile--link')} aria-labelledby={id} aria-busy={busy || undefined}>
      <h2 className="bento-tile__title" id={id}>{title}</h2>
      <div className="bento-tile__body">{children}</div>
      {link ? <a className="bento-tile__link" href={link.href}>{link.label} <span aria-hidden="true">›</span></a> : null}
    </section>
  )
}
