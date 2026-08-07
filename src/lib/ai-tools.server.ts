// Outils de l'assistant IA — "Coach Volaille" (bientôt "Coach Élevage").
// Chaque outil s'exécute avec le token de l'utilisateur authentifié : la RLS
// de la base garantit qu'il ne peut jamais lire/écrire les données d'un autre éleveur.
import { tool } from "ai";
import { z } from "zod";
import { insertRows, selectRows, updateRows, deleteRows } from "@/lib/neon-data-api.server";
import { upcomingVaccines } from "@/lib/insights";
import type { Lot, MortalityRecord } from "@/lib/data";

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
      description: "Enregistre une vente (animaux vivants, œufs, etc.) liée ou non à un lot et/ou un client.",
      inputSchema: z.object({
        lot_id: z.string().uuid().nullable().optional(),
        client_id: z.string().uuid().nullable().optional().describe("Fiche client existante, si l'acheteur en a une (voir list_clients)"),
        client: z.string().optional().describe("Nom libre de l'acheteur si pas de fiche client"),
        quantity: z.number().int().positive(),
        unit_price: z.number().nonnegative(),
        record_date: z.string().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "sales", {
          user_id: userId,
          lot_id: input.lot_id ?? null,
          client_id: input.client_id ?? null,
          quantity: input.quantity,
          unit_price: input.unit_price,
          total: input.quantity * input.unit_price,
          client: input.client ?? null,
          record_date: input.record_date ?? new Date().toISOString().slice(0, 10),
        });
        return row;
      },
    }),

    create_client: tool({
      description: "Crée une fiche client (acheteur régulier). Utile avant record_sale si l'utilisateur mentionne un client qui n'existe pas encore.",
      inputSchema: z.object({
        name: z.string(),
        type: z.enum(["individual", "business", "wholesale"]).default("individual"),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "clients", {
          user_id: userId,
          name: input.name,
          type: input.type ?? "individual",
          phone: input.phone ?? null,
          address: input.address ?? null,
          notes: input.notes ?? null,
        });
        return row;
      },
    }),

    list_clients: tool({
      description: "Liste les fiches clients existantes de l'éleveur.",
      inputSchema: z.object({}),
      execute: async () => selectRows(token, "clients", "select=id,name,type,phone&order=name.asc"),
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

    create_task: tool({
      description:
        "Crée une tâche/rappel pour l'éleveur (ex: 'vacciner le lot X demain'). Utilise ceci pour toute suggestion d'action que l'utilisateur devra valider lui-même plutôt qu'une action que tu exécutes directement (ex: décisions importantes, actions physiques que seul l'humain peut faire). Marque toujours created_by='ia' pour ces suggestions.",
      inputSchema: z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        due_date: z.string().optional().describe("Format YYYY-MM-DD"),
        lot_id: z.string().uuid().nullable().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "tasks", {
          user_id: userId,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority ?? "medium",
          due_date: input.due_date ?? null,
          lot_id: input.lot_id ?? null,
          created_by: "ia",
        });
        return row;
      },
    }),

    list_tasks: tool({
      description: "Liste les tâches en cours (non terminées) de l'éleveur, triées par priorité.",
      inputSchema: z.object({}),
      execute: async () => selectRows(token, "tasks", "select=*&status=eq.pending&order=due_date.asc"),
    }),

    complete_task: tool({
      description: "Marque une tâche comme terminée.",
      inputSchema: z.object({ task_id: z.string().uuid() }),
      execute: async ({ task_id }) => {
        const [row] = await updateRows(token, "tasks", `id=eq.${task_id}`, {
          status: "completed",
          completed_at: new Date().toISOString(),
        });
        return row;
      },
    }),
    get_disease_info: tool({
      description:
        "Cherche dans l'encyclopédie des maladies par espèce et/ou symptômes observés. Utilise ceci dès que l'utilisateur décrit des symptômes inhabituels sur ses animaux, pour l'aider à identifier une piste — jamais pour poser un diagnostic certain, toujours recommander un vétérinaire pour confirmer.",
      inputSchema: z.object({
        species: z.enum(["volaille", "bovin", "ovin", "caprin", "porcin"]).optional(),
        symptom_keyword: z.string().optional().describe("Mot-clé de symptôme à rechercher, ex: 'diarrhée', 'boiterie'"),
      }),
      execute: async ({ species, symptom_keyword }) => {
        const all = await selectRows<{ name: string; species: string[]; symptoms: string[]; prevention: string | null; contagious: boolean; severity: string }>(
          token,
          "diseases",
          "select=name,species,symptoms,prevention,contagious,severity",
        );
        return all.filter(
          (d) =>
            (!species || d.species.includes(species)) &&
            (!symptom_keyword || d.symptoms.some((s) => s.toLowerCase().includes(symptom_keyword.toLowerCase()))),
        );
      },
    }),

    list_medications: tool({
      description: "Liste le stock de médicaments de l'éleveur (avec dates de péremption).",
      inputSchema: z.object({}),
      execute: async () => selectRows(token, "medications", "select=id,name,category,quantity,unit,expiry_date&order=name.asc"),
    }),

    get_alerts: tool({
      description:
        "Renvoie les alertes actives de l'élevage (stock bas, mortalité élevée sur un lot, vaccins à faire bientôt, lots qui approchent de l'âge de vente). Les mêmes alertes que voit l'éleveur dans l'app. À consulter en début de conversation ou quand l'utilisateur demande un état des lieux.",
      inputSchema: z.object({}),
      execute: async () => {
        const [stock, lots, mortality] = await Promise.all([
          selectRows<{ id: string; name: string; quantity: number; alert_threshold: number; unit: string }>(
            token,
            "stock_items",
            "select=id,name,quantity,alert_threshold,unit",
          ),
          selectRows<Lot>(token, "lots", "select=*&status=eq.active"),
          selectRows<MortalityRecord>(token, "mortality_records", "select=*"),
        ]);

        const alerts: { type: string; priority: "high" | "medium" | "low"; message: string }[] = [];

        stock.forEach((s) => {
          if (Number(s.alert_threshold) > 0 && Number(s.quantity) <= Number(s.alert_threshold)) {
            alerts.push({ type: "stock", priority: "medium", message: `Stock faible : ${s.name} (${s.quantity} ${s.unit})` });
          }
        });

        lots.forEach((l) => {
          const deaths = mortality.filter((m) => m.lot_id === l.id).reduce((s, m) => s + Number(m.count), 0);
          const rate = l.initial_count > 0 ? (deaths / l.initial_count) * 100 : 0;
          if (rate > 10) alerts.push({ type: "mortalite", priority: "high", message: `Mortalité élevée sur ${l.name} (${rate.toFixed(1)}%)` });
        });

        upcomingVaccines(lots).forEach((v) => {
          alerts.push({
            type: "vaccination",
            priority: v.dueInDays <= 0 ? "high" : "medium",
            message: `${v.lotName} : ${v.step.name} (J${v.step.day}) — ${v.dueInDays <= 0 ? "à faire maintenant" : `dans ${v.dueInDays} j`}`,
          });
        });

        return { nombre_alertes: alerts.length, alertes: alerts };
      },
    }),

    create_building: tool({
      description: "Crée un nouveau bâtiment (poulailler, étable, bergerie, porcherie...).",
      inputSchema: z.object({
        name: z.string(),
        capacity: z.number().int().nonnegative().default(0),
        species: z.enum(["volaille", "bovin", "ovin", "caprin", "porcin"]).nullable().optional().describe("Espèce prévue, ou null si polyvalent"),
        building_type: z.string().optional().describe("Ex: poulailler, étable, bergerie, porcherie"),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "buildings", {
          user_id: userId,
          name: input.name,
          capacity: input.capacity ?? 0,
          species: input.species ?? null,
          building_type: input.building_type ?? null,
        });
        return row;
      },
    }),

    create_stock_item: tool({
      description: "Crée un nouvel article de stock (aliment, vaccin, matériel...). Pour ajuster une quantité existante, utilise adjust_stock.",
      inputSchema: z.object({
        name: z.string(),
        category: z.enum(["feed", "medicine", "equipment", "other"]).default("feed"),
        quantity: z.number().nonnegative().default(0),
        unit: z.string().default("kg"),
        alert_threshold: z.number().nonnegative().default(0),
        unit_cost: z.number().nonnegative().default(0),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "stock_items", {
          user_id: userId,
          name: input.name,
          category: input.category ?? "feed",
          quantity: input.quantity ?? 0,
          unit: input.unit ?? "kg",
          alert_threshold: input.alert_threshold ?? 0,
          unit_cost: input.unit_cost ?? 0,
        });
        return row;
      },
    }),

    create_medication: tool({
      description: "Ajoute un médicament au stock (antibiotique, antiparasitaire, vitamine, vaccin...).",
      inputSchema: z.object({
        name: z.string(),
        category: z.enum(["antibiotic", "antiparasitic", "vitamin", "vaccine", "other"]).default("other"),
        quantity: z.number().nonnegative().default(0),
        unit: z.string().default("unité"),
        expiry_date: z.string().optional().describe("Format YYYY-MM-DD"),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        const [row] = await insertRows(token, "medications", {
          user_id: userId,
          name: input.name,
          category: input.category ?? "other",
          quantity: input.quantity ?? 0,
          unit: input.unit ?? "unité",
          expiry_date: input.expiry_date ?? null,
          notes: input.notes ?? null,
        });
        return row;
      },
    }),

    update_record: tool({
      description:
        "Modifie un enregistrement existant sur une table autorisée (lots, buildings, stock_items, medications, tasks, clients, sales, transactions). Donne uniquement les champs à changer. Toujours confirmer avec l'utilisateur ce qui va être modifié avant d'appeler cet outil, sauf instruction explicite et sans ambiguïté.",
      inputSchema: z.object({
        table: z.enum(["lots", "buildings", "stock_items", "medications", "tasks", "clients", "sales", "transactions", "health_records", "feed_records"]),
        id: z.string().uuid(),
        values: z.record(z.string(), z.unknown()).describe("Champs à modifier, ex: { \"status\": \"sold\" }"),
      }),
      execute: async ({ table, id, values }) => {
        const [row] = await updateRows(token, table, `id=eq.${id}`, values);
        return row;
      },
    }),

    delete_record: tool({
      description:
        "Supprime définitivement un enregistrement sur une table autorisée (lots, buildings, stock_items, medications, tasks, clients, sales, transactions, health_records, feed_records, mortality_records, weight_records). Action irréversible : confirme toujours avec l'utilisateur avant de l'appeler, sauf instruction explicite et sans ambiguïté (ex: 'supprime la tâche X').",
      inputSchema: z.object({
        table: z.enum([
          "lots", "buildings", "stock_items", "medications", "tasks", "clients", "sales",
          "transactions", "health_records", "feed_records", "mortality_records", "weight_records",
        ]),
        id: z.string().uuid(),
      }),
      execute: async ({ table, id }) => {
        await deleteRows(token, table, `id=eq.${id}`);
        return { deleted: true, table, id };
      },
    }),
  };
}
