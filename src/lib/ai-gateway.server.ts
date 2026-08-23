import { createGroq } from "@ai-sdk/groq";

export function createGroqProvider(apiKey: string) {
  // Le package officiel @ai-sdk/groq gère correctement le champ "reasoning" que
  // renvoient les modèles GPT-OSS de Groq (contrairement au wrapper générique
  // @ai-sdk/openai-compatible, qui le renvoie tel quel dans l'historique et fait
  // planter Groq avec "property 'reasoning_content' is unsupported" dès le
  // deuxième échange ou après un appel d'outil).
  return createGroq({ apiKey });
}
