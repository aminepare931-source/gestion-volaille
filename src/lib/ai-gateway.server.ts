import { createGroq } from "@ai-sdk/groq";
import { APICallError, generateText } from "ai";

export function createGroqProvider(apiKey: string) {
  // Le package officiel @ai-sdk/groq gère correctement le champ "reasoning" que
  // renvoient les modèles GPT-OSS de Groq (contrairement au wrapper générique
  // @ai-sdk/openai-compatible, qui le renvoie tel quel dans l'historique et fait
  // planter Groq avec "property 'reasoning_content' is unsupported" dès le
  // deuxième échange ou après un appel d'outil).
  return createGroq({ apiKey });
}

// Chaîne de secours : chaque modèle a son PROPRE quota gratuit chez Groq
// (30 req/min, 1000 req/jour, séparément par modèle). Si le premier est
// limité, on bascule automatiquement sur le suivant plutôt que de faire
// attendre l'éleveur.
const MODEL_FALLBACK_CHAIN = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"] as const;

/** Teste rapidement (1 token, quasi instantané vu la vitesse de Groq) quel modèle
 * de la chaîne est actuellement disponible, et renvoie son identifiant. Ne bascule
 * que sur un vrai dépassement de quota (429) — toute autre erreur (clé invalide,
 * etc.) remonte immédiatement, pas la peine de tester les modèles suivants. */
export async function pickAvailableGroqModel(groq: ReturnType<typeof createGroqProvider>): Promise<string> {
  let lastError: unknown;
  for (const modelId of MODEL_FALLBACK_CHAIN) {
    try {
      await generateText({ model: groq(modelId), prompt: "ok", maxOutputTokens: 1 });
      return modelId;
    } catch (err) {
      lastError = err;
      if (err instanceof APICallError && err.statusCode === 429) {
        console.warn(`[groq] ${modelId} limité (429), bascule sur le suivant.`);
        continue;
      }
      throw err;
    }
  }
  console.error("[groq] tous les modèles de la chaîne de secours sont limités.", lastError);
  throw new Error("Tous les modèles Groq disponibles ont atteint leur quota gratuit pour l'instant. Réessaie dans quelques minutes.");
}
