import './Divider.css'

type Props = { vertical?: boolean }

export function Divider({ vertical = false }: Props) {
  return <span className={vertical ? 'divider divider--v' : 'divider'} role="separator" aria-orientation={vertical ? 'vertical' : 'horizontal'} />
}
