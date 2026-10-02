import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useTheme } from '@/hooks/useTheme'
import type { LoginFailure } from '@/lib/authErrors'
import { ThemeToggle } from '@/components/molecules/ThemeToggle/ThemeToggle'
import { LoadingScreen } from '@/components/views/LoadingScreen/LoadingScreen'
import { LoginView } from '@/components/views/LoginView/LoginView'
import { Workspace } from './Workspace'

/**
 * The gate. It decides between the login screen and the workspace and does nothing else. The theme lives here so
 * both screens share it (a theme toggle that exists on one screen in two is a control most people never find).
 * The real protection is server-side: the API refuses every data request without a valid token.
 */
export function App() {
  const { theme, toggle } = useTheme()
  const { state, configured, signIn, signOut } = useSession()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<LoginFailure | null>(null)

  // The static splash in index.html covers the page until JavaScript is ready; hand over to React's own screens now.
  useEffect(() => { document.getElementById('boot')?.remove() }, [])

  if (state.status === 'signedIn') {
    return <Workspace username={state.username} onSignOut={signOut} theme={theme} onToggleTheme={toggle} />
  }

  // While a stored token is being checked, say so, rather than flash a login form that is about to vanish.
  if (state.status === 'checking') return <LoadingScreen message="Checking your session" />

  const submit = async (username: string, password: string) => {
    setBusy(true)
    setFailure(null)
    const result = await signIn(username, password)
    setBusy(false)
    if (!result.ok) setFailure(result.failure)
  }

  return (
    <LoginView
      configured={configured}
      notice={state.notice}
      busy={busy}
      failure={failure}
      onSubmit={submit}
      corner={<ThemeToggle theme={theme} onToggle={toggle} />}
    />
  )
}
