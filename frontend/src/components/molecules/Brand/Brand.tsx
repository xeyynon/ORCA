import { cx } from '@/lib/cx'
import './Brand.css'

type Props = {
  /** bar = the app header; card = the larger mark on the sign-in card. */
  size?: 'bar' | 'card'
}

// BASE_URL keeps the path right if the app is ever served from a sub-folder instead of the site root.
const BASE = import.meta.env.BASE_URL

/**
 * The ORCA logo: one transparent PNG made for dark surfaces. It sits directly on the dark theme and on a dark chip on the
 * light one (--logo-backdrop / --logo-pad), because silver lettering on white is not legible.
 * Pre-sized copies (320 and 640 px wide) are used instead of the multi-megabyte source in frontend/branding/.
 */
export function Brand({ size = 'bar' }: Props) {
  return (
    <img
      className={cx('brand', `brand--${size}`)}
      src={`${BASE}${size === 'card' ? 'logo-640.png' : 'logo-320.png'}`}
      alt="ORCA"
      draggable={false}
    />
  )
}
