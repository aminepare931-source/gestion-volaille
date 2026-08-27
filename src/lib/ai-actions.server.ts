// Exécuteurs réels des actions proposées par l'IA. Contrairement à
// ai-tools.server.ts (qui ne fait que PROPOSER, jamais écrire), ce module
// contient la vraie logique d'écriture — appelée uniquement depuis
// /api/actions/commit, donc uniquement après que l'éleveur a cliqué "Approuver".
// Un seul endroit pour cette logique : évite toute divergence entre ce que l'IA
// propose et ce qui s'exécute réellement.
import { insertRows, selectRows, updateRows, deleteRows } from "@/lib/neon-data-api.server";

type Ctx = { token: string; userId: string };

const today = () => new Date().toISOString().slice(0, 10);

export const ACTION_EXECUTORS: Record<string, (payload: any, ctx: Ctx) => Promise<unknown>> = {
  create_lot: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "lots", {
      id: p.id,
      user_id: userId,
      name: p.name,
      species: p.species,
      breed: p.breed ?? null,
      initial_count: p.initial_count,
      purchase_cost: p.purchase_cost ?? 0,
      arrival_date: p.arrival_date ?? today(),
      building_id: p.building_id ?? null,
      status: "active",
    });
    return row;
  },

  create_feed_record: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "feed_records", {
      id: p.id,
      user_id: userId,
      lot_id: p.lot_id,
      feed_type: p.feed_type,
      quantity_kg: p.quantity_kg,
      cost: p.cost ?? 0,
      record_date: p.record_date ?? today(),
      stock_item_id: p.stock_item_id ?? null,
    });
    let stockWarning: string | null = null;
    if (p.stock_item_id) {
      const [item] = await selectRows<{ id: string; quantity: number; alert_threshold: number; name: string; unit: string }>(
        token,
        "stock_items",
        `select=id,quantity,alert_threshold,name,unit&id=eq.${p.stock_item_id}`,
      );
      if (item) {
        const newQuantity = Math.max(0, Number(item.quantity) - p.quantity_kg);
        await updateRows(token, "stock_items", `id=eq.${p.stock_item_id}`, { quantity: newQuantity });
        if (Number(item.alert_threshold) > 0 && newQuantity <= Number(item.alert_threshold)) {
          stockWarning = `Stock de ${item.name} bas : ${newQuantity} ${item.unit} restant(s).`;
        }
      }
    }
    return { ...row, stock_warning: stockWarning };
  },

  create_health_record: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "health_records", {
      id: p.id,
      user_id: userId,
      lot_id: p.lot_id,
      type: p.type,
      name: p.name,
      cost: p.cost ?? 0,
      notes: p.notes ?? null,
      record_date: p.record_date ?? today(),
      medication_id: p.medication_id ?? null,
      quantity_used: p.quantity_used ?? null,
      disease_id: p.disease_id ?? null,
    });
    let stockWarning: string | null = null;
    if (p.medication_id && p.quantity_used) {
      const [med] = await selectRows<{ id: string; quantity: number; name: string }>(
        token,
        "medications",
        `select=id,quantity,name&id=eq.${p.medication_id}`,
      );
      if (med) {
        const newQuantity = Math.max(0, Number(med.quantity) - p.quantity_used);
        await updateRows(token, "medications", `id=eq.${p.medication_id}`, { quantity: newQuantity });
        if (newQuantity <= 0) stockWarning = `Stock de ${med.name} épuisé.`;
      }
    }
    return { ...row, stock_warning: stockWarning };
  },

  record_mortality: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "mortality_records", {
      id: p.id,
      user_id: userId,
      lot_id: p.lot_id,
      count: p.count,
      cause: p.cause ?? null,
      record_date: p.record_date ?? today(),
    });
    return row;
  },

  record_weight: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "weight_records", {
      id: p.id,
      user_id: userId,
      lot_id: p.lot_id,
      avg_weight: p.avg_weight,
      record_date: p.record_date ?? today(),
    });
    return row;
  },

  record_sale: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "sales", {
      id: p.id,
      user_id: userId,
      lot_id: p.lot_id ?? null,
      client_id: p.client_id ?? null,
      quantity: p.quantity,
      unit_price: p.unit_price,
      total: p.quantity * p.unit_price,
      client: p.client ?? null,
      record_date: p.record_date ?? today(),
    });
    return row;
  },

  create_client: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "clients", {
      id: p.id,
      user_id: userId,
      name: p.name,
      type: p.type ?? "individual",
      phone: p.phone ?? null,
      address: p.address ?? null,
      notes: p.notes ?? null,
    });
    return row;
  },

  record_transaction: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "transactions", {
      id: p.id,
      user_id: userId,
      type: p.type,
      category: p.category,
      amount: p.amount,
      description: p.description ?? null,
      lot_id: p.lot_id ?? null,
      supplier_id: p.supplier_id ?? null,
      record_date: p.record_date ?? today(),
    });
    return row;
  },

  create_supplier: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "suppliers", {
      id: p.id,
      user_id: userId,
      name: p.name,
      type: p.type ?? "general",
      phone: p.phone ?? null,
      address: p.address ?? null,
      notes: p.notes ?? null,
    });
    return row;
  },

  adjust_stock: async (p, { token }) => {
    const [item] = await selectRows<{ id: string; quantity: number; alert_threshold: number; unit: string; name: string }>(
      token,
      "stock_items",
      `select=id,quantity,alert_threshold,unit,name&id=eq.${p.stock_item_id}`,
    );
    if (!item) throw new Error("Article de stock introuvable.");
    const newQuantity = Math.max(0, Number(item.quantity) + p.delta);
    const [row] = await updateRows(token, "stock_items", `id=eq.${p.stock_item_id}`, { quantity: newQuantity });
    return { ...row, alerte_stock_bas: newQuantity <= Number(item.alert_threshold) && Number(item.alert_threshold) > 0 };
  },

  create_task: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "tasks", {
      id: p.id,
      user_id: userId,
      title: p.title,
      description: p.description ?? null,
      priority: p.priority ?? "medium",
      due_date: p.due_date ?? null,
      lot_id: p.lot_id ?? null,
      created_by: "ia",
    });
    return row;
  },

  complete_task: async (p, { token }) => {
    const [row] = await updateRows(token, "tasks", `id=eq.${p.task_id}`, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    return row;
  },

  record_maintenance: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "maintenance_records", {
      id: p.id,
      user_id: userId,
      equipment_id: p.equipment_id,
      type: p.type ?? "repair",
      description: p.description ?? null,
      cost: p.cost ?? 0,
      record_date: p.record_date ?? today(),
    });
    let autoTask: unknown = null;
    if (p.new_status) {
      const [equip] = await updateRows<{ id: string; name: string }>(token, "equipment", `id=eq.${p.equipment_id}`, { status: p.new_status });
      if (p.new_status === "broken" && equip) {
        [autoTask] = await insertRows(token, "tasks", {
          user_id: userId,
          title: `Réparer ${equip.name}`,
          priority: "high",
          created_by: "ia",
        });
      }
    }
    return { ...row, tache_creee: autoTask };
  },

  create_building: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "buildings", {
      id: p.id,
      user_id: userId,
      name: p.name,
      capacity: p.capacity ?? 0,
      species: p.species ?? null,
      building_type: p.building_type ?? null,
    });
    return row;
  },

  create_stock_item: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "stock_items", {
      id: p.id,
      user_id: userId,
      name: p.name,
      category: p.category ?? "feed",
      quantity: p.quantity ?? 0,
      unit: p.unit ?? "kg",
      alert_threshold: p.alert_threshold ?? 0,
      unit_cost: p.unit_cost ?? 0,
    });
    return row;
  },

  create_medication: async (p, { token, userId }) => {
    const [row] = await insertRows(token, "medications", {
      id: p.id,
      user_id: userId,
      name: p.name,
      category: p.category ?? "other",
      quantity: p.quantity ?? 0,
      unit: p.unit ?? "unité",
      expiry_date: p.expiry_date ?? null,
      notes: p.notes ?? null,
    });
    return row;
  },

  update_record: async (p, { token }) => {
    const [row] = await updateRows(token, p.table, `id=eq.${p.id}`, p.values);
    return row;
  },

  delete_record: async (p, { token }) => {
    await deleteRows(token, p.table, `id=eq.${p.id}`);
    return { deleted: true, table: p.table, id: p.id };
  },
};
