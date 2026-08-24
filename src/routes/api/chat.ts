import { createGroqProvider, pickAvailableGroqModel } from "@/lib/ai-gateway.server";
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
        } catch (err) {
          // Ne pas confondre "config serveur cassée" (variable d'env manquante) avec
          // "token invalide" : le premier cas doit être visible et explicite, pas se
          // déguiser en 401 générique qui fait perdre du temps à diagnostiquer.
          if (err instanceof Error && err.message.includes("Variable d'environnement manquante")) {
            console.error("[chat] config error:", err.message);
            return new Response(`Erreur de configuration serveur : ${err.message}`, { status: 500 });
          }
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
  bâtiments, stock, clients et médicaments, créer un lot, un bâtiment, un article de stock, un
  médicament, une fiche client, enregistrer un soin, une distribution d'aliment, une mortalité, un
  relevé de poids, une vente, une dépense/un revenu, ou ajuster une quantité de stock. Utilise
  get_alerts dès qu'on te demande un état des lieux, un résumé, ou "quoi de neuf". N'hésite pas à
  enchaîner plusieurs outils pour accomplir une demande complète (ex: choisir un bâtiment adapté
  avant de créer le lot, calculer les besoins de démarrage, puis enregistrer les premiers soins).
- update_record et delete_record te permettent de corriger ou supprimer un enregistrement existant.
  update_record est sans risque (réversible), utilise-le librement dès que la demande est claire.
  delete_record est IRRÉVERSIBLE : demande toujours confirmation avant de l'utiliser, sauf si
  l'utilisateur a été explicite et sans ambiguïté (ex: "supprime la tâche X").
- Pour une action que seul l'éleveur peut physiquement faire (vacciner, nourrir, déplacer un lot) ou
  une décision qui mérite sa validation, crée une tâche avec create_task plutôt que de l'exécuter
  toi-même : il la verra dans "Tâches & rappels" et la validera en la cochant.
- Si l'utilisateur décrit des symptômes inhabituels, utilise get_disease_info pour l'aider à identifier
  une piste plausible — présente ça comme une piste à vérifier, jamais un diagnostic certain, et
  recommande toujours un vétérinaire pour confirmer et prescrire un traitement.
- Quand un soin utilise un médicament du stock, passe medication_id et quantity_used à
  create_health_record plutôt que d'appeler adjust_stock séparément : le stock est décompté
  automatiquement et ça garde l'historique du soin lié au médicament utilisé.
- Avant d'agir sur une action importante (créer un lot, enregistrer une dépense), résume ce que tu vas
  faire et les valeurs choisies, sauf si l'utilisateur a déjà donné des instructions explicites et complètes.
- Rester bref : réponses courtes, listes à puces, chiffres clés. Pas de blabla.
- Si une donnée manque, dis-le et propose comment l'ajouter dans l'app.

Utilise le markdown pour structurer (gras, listes). Ne donne jamais de dosage médicamenteux précis sans recommander un vétérinaire — les repères de calculate_starter_needs sont indicatifs, pas des prescriptions.

DONNÉES ACTUELLES DE L'ÉLEVAGE :
${ctx || "Aucune donnée transmise."}`;

        const groq = createGroqProvider(key);
        try {
          const modelId = await pickAvailableGroqModel(groq);
          const result = streamText({
            model: groq(modelId),
            system,
            messages: await convertToModelMessages(messages as UIMessage[]),
            tools: buildAiTools(userId, token),
            stopWhen: stepCountIs(10),
            onError: ({ error }) => {
              console.error(`[chat] streamText error (modèle ${modelId}):`, error);
            },
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            onError: (error) => {
              console.error("[chat] stream response error:", error);
              return error instanceof Error ? `Erreur : ${error.message}` : "Une erreur est survenue côté serveur.";
            },
          });
        } catch (err) {
          console.error("[chat] fatal error before streaming:", err);
          const message = err instanceof Error ? err.message : "Erreur inconnue";
          return new Response(`Erreur serveur : ${message}`, { status: 500 });
        }
      },
    },
  },
});
