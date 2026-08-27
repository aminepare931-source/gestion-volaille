// Outils de l'assistant IA — "Coach Volaille" (bientôt "Coach Élevage").
// Chaque outil s'exécute avec le token de l'utilisateur authentifié : la RLS
// de la base garantit qu'il ne peut jamais lire/écrire les données d'un autre éleveur.
import { tool } from "ai";
import { z } from "zod";
import { selectRows, selectRowsSafe } from "@/lib/neon-data-api.server";
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

export interface PendingAction {
  __pending_action: true;
  actionId: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
}

/** Ne fait AUCUNE écriture — construit juste une proposition, avec un id
 * pré-généré (utilisable comme référence par une proposition suivante dans
 * le même tour, ex: le lot_id d'un create_feed_record qui suit un create_lot
 * pas encore approuvé). L'écriture réelle se fait uniquement via
 * /api/actions/commit, après clic sur "Approuver" côté éleveur. */
function proposeAction(kind: string, summary: string, payload: Record<string, unknown>): PendingAction {
  const actionId = crypto.randomUUID();
  return { __pending_action: true, actionId, kind, summary, payload: { ...payload, id: actionId } };
}

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
        "Crée un nouveau lot d'animaux pour l'éleveur. Utilise list_buildings avant pour choisir un building_id cohérent (capacité suffisante, espèce compatible) si l'utilisateur n'en a pas précisé un. N'écrit rien : propose la création, qui devra être approuvée. Le résultat contient un actionId : réutilise-le comme lot_id si tu enchaînes d'autres propositions liées à ce lot (aliment, soins...) dans la même réponse.",
      inputSchema: z.object({
        name: z.string().describe("Nom du lot, ex: 'Lot Poussins Janvier'"),
        species: z.enum(["volaille", "bovin", "ovin", "caprin", "porcin"]),
        breed: z.string().optional().describe("Race, ex: 'Cobb 500'"),
        initial_count: z.number().int().positive(),
        purchase_cost: z.number().nonnegative().default(0),
        arrival_date: z.string().optional().describe("Format YYYY-MM-DD, défaut = aujourd'hui"),
        building_id: z.string().uuid().nullable().optional().describe("Bâtiment choisi, ou null si aucun bâtiment adapté trouvé"),
      }),
      execute: async (input) =>
        proposeAction("create_lot", `Créer le lot "${input.name}" (${input.initial_count} ${input.species}${input.breed ? `, ${input.breed}` : ""})`, input),
    }),

    create_feed_record: tool({
      description:
        "Enregistre une distribution d'aliment pour un lot. Si stock_item_id est fourni (voir list_stock), la quantité est automatiquement décomptée du stock — pas besoin d'appeler adjust_stock en plus.",
      inputSchema: z.object({
        lot_id: z.string().uuid(),
        feed_type: z.string(),
        quantity_kg: z.number().nonnegative(),
        cost: z.number().nonnegative().default(0),
        record_date: z.string().optional(),
        stock_item_id: z.string().uuid().nullable().optional().describe("Article de stock d'aliment correspondant, si applicable (voir list_stock)"),
      }),
      execute: async (input) =>
        proposeAction("create_feed_record", `Distribution de ${input.quantity_kg} kg de "${input.feed_type}"`, input),
    }),

    create_health_record: tool({
      description:
        "Enregistre un soin/vaccin pour un lot. Si un médicament du stock est utilisé (medication_id + quantity_used), le stock est automatiquement décompté — pas besoin d'appeler adjust_stock ou update_record en plus. Si une maladie de l'encyclopédie a été identifiée (voir get_disease_info), relie-la via disease_id.",
      inputSchema: z.object({
        lot_id: z.string().uuid(),
        type: z.enum(["vaccine", "treatment", "checkup"]).default("vaccine"),
        name: z.string(),
        cost: z.number().nonnegative().default(0),
        notes: z.string().optional(),
        record_date: z.string().optional(),
        medication_id: z.string().uuid().nullable().optional().describe("Médicament du stock utilisé, si applicable (voir list_medications)"),
        quantity_used: z.number().nonnegative().nullable().optional().describe("Quantité du médicament utilisée, décomptée automatiquement du stock"),
        disease_id: z.string().uuid().nullable().optional().describe("Maladie identifiée, si applicable (voir get_disease_info)"),
      }),
      execute: async (input) => proposeAction("create_health_record", `Soin "${input.name}" (${input.type})`, input),
    }),

    record_mortality: tool({
      description: "Enregistre des morts sur un lot (mortalité). Utile pour que le tableau de bord et les taux de mortalité restent à jour.",
      inputSchema: z.object({
        lot_id: z.string().uuid(),
        count: z.number().int().positive(),
        cause: z.string().optional(),
        record_date: z.string().optional(),
      }),
      execute: async (input) => proposeAction("record_mortality", `${input.count} mort(s)${input.cause ? ` (${input.cause})` : ""}`, input),
    }),

    record_weight: tool({
      description: "Enregistre un relevé de poids moyen pour un lot (suivi de croissance).",
      inputSchema: z.object({
        lot_id: z.string().uuid(),
        avg_weight: z.number().positive().describe("Poids moyen en kg"),
        record_date: z.string().optional(),
      }),
      execute: async (input) => proposeAction("record_weight", `Poids moyen : ${input.avg_weight} kg`, input),
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
      execute: async (input) =>
        proposeAction("record_sale", `Vente de ${input.quantity} unité(s) à ${input.unit_price}/unité`, input),
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
      execute: async (input) => proposeAction("create_client", `Créer le client "${input.name}"`, input),
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
        supplier_id: z.string().uuid().nullable().optional().describe("Fournisseur concerné, si applicable (voir list_suppliers)"),
        record_date: z.string().optional(),
      }),
      execute: async (input) =>
        proposeAction("record_transaction", `${input.type === "expense" ? "Dépense" : "Revenu"} : ${input.category} — ${input.amount}`, input),
    }),

    create_supplier: tool({
      description: "Crée une fiche fournisseur (aliment, médicaments, équipement...).",
      inputSchema: z.object({
        name: z.string(),
        type: z.enum(["feed", "medication", "equipment", "general"]).default("general"),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (input) => proposeAction("create_supplier", `Créer le fournisseur "${input.name}"`, input),
    }),

    list_suppliers: tool({
      description: "Liste les fournisseurs de l'éleveur.",
      inputSchema: z.object({}),
      execute: async () => selectRows(token, "suppliers", "select=id,name,type,phone&is_active=eq.true&order=name.asc"),
    }),

    adjust_stock: tool({
      description:
        "Ajuste la quantité d'un article de stock existant (ex: après une distribution d'aliment, ou une nouvelle livraison). delta positif = ajoute, négatif = retire. Prévient si ça passe sous le seuil d'alerte.",
      inputSchema: z.object({
        stock_item_id: z.string().uuid(),
        delta: z.number().describe("Quantité à ajouter (positif) ou retirer (négatif)"),
      }),
      execute: async ({ stock_item_id, delta }) =>
        proposeAction("adjust_stock", `${delta >= 0 ? "Ajouter" : "Retirer"} ${Math.abs(delta)} au stock`, { stock_item_id, delta }),
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
      execute: async (input) => proposeAction("create_task", `Tâche : "${input.title}"`, input),
    }),

    list_tasks: tool({
      description: "Liste les tâches en cours (non terminées) de l'éleveur, triées par priorité.",
      inputSchema: z.object({}),
      execute: async () => selectRows(token, "tasks", "select=*&status=eq.pending&order=due_date.asc"),
    }),

    complete_task: tool({
      description: "Marque une tâche comme terminée.",
      inputSchema: z.object({ task_id: z.string().uuid() }),
      execute: async ({ task_id }) => proposeAction("complete_task", "Marquer la tâche comme terminée", { task_id }),
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
        "Renvoie les alertes actives de l'élevage, tous modules confondus : stock bas, mortalité élevée, vaccins à faire, équipements en panne/à réviser, médicaments périmés ou proches de la péremption, tâches en retard. Les mêmes alertes que voit l'éleveur dans l'app. À consulter en début de conversation ou quand l'utilisateur demande un état des lieux.",
      inputSchema: z.object({}),
      execute: async () => {
        const [stock, lots, mortality, equipment, medications, tasks, suppliers] = await Promise.all([
          selectRows<{ id: string; name: string; quantity: number; alert_threshold: number; unit: string; supplier_id: string | null }>(
            token,
            "stock_items",
            "select=id,name,quantity,alert_threshold,unit,supplier_id",
          ),
          selectRows<Lot>(token, "lots", "select=*&status=eq.active"),
          selectRows<MortalityRecord>(token, "mortality_records", "select=*"),
          selectRowsSafe<{ id: string; name: string; status: string }>(token, "equipment", "select=id,name,status"),
          selectRowsSafe<{ id: string; name: string; quantity: number; expiry_date: string | null }>(
            token,
            "medications",
            "select=id,name,quantity,expiry_date",
          ),
          selectRowsSafe<{ id: string; title: string; due_date: string | null; priority: string }>(
            token,
            "tasks",
            "select=id,title,due_date,priority&status=eq.pending",
          ),
          selectRowsSafe<{ id: string; name: string; phone: string | null }>(token, "suppliers", "select=id,name,phone"),
        ]);

        const alerts: { type: string; priority: "high" | "medium" | "low"; message: string }[] = [];

        stock.forEach((s) => {
          if (Number(s.alert_threshold) > 0 && Number(s.quantity) <= Number(s.alert_threshold)) {
            const supplier = suppliers.find((sup) => sup.id === s.supplier_id);
            const supplierHint = supplier ? ` — fournisseur habituel : ${supplier.name}${supplier.phone ? ` (${supplier.phone})` : ""}` : "";
            alerts.push({ type: "stock", priority: "medium", message: `Stock faible : ${s.name} (${s.quantity} ${s.unit})${supplierHint}` });
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

        equipment.forEach((e) => {
          if (e.status === "broken") alerts.push({ type: "equipement", priority: "high", message: `${e.name} est en panne` });
          else if (e.status === "maintenance") alerts.push({ type: "equipement", priority: "medium", message: `${e.name} nécessite une maintenance` });
        });

        const now = Date.now();
        medications.forEach((m) => {
          if (Number(m.quantity) <= 0) return;
          if (!m.expiry_date) return;
          const daysLeft = Math.floor((new Date(m.expiry_date).getTime() - now) / 86400000);
          if (daysLeft < 0) alerts.push({ type: "medicament", priority: "high", message: `${m.name} est périmé` });
          else if (daysLeft <= 30) alerts.push({ type: "medicament", priority: "medium", message: `${m.name} périme dans ${daysLeft} j` });
        });

        tasks.forEach((t) => {
          if (!t.due_date) return;
          const daysOver = Math.floor((now - new Date(t.due_date).getTime()) / 86400000);
          if (daysOver > 0) alerts.push({ type: "tache", priority: t.priority === "urgent" || t.priority === "high" ? "high" : "medium", message: `Tâche en retard : ${t.title} (${daysOver} j)` });
        });

        return { nombre_alertes: alerts.length, alertes: alerts };
      },
    }),

    list_equipment: tool({
      description: "Liste les équipements de l'éleveur avec leur statut (opérationnel, en panne, en maintenance).",
      inputSchema: z.object({}),
      execute: async () => selectRows(token, "equipment", "select=id,name,category,status,building_id&order=name.asc"),
    }),

    record_maintenance: tool({
      description: "Enregistre une réparation/maintenance sur un équipement, et peut mettre à jour son statut. Si le statut passe à 'broken', une tâche de réparation est créée automatiquement.",
      inputSchema: z.object({
        equipment_id: z.string().uuid(),
        type: z.enum(["repair", "routine", "inspection"]).default("repair"),
        description: z.string().optional(),
        cost: z.number().nonnegative().default(0),
        new_status: z.enum(["operational", "maintenance", "broken", "retired"]).optional(),
        record_date: z.string().optional(),
      }),
      execute: async (input) =>
        proposeAction("record_maintenance", `Maintenance (${input.type})${input.new_status ? ` — nouveau statut : ${input.new_status}` : ""}`, input),
    }),

    create_building: tool({
      description: "Crée un nouveau bâtiment (poulailler, étable, bergerie, porcherie...).",
      inputSchema: z.object({
        name: z.string(),
        capacity: z.number().int().nonnegative().default(0),
        species: z.enum(["volaille", "bovin", "ovin", "caprin", "porcin"]).nullable().optional().describe("Espèce prévue, ou null si polyvalent"),
        building_type: z.string().optional().describe("Ex: poulailler, étable, bergerie, porcherie"),
      }),
      execute: async (input) => proposeAction("create_building", `Créer le bâtiment "${input.name}"`, input),
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
      execute: async (input) => proposeAction("create_stock_item", `Créer l'article de stock "${input.name}"`, input),
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
      execute: async (input) => proposeAction("create_medication", `Ajouter le médicament "${input.name}"`, input),
    }),

    update_record: tool({
      description:
        "Modifie un enregistrement existant sur une table autorisée (lots, buildings, stock_items, medications, tasks, clients, sales, transactions). Donne uniquement les champs à changer. Toujours confirmer avec l'utilisateur ce qui va être modifié avant d'appeler cet outil, sauf instruction explicite et sans ambiguïté.",
      inputSchema: z.object({
        table: z.enum(["lots", "buildings", "stock_items", "medications", "tasks", "clients", "sales", "transactions", "health_records", "feed_records", "equipment", "suppliers"]),
        id: z.string().uuid(),
        values: z.record(z.string(), z.unknown()).describe("Champs à modifier, ex: { \"status\": \"sold\" }"),
      }),
      execute: async ({ table, id, values }) =>
        proposeAction("update_record", `Modifier ${table} : ${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(", ")}`, { table, id, values }),
    }),

    delete_record: tool({
      description:
        "Supprime définitivement un enregistrement sur une table autorisée (lots, buildings, stock_items, medications, tasks, clients, sales, transactions, health_records, feed_records, mortality_records, weight_records, equipment, maintenance_records, suppliers). Action irréversible : confirme toujours avec l'utilisateur avant de l'appeler, sauf instruction explicite et sans ambiguïté (ex: 'supprime la tâche X').",
      inputSchema: z.object({
        table: z.enum([
          "lots", "buildings", "stock_items", "medications", "tasks", "clients", "sales",
          "transactions", "health_records", "feed_records", "mortality_records", "weight_records",
          "equipment", "maintenance_records", "suppliers",
        ]),
        id: z.string().uuid(),
      }),
      execute: async ({ table, id }) => proposeAction("delete_record", `Supprimer définitivement un enregistrement de ${table}`, { table, id }),
    }),
  };
}
