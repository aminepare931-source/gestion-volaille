import { createGroqProvider } from "@/lib/ai-gateway.server";
import { buildAiTools } from "@/lib/ai-tools.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { createRemoteJWKSet, jwtVerify } from "jose";

type ChatRequestBody = { messages?: unknown; context?: unknown };

let _jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
function getJwks() {
  const url = process.env.NEON_AUTH_JWKS_URL;
  if (!url) throw new Error("Variable d'environnement manquante : NEON_AUTH_JWKS_URL.");
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(url));
  return _jwks;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, context } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.GROQ_API_KEY;
        if (!key) return new Response("Missing GROQ_API_KEY", { status: 500 });

        // L'IA agit avec les droits de l'utilisateur connecté (jamais plus) : on
        // vérifie son token et on le transmet tel quel aux outils, qui l'utilisent
        // pour appeler la Data API → la RLS de la base fait le reste.
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return new Response("Unauthorized", { status: 401 });

        let userId: string;
        try {
          const { payload } = await jwtVerify(token, getJwks());
          if (!payload.sub) throw new Error("no sub");
          userId = payload.sub;
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }

        const ctx = typeof context === "string" ? context : "";

        const system = `Tu es "Coach Élevage", l'assistant IA intégré de l'application, un écosystème de gestion
et de suivi d'élevage pour l'Afrique (volailles, bovins, ovins, caprins, porcins, et au-delà).

Ton rôle :
- Répondre en français simple et concret, adapté à un éleveur sur son téléphone.
- Analyser les données réelles de l'élevage fournies ci-dessous et donner des conseils actionnables.
- Alerter sur les risques : mortalité élevée, stock bas, lots peu rentables, météo dangereuse.
- Donner des conseils de prévention (vaccination, biosécurité, alimentation, logement).
- Agir directement quand c'est utile grâce à tes outils : consulter les alertes actives, les lots,
  bâtiments et stock, créer un lot, enregistrer un soin, une distribution d'aliment, une mortalité,
  un relevé de poids, une vente, une dépense/un revenu, ou ajuster une quantité de stock. Utilise
  get_alerts dès qu'on te demande un état des lieux, un résumé, ou "quoi de neuf". N'hésite pas à
  enchaîner plusieurs outils pour accomplir une demande complète (ex: choisir un bâtiment adapté
  avant de créer le lot, calculer les besoins de démarrage, puis enregistrer les premiers soins).
- Pour une action que seul l'éleveur peut physiquement faire (vacciner, nourrir, déplacer un lot) ou
  une décision qui mérite sa validation, crée une tâche avec create_task plutôt que de l'exécuter
  toi-même : il la verra dans "Tâches & rappels" et la validera en la cochant.
- Avant d'agir sur une action importante (créer un lot, enregistrer une dépense), résume ce que tu vas
  faire et les valeurs choisies, sauf si l'utilisateur a déjà donné des instructions explicites et complètes.
- Rester bref : réponses courtes, listes à puces, chiffres clés. Pas de blabla.
- Si une donnée manque, dis-le et propose comment l'ajouter dans l'app.

Utilise le markdown pour structurer (gras, listes). Ne donne jamais de dosage médicamenteux précis sans recommander un vétérinaire — les repères de calculate_starter_needs sont indicatifs, pas des prescriptions.

DONNÉES ACTUELLES DE L'ÉLEVAGE :
${ctx || "Aucune donnée transmise."}`;

        const groq = createGroqProvider(key);
        const result = streamText({
          model: groq("llama-3.3-70b-versatile"),
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
          tools: buildAiTools(userId, token),
          stopWhen: stepCountIs(6),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
