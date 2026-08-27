import { createFileRoute } from "@tanstack/react-router";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ACTION_EXECUTORS } from "@/lib/ai-actions.server";

let _jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
function getJwks() {
  const url = process.env.NEON_AUTH_JWKS_URL;
  if (!url) throw new Error("Variable d'environnement manquante : NEON_AUTH_JWKS_URL.");
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(url));
  return _jwks;
}

export const Route = createFileRoute("/api/actions/commit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return new Response("Unauthorized", { status: 401 });

        let userId: string;
        try {
          const { payload } = await jwtVerify(token, getJwks());
          if (!payload.sub) throw new Error("no sub");
          userId = payload.sub;
        } catch (err) {
          if (err instanceof Error && err.message.includes("Variable d'environnement manquante")) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }
          return new Response("Unauthorized", { status: 401 });
        }

        let body: { kind?: string; payload?: Record<string, unknown> };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Corps de requête invalide" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const { kind, payload } = body;
        if (!kind || !payload) return new Response(JSON.stringify({ error: "kind et payload requis" }), { status: 400, headers: { "Content-Type": "application/json" } });

        const executor = ACTION_EXECUTORS[kind];
        if (!executor) return new Response(JSON.stringify({ error: `Action inconnue : ${kind}` }), { status: 400, headers: { "Content-Type": "application/json" } });

        try {
          const result = await executor(payload, { token, userId });
          return new Response(JSON.stringify({ result }), { status: 200, headers: { "Content-Type": "application/json" } });
        } catch (err) {
          console.error(`[commit-action] échec de l'exécution de "${kind}":`, err);
          const message = err instanceof Error ? err.message : "Erreur inconnue";
          return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
