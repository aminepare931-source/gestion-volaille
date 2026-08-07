// Helper serveur : appelle la Data API Neon (compatible PostgREST) avec le
// bearer token de l'utilisateur authentifié, pour que la RLS s'applique
// correctement (l'IA ne peut lire/écrire que les données de CET éleveur).
// Utilisé par les outils de l'assistant IA (src/lib/ai-tools.server.ts).

function dataApiUrl() {
  const url = process.env.NEON_DATA_API_URL;
  if (!url) throw new Error("Variable d'environnement manquante : NEON_DATA_API_URL.");
  return url.replace(/\/$/, "");
}

async function request(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${dataApiUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Neon Data API ${method} ${path} → ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** SELECT — ex: selectRows(token, "lots", "select=*&status=eq.active&order=created_at.desc") */
export function selectRows<T = any>(token: string, table: string, query = "select=*"): Promise<T[]> {
  return request(token, "GET", `/${table}?${query}`);
}

/** INSERT — retourne la/les ligne(s) créée(s) */
export function insertRows<T = any>(token: string, table: string, values: Record<string, unknown> | Record<string, unknown>[]): Promise<T[]> {
  return request(token, "POST", `/${table}`, values);
}

/** UPDATE — ex: updateRows(token, "lots", "id=eq.<uuid>", { status: "sold" }) */
export function updateRows<T = any>(token: string, table: string, query: string, values: Record<string, unknown>): Promise<T[]> {
  return request(token, "PATCH", `/${table}?${query}`, values);
}

/** DELETE — ex: deleteRows(token, "tasks", "id=eq.<uuid>") */
export function deleteRows(token: string, table: string, query: string): Promise<null> {
  return request(token, "DELETE", `/${table}?${query}`);
}
