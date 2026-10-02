import './Icon.css'

export type IconName = 'sun' | 'moon' | 'keyboard' | 'search' | 'close' | 'info' | 'download' | 'globe' | 'refresh' | 'arrow-left' | 'play' | 'pause'

// 16x16 stroke icons. Single-path or small-group definitions keep this file readable.
const PATHS: Record<IconName, string> = {
  sun: 'M8 3V1.5M8 14.5V13M3 8H1.5M14.5 8H13M4.5 4.5 3.4 3.4M12.6 12.6l-1.1-1.1M4.5 11.5l-1.1 1.1M12.6 3.4l-1.1 1.1M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  moon: 'M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z',
  keyboard: 'M1.5 4.5h13v7h-13ZM4 7h.01M6.5 7h.01M9 7h.01M11.5 7h.01M4.5 9.5h7',
  search: 'M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM10.5 10.5l3.5 3.5',
  close: 'M3.5 3.5l9 9M12.5 3.5l-9 9',
  info: 'M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM8 7.2V11M8 5v.01',
  download: 'M8 2v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11',
  globe: 'M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM1.5 8h13M8 1.5c-2 2-2.5 4-2.5 6.5s.5 4.5 2.5 6.5c2-2 2.5-4 2.5-6.5S10 3.5 8 1.5Z',
  refresh: 'M13.5 3v3.5H10M2.5 13V9.5H6M3.3 6.5A5 5 0 0 1 12.6 5.6l.9.9M12.7 9.5a5 5 0 0 1-9.3.9l-.9-.9',
  'arrow-left': 'M13 8H3M7 4 3 8l4 4',
  play: 'M4.5 3v10l8-5Z',
  pause: 'M5 3v10M11 3v10',
}

type Props = { name: IconName; size?: number }

export function Icon({ name, size = 16 }: Props) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}
