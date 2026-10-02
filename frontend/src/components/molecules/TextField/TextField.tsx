import { useId } from 'react'
import type { Ref } from 'react'
import { Label } from '../../atoms/Label/Label'
import './TextField.css'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'password'
  /** Browser autofill hint: "username" or "current-password" lets a password manager do its job. */
  autoComplete?: string
  name?: string
  inputRef?: Ref<HTMLInputElement>
  disabled?: boolean
}

export function TextField({ label, value, onChange, type = 'text', autoComplete, name, inputRef, disabled }: Props) {
  const id = useId()
  return (
    <div className="text-field">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        ref={inputRef}
        className="text-field__input"
        type={type}
        name={name}
        value={value}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
