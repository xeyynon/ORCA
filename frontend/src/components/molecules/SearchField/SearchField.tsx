import type { Ref } from 'react'
import { Icon } from '../../atoms/Icon/Icon'
import { Kbd } from '../../atoms/Kbd/Kbd'
import './SearchField.css'

type Props = {
  inputRef?: Ref<HTMLInputElement>
  value: string
  placeholder: string
  ariaLabel: string
  /** Shortcut key shown at the right edge (recognition over recall). */
  hint?: string
  /** No box of its own: for a field that sits inside another surface (the search capsule), which shows the focus. */
  bare?: boolean
  onChange: (value: string) => void
  onFocus?: () => void
  onKeyDown?: (key: string) => void
}

export function SearchField({ inputRef, value, placeholder, ariaLabel, hint, bare = false, onChange, onFocus, onKeyDown }: Props) {
  return (
    <div className={bare ? 'search-field search-field--bare' : 'search-field'}>
      <span className="search-field__icon"><Icon name="search" size={14} /></span>
      <input
        ref={inputRef}
        className="search-field__input"
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={(e) => onKeyDown?.(e.key)}
      />
      {hint && !value ? <span className="search-field__hint"><Kbd>{hint}</Kbd></span> : null}
    </div>
  )
}
