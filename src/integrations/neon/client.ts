// Client Neon (Data API + Neon Auth) — remplace src/integrations/supabase/client.ts.
// On utilise le SupabaseAuthAdapter fourni par @neondatabase/neon-js, qui expose
// une API quasi identique à supabase-js (signInWithPassword, signUp, signInWithOAuth,
// getSession, onAuthStateChange, signOut, getUser, getClaims...).
import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';
import type { Database } from './types';

function createNeonClient() {
  // import.meta.env pour le build client (Vite), process.env pour le SSR.
  const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL;
  const DATA_API_URL = import.meta.env.VITE_NEON_DATA_API_URL || process.env.NEON_DATA_API_URL;

  if (!AUTH_URL || !DATA_API_URL) {
    const missing = [
      ...(!AUTH_URL ? ['VITE_NEON_AUTH_URL'] : []),
      ...(!DATA_API_URL ? ['VITE_NEON_DATA_API_URL'] : []),
    ];
    const message = `Variable(s) d'environnement Neon manquante(s) : ${missing.join(', ')}.`;
    console.error(`[Neon] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>({
    auth: {
      adapter: SupabaseAuthAdapter(),
      url: AUTH_URL,
    },
    dataApi: {
      url: DATA_API_URL,
    },
  });
}

let _neon: ReturnType<typeof createNeonClient> | undefined;

// Import comme ceci :
// import { neon } from "@/integrations/neon/client";
export const neon = new Proxy({} as ReturnType<typeof createNeonClient>, {
  get(_, prop, receiver) {
    if (!_neon) _neon = createNeonClient();
    return Reflect.get(_neon, prop, receiver);
  },
});
