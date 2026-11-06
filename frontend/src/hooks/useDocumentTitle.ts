import { useEffect } from 'react'

/** The browser tab, history entry and screen-reader page announcement name the view: "Conjunctions | ORCA". */
export function useDocumentTitle(view: string): void {
  useEffect(() => { document.title = `${view} | ORCA` }, [view])
}
