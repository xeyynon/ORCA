import './Icon.css'

export type IconName = 'sun' | 'moon' | 'keyboard' | 'search' | 'close' | 'info' | 'download' | 'globe' | 'refresh' | 'arrow-left' | 'play' | 'pause' | 'logout' | 'login' | 'skip-back' | 'skip-forward' | 'expand' | 'locate' | 'copy' | 'check' | 'eye' | 'eye-off' | 'menu' | 'home' | 'list' | 'orbit' | 'chart' | 'database' | 'bell' | 'help' | 'chat' | 'arrow-right' | 'alert' | 'target' | 'file' | 'printer' | 'chevron-right' | 'chevron-left' | 'chevron-down' | 'sort-up' | 'sort-down'

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
  logout: 'M6.5 2.5h-3v11h3M10 5l3 3-3 3M13 8H6',
  login: 'M9.5 2.5h3v11h-3M6.5 5l3 3-3 3M9.5 8h-7',
  copy: 'M5.5 5.5h7v8h-7ZM3.5 10.5v-8h7',
  check: 'M3 8.5l3 3 7-7',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8ZM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  'eye-off': 'M2.5 2.5l11 11M6.4 3.7A6.6 6.6 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5a11 11 0 0 1-1.8 2.4M10.4 12a6.4 6.4 0 0 1-2.4.5c-4 0-6.5-4.5-6.5-4.5a11 11 0 0 1 2.3-2.8M6.6 6.6a2 2 0 0 0 2.8 2.8',
  'skip-back': 'M12 3 6 8l6 5V3ZM4 3v10',
  'skip-forward': 'M4 3l6 5-6 5V3ZM12 3v10',
  menu: 'M2.5 4.5h11M2.5 8h11M2.5 11.5h11',
  home: 'M2.5 7.5 8 3l5.5 4.5M4 6.5V13h3v-3.5h2V13h3V6.5',
  list: 'M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01',
  orbit: 'M6 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM10 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  chart: 'M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5',
  database: 'M3 4c0-1.1 2.2-2 5-2s5 .9 5 2-2.2 2-5 2-5-.9-5-2ZM3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2',
  bell: 'M4 11.5V7a4 4 0 0 1 8 0v4.5l1 1.5H3l1-1.5ZM6.5 14a1.5 1.5 0 0 0 3 0',
  help: 'M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM6.2 6.2a1.9 1.9 0 0 1 3.6.8c0 1.3-1.8 1.6-1.8 2.7M8 11.5v.01',
  expand: 'M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10',
  chat: 'M2.5 3h11v7.5H7.5L4.5 13v-2.5h-2Z',
  locate: 'M8 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2',
  'arrow-right': 'M2.5 8h11M9.5 4l4 4-4 4',
  'chevron-right': 'M6 3.5 10.5 8 6 12.5',
  'chevron-left': 'M10 3.5 5.5 8 10 12.5',
  'chevron-down': 'M3.5 6 8 10.5 12.5 6',
  'sort-up': 'M4 10.5 8 5.5l4 5Z',
  'sort-down': 'M4 5.5 8 10.5l4-5Z',
  alert: 'M8 2.2 14.3 13.3H1.7ZM8 6.5v3M8 11.3v.01',
  file: 'M4 1.5h5.5l3 3v10H4ZM9.5 1.5v3h3M6.2 8h4.6M6.2 10.5h4.6',
  printer: 'M4.5 6V1.5h7V6M4.5 12H2.5V6h11v6h-2M4.5 9.5h7v5h-7Z',
  target: 'M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 8h.01',
}

type Props = { name: IconName; size?: number }

export function Icon({ name, size = 16 }: Props) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  )
}
