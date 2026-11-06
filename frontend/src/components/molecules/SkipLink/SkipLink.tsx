import './SkipLink.css'

type Props = { targetId: string; children: string }

/** The first Tab stop on the page: jumps past the header and nav to the content. Invisible until focused. */
export function SkipLink({ targetId, children }: Props) {
  // The app routes on the hash, so a plain #id link would change the view. Move focus instead.
  const jump = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    document.getElementById(targetId)?.focus()
  }
  return <a className="skip-link" href={`#${targetId}`} onClick={jump}>{children}</a>
}
