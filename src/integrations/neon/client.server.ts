// Client Neon serveur — remplace src/integrations/supabase/client.server.ts.
// Se connecte directement à Postgres via DATABASE_URL (rôle propriétaire de la base,
// qui contourne la RLS par défaut). À réserver aux opérations admin côté serveur.
// SÉCURITÉ : ne jamais exposer ce module au bundle client.
// Import à faire à l'intérieur des handlers serveur uniquement :
//   const { neonAdmin } = await import("@/integrations/neon/client.server");
import { neon as neonSql } from '@neondatabase/serverless';

function createNeonAdminClient() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    const message = "Variable d'environnement manquante : DATABASE_URL.";
    console.error(`[Neon] ${message}`);
    throw new Error(message);
  }

  // Tag template SQL — ex: await neonAdmin`select * from public.farms where id = ${id}`
  return neonSql(DATABASE_URL);
}

let _neonAdmin: ReturnType<typeof createNeonAdminClient> | undefined;

export const neonAdmin = new Proxy((() => {}) as unknown as ReturnType<typeof createNeonAdminClient>, {
  apply(_target, _thisArg, args) {
    if (!_neonAdmin) _neonAdmin = createNeonAdminClient();
    // @ts-expect-error - proxying the tagged-template callable
    return _neonAdmin(...args);
  },
  get(_, prop, receiver) {
    if (!_neonAdmin) _neonAdmin = createNeonAdminClient();
    return Reflect.get(_neonAdmin, prop, receiver);
  },
});
