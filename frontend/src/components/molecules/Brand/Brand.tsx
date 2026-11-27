import { cx } from '@/lib/cx'
import './Brand.css'

type Props = {
  /** bar = the app header; card = the larger mark on the sign-in card. */
  size?: 'bar' | 'card'
  /** When given, the logo is a link (the app bar's way home). */
  href?: string
  onNavigate?: () => void
}

// BASE_URL keeps the path right if the app is ever served from a sub-folder instead of the site root.
const BASE = import.meta.env.BASE_URL

/**
 * The ORCA logo, transparent in both themes. There are two files made from the same artwork: silver lettering for dark
 * surfaces and dark navy lettering for light ones. Both are in the DOM and tokens.css decides which one shows
 * (--logo-on-dark-display / --logo-on-light-display); the hidden one is display:none, so a screen reader meets it once.
 * Pre-sized copies (320 and 640 px wide) are used instead of the multi-megabyte originals.
 */
export function Brand({ size = 'bar', href, onNavigate }: Props) {
  const file = size === 'card' ? 'logo-640' : 'logo-320'
  const common = { draggable: false, alt: 'ORCA' } as const
  const marks = (
    <>
      <img className={cx('brand', `brand--${size}`, 'brand--on-dark')} src={`${BASE}${file}.png`} {...common} />
      <img className={cx('brand', `brand--${size}`, 'brand--on-light')} src={`${BASE}${file}-light.png`} {...common} />
    </>
  )
  if (!href) return marks
  return (
    <a className="brand-link" href={href} aria-label="ORCA, go to Mission control" title="Mission control (H)"
      onClick={onNavigate ? (e) => { e.preventDefault(); onNavigate() } : undefined}>{marks}</a>
  )
}
