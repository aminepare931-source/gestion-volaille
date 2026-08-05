// Outils de l'assistant IA — "Coach Volaille" (bientôt "Coach Élevage").
// Chaque outil s'exécute avec le token de l'utilisateur authentifié : la RLS
// de la base garantit qu'il ne peut jamais lire/écrire les données d'un autre éleveur.
import { tool } from "ai";
import { z } from "zod";
import { insertRows, selectRows, updateRows } from "@/lib/neon-data-api.server";

// Repères zootechniques indicatifs (démarrage/premiers jours), par grande famille
// d'espèce. Volontairement approximatifs : servent de point de départ pour l'IA,
// jamais un dosage médicamenteux précis (ça, on renvoie systématiquement au vétérinaire).
const STARTER_REFERENCE: Record<
  string,
  { feedGPerDay: number; waterMlPerDay: number; tempC: string; firstCare: string[] }
> = {
  volaille: {
    feedGPerDay: 12,
    waterMlPerDay: 25,
    tempC: "32-34°C la 1ère semaine, -2 à 3°C chaque semaine suivante",
    firstCare: [
      "Eau sucrée/vitaminée les premières 24h pour limiter le stress du transport",
      "Vaccination Newcastle/Gumboro selon le protocole local (voir vétérinaire)",
      "Litière sèche et propre, éviter les courants d'air",
    ],
  },
  bovin: {
    feedGPerDay: 0, // veaux : allaitement dominant, pas de ration sèche standard en g
    waterMlPerDay: 4000,
    tempC: "Abri sec, éviter l'humidité et les courants d'air directs",
    firstCare: [
      "Colostrum dans les 6h suivant la naissance (essentiel pour l'immunité)",
      "Désinfection du nombril",
      "Suivi du poids à la naissance et de la prise de poids hebdomadaire",
    ],
  },
  ovin: {
    feedGPerDay: 150,
    waterMlPerDay: 1500,
    tempC: "Abri sec, à l'écart du vent",
    firstCare: ["Colostrum dans les 2h", "Désinfection du nombril", "Tonte/parasitisme à surveiller"],
  },
  caprin: {
    feedGPerDay: 150,
    waterMlPerDay: 1500,
    tempC: "Abri sec, à l'écart du vent",
    firstCare: ["Colostrum dans les 2h", "Désinfection du nombril"],
  },
  porcin: {
    feedGPerDay: 250,
    waterMlPerDay: 1000,
    tempC: "30-32°C la 1ère semaine (porcelet), éviter l'humidité",
    firstCare: ["Fer injectable (anti-anémie) vers J3", "Colostrum dans les 6h"],
  },
};

