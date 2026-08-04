import { createGroqProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type ChatRequestBody = { messages?: unknown; context?: unknown };

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

        const ctx = typeof context === "string" ? context : "";

        const system = `Tu es "Coach Volaille", l'assistant IA intégré de l'application "Ma Volaille",
un logiciel de gestion d'élevage de volailles pour les éleveurs d'Afrique (petits et moyens élevages).

Ton rôle :
- Répondre en français simple et concret, adapté à un éleveur sur son téléphone.
- Analyser les données réelles de l'élevage fournies ci-dessous et donner des conseils actionnables.
- Alerter sur les risques : mortalité élevée, stock d'aliment bas, lots peu rentables, météo dangereuse (forte pluie, vent, chaleur).
- Donner des conseils de prévention (vaccination, biosécurité, alimentation, température du poulailler).
- Rester bref : réponses courtes, listes à puces, chiffres clés. Pas de blabla.
- Si une donnée manque, dis-le et propose comment l'ajouter dans l'app.

Utilise le markdown pour structurer (gras, listes). Ne donne jamais de dosage médicamenteux précis sans recommander un vétérinaire.

DONNÉES ACTUELLES DE L'ÉLEVAGE :
${ctx || "Aucune donnée transmise."}`;

        const groq = createGroqProvider(key);
        const result = streamText({
          model: groq("llama-3.3-70b-versatile"),
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
