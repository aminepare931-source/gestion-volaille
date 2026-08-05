import { createMiddleware } from '@tanstack/react-start'
import { neon } from './client'

// Doit être enregistré comme `functionMiddleware` global dans `src/start.ts` ;
// sinon le navigateur n'attache jamais le bearer token aux appels serveur (serverFn RPC).
export const attachNeonAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const { data } = await neon.auth.getSession()
    const token = data.session?.access_token
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