export function buildAiTools(userId: string, token: string) {
  return {
    list_buildings: tool({
      description:
        "Liste les bâtiments de l'éleveur (nom, capacité, espèce/type prévus) avec une estimation de l'occupation actuelle. À appeler avant de choisir où placer un nouveau lot.",
      inputSchema: z.object({}),
      execute: async () => {
        const buildings = await selectRows(token, "buildings", "select=id,name,capacity,species,building_type&order=name.asc");
        const lots = await selectRows<{ building_id: string | null; initial_count: number; status: string }>(
          token,
          "lots",
          "select=building_id,initial_count,status&status=eq.active",
        );
        return buildings.map((b: any) => ({
          ...b,
          occupation_estimee: lots.filter((l) => l.building_id === b.id).reduce((s, l) => s + Number(l.initial_count), 0),
        }));
      },
    }),

    list_stock: tool({
      description: "Liste les articles en stock (aliment, vaccins, matériel...) avec quantités et seuils d'alerte.",
      inputSchema: z.object({}),
      execute: async () => selectRows(token, "stock_items", "select=id,category,name,quantity,unit,alert_threshold&order=name.asc"),
    }),

    calculate_starter_needs: tool({
      description:
        "Calcule les besoins de démarrage (aliment/jour, eau/jour, température, premiers soins) pour un nouveau lot, selon l'espèce et l'effectif. Purement indicatif — jamais de dosage médicamenteux précis.",
      inputSchema: z.object({
        species: z.enum(["volaille", "bovin", "ovin", "caprin", "porcin"]).describe("Grande famille d'espèce"),
        count: z.number().int().positive().describe("Nombre de têtes/têtes dans le lot"),
      }),
      execute: async ({ species, count }) => {
        const ref = STARTER_REFERENCE[species] ?? STARTER_REFERENCE.volaille;
        return {
          espece: species,
          effectif: count,
          aliment_total_par_jour: ref.feedGPerDay ? `${((ref.feedGPerDay * count) / 1000).toFixed(1)} kg/jour` : "allaitement (pas de ration sèche standard)",
          eau_totale_par_jour: `${((ref.waterMlPerDay * count) / 1000).toFixed(1)} L/jour`,
          temperature_recommandee: ref.tempC,
          premiers_soins: ref.firstCare,
          avertissement: "Repères indicatifs. Pour tout traitement/vaccin, consulter un vétérinaire pour le dosage exact.",
        };
      },
    }),

    create_lot: tool({
      description:
        "Crée un nouveau lot d'animaux pour l'éleveur. Utilise list_buildings avant pour choisir un building_id cohérent (capacité suffisante, espèce compatible) si l'utilisateur n'en a pas précisé un.",
      inputSchema: z.object({
        name: z.string().describe("Nom du lot, ex: 'Lot Poussins Janvier'"),
        species: z.enum(["volaille", "bovin", "ovin", "caprin", "porcin"]),
        breed: z.string().optional().describe("Race, ex: 'Cobb 500'"),
        initial_count: z.number().int().positive(),
        purchase_cost: z.number().nonnegative().default(0),
        arrival_date: z.string().optional().describe("Format YYYY-MM-DD, défaut = aujourd'hui"),
        building_id: z.string().uuid().nullable().optional().describe("Bâtiment choisi, ou null si aucun bâtiment adapté trouvé"),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "lots", {
          user_id: userId,
          name: input.name,
          species: input.species,
          breed: input.breed ?? null,
          initial_count: input.initial_count,
          purchase_cost: input.purchase_cost ?? 0,
          arrival_date: input.arrival_date ?? new Date().toISOString().slice(0, 10),
          building_id: input.building_id ?? null,
          status: "active",
        });
        return row;
      },
    }),

    create_feed_record: tool({
      description: "Enregistre une distribution d'aliment pour un lot (ex: la ration de démarrage du jour).",
      inputSchema: z.object({
        lot_id: z.string().uuid(),
        feed_type: z.string(),
        quantity_kg: z.number().nonnegative(),
        cost: z.number().nonnegative().default(0),
        record_date: z.string().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "feed_records", {
          user_id: userId,
          lot_id: input.lot_id,
          feed_type: input.feed_type,
          quantity_kg: input.quantity_kg,
          cost: input.cost ?? 0,
          record_date: input.record_date ?? new Date().toISOString().slice(0, 10),
        });
        return row;
      },
    }),

    create_health_record: tool({
      description: "Enregistre un soin/vaccin pour un lot (ex: les premiers soins à l'arrivée).",
      inputSchema: z.object({
        lot_id: z.string().uuid(),
        type: z.enum(["vaccine", "treatment", "checkup"]).default("vaccine"),
        name: z.string(),
        cost: z.number().nonnegative().default(0),
        notes: z.string().optional(),
        record_date: z.string().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "health_records", {
          user_id: userId,
          lot_id: input.lot_id,
          type: input.type,
          name: input.name,
          cost: input.cost ?? 0,
          notes: input.notes ?? null,
          record_date: input.record_date ?? new Date().toISOString().slice(0, 10),
        });
        return row;
      },
    }),

    record_mortality: tool({
      description: "Enregistre des morts sur un lot (mortalité). Utile pour que le tableau de bord et les taux de mortalité restent à jour.",
      inputSchema: z.object({
        lot_id: z.string().uuid(),
        count: z.number().int().positive(),
        cause: z.string().optional(),
        record_date: z.string().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "mortality_records", {
          user_id: userId,
          lot_id: input.lot_id,
          count: input.count,
          cause: input.cause ?? null,
          record_date: input.record_date ?? new Date().toISOString().slice(0, 10),
        });
        return row;
      },
    }),

    record_weight: tool({
      description: "Enregistre un relevé de poids moyen pour un lot (suivi de croissance).",
      inputSchema: z.object({
        lot_id: z.string().uuid(),
        avg_weight: z.number().positive().describe("Poids moyen en kg"),
        record_date: z.string().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "weight_records", {
          user_id: userId,
          lot_id: input.lot_id,
          avg_weight: input.avg_weight,
          record_date: input.record_date ?? new Date().toISOString().slice(0, 10),
        });
        return row;
      },
    }),

    record_sale: tool({
      description: "Enregistre une vente (animaux vivants, œufs, etc.) liée ou non à un lot.",
      inputSchema: z.object({
        lot_id: z.string().uuid().nullable().optional(),
        quantity: z.number().int().positive(),
        unit_price: z.number().nonnegative(),
        client: z.string().optional(),
        record_date: z.string().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "sales", {
          user_id: userId,
          lot_id: input.lot_id ?? null,
          quantity: input.quantity,
          unit_price: input.unit_price,
          total: input.quantity * input.unit_price,
          client: input.client ?? null,
          record_date: input.record_date ?? new Date().toISOString().slice(0, 10),
        });
        return row;
      },
    }),

    record_transaction: tool({
      description: "Enregistre une dépense ou un revenu hors vente (achat de matériel, transport, salaire, subvention...).",
      inputSchema: z.object({
        type: z.enum(["expense", "income"]),
        category: z.string().describe("Ex: 'aliment', 'santé', 'transport', 'matériel', 'salaire'"),
        amount: z.number().positive(),
        description: z.string().optional(),
        lot_id: z.string().uuid().nullable().optional(),
        record_date: z.string().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "transactions", {
          user_id: userId,
          type: input.type,
          category: input.category,
          amount: input.amount,
          description: input.description ?? null,
          lot_id: input.lot_id ?? null,
          record_date: input.record_date ?? new Date().toISOString().slice(0, 10),
        });
        return row;
      },
    }),

    adjust_stock: tool({
      description:
        "Ajuste la quantité d'un article de stock existant (ex: après une distribution d'aliment, ou une nouvelle livraison). delta positif = ajoute, négatif = retire. Prévient si ça passe sous le seuil d'alerte.",
      inputSchema: z.object({
        stock_item_id: z.string().uuid(),
        delta: z.number().describe("Quantité à ajouter (positif) ou retirer (négatif)"),
      }),
      execute: async ({ stock_item_id, delta }) => {
        const [item] = await selectRows<{ id: string; quantity: number; alert_threshold: number; unit: string; name: string }>(
          token,
          "stock_items",
          `select=id,quantity,alert_threshold,unit,name&id=eq.${stock_item_id}`,
        );
        if (!item) throw new Error("Article de stock introuvable.");
        const newQuantity = Math.max(0, Number(item.quantity) + delta);
        const [row] = await updateRows(token, "stock_items", `id=eq.${stock_item_id}`, { quantity: newQuantity });
        return {
          ...row,
          alerte_stock_bas: newQuantity <= Number(item.alert_threshold) && Number(item.alert_threshold) > 0,
        };
      },
    }),

    list_lots: tool({
      description: "Liste les lots de l'éleveur avec leurs infos essentielles (espèce, effectif initial, statut, bâtiment).",
      inputSchema: z.object({
        status: z.enum(["active", "sold", "all"]).default("active"),
      }),
      execute: async ({ status }) => {
        const query = status === "all" ? "select=*&order=created_at.desc" : `select=*&status=eq.${status}&order=created_at.desc`;
        return selectRows(token, "lots", query);
      },
    }),
  };
}
