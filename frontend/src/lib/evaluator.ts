export type Credential = { username: string; password: string }

/**
 * The evaluator credential shown on the sign-in page, read from build-time variables
 * (VITE_EVALUATOR_USERNAME, VITE_EVALUATOR_PASSWORD). Null unless both are set, so the panel never shows half a login.
 * Anything set here is baked into the public bundle: it is a shared demo login, never a secret.
 */
export function evaluatorCredential(env: Record<string, unknown>): Credential | null {
  const username = typeof env.VITE_EVALUATOR_USERNAME === 'string' ? env.VITE_EVALUATOR_USERNAME.trim() : ''
  const password = typeof env.VITE_EVALUATOR_PASSWORD === 'string' ? env.VITE_EVALUATOR_PASSWORD : ''
  return username && password ? { username, password } : null
}

/** A fixed-length mask, so the dots do not give away the password's length. */
export const PASSWORD_MASK = '•'.repeat(12)
