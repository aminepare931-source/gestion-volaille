import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { neon } from "@/integrations/neon/client";

// Loosely-typed accessor for dynamic table names.
const db = neon as unknown as { from: (t: string) => any };
import type { Tables } from "@/integrations/neon/types";

export type Farm = Tables<"farms">;
export type Building = Tables<"buildings">;
export type Lot = Tables<"lots">;
export type FeedRecord = Tables<"feed_records">;
export type HealthRecord = Tables<"health_records">;
export type MortalityRecord = Tables<"mortality_records">;
export type WeightRecord = Tables<"weight_records">;
export type StockItem = Tables<"stock_items">;
export type Transaction = Tables<"transactions">;
export type Sale = Tables<"sales">;
export type Task = Tables<"tasks">;
export type Client = Tables<"clients">;
export type Disease = Tables<"diseases">;
export type Medication = Tables<"medications">;
export type Equipment = Tables<"equipment">;
export type MaintenanceRecord = Tables<"maintenance_records">;

function useList<T>(table: string, order = "created_at", asc = false) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await db
        .from(table)
        .select("*")
        .order(order, { ascending: asc });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export const useFarm = () =>
  useQuery({
    queryKey: ["farm"],
    queryFn: async () => {
      const { data, error } = await db.from("farms").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Farm | null;
    },
  });

export const useProfile = () =>
  useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await db.from("profiles").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Tables<"profiles"> | null;
    },
  });

export const useBuildings = () => useList<Building>("buildings");
export const useLots = () => useList<Lot>("lots", "arrival_date");
export const useFeedRecords = () => useList<FeedRecord>("feed_records", "record_date");
export const useHealthRecords = () => useList<HealthRecord>("health_records", "record_date");
export const useMortalityRecords = () => useList<MortalityRecord>("mortality_records", "record_date");
export const useWeightRecords = () => useList<WeightRecord>("weight_records", "record_date", true);
export const useStockItems = () => useList<StockItem>("stock_items", "name", true);
export const useTransactions = () => useList<Transaction>("transactions", "record_date");
export const useSales = () => useList<Sale>("sales", "record_date");
export const useTasks = () => useList<Task>("tasks", "due_date", true);
export const useClients = () => useList<Client>("clients", "name", true);
export const useDiseases = () => useList<Disease>("diseases", "name", true);
export const useMedications = () => useList<Medication>("medications", "name", true);
export const useEquipment = () => useList<Equipment>("equipment", "name", true);
export const useMaintenanceRecords = () => useList<MaintenanceRecord>("maintenance_records", "record_date");

export function useLot(id: string) {
  return useQuery({
    queryKey: ["lots", id],
    queryFn: async () => {
      const { data, error } = await db.from("lots").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Lot | null;
    },
    enabled: !!id,
  });
}

async function currentUserId() {
  const { data } = await neon.auth.getUser();
  if (!data.user) throw new Error("Non authentifié");
  return data.user.id;
}

export function useInsert(table: string, invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const user_id = await currentUserId();
      const { data, error } = await db
        .from(table)
        .insert({ ...values, user_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useUpdate(table: string, invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { data, error } = await db.from(table).update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

export function useDelete(table: string, invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}

// ---- Derived metrics ----
export function lotDeaths(lotId: string, mortality: MortalityRecord[]): number {
  return mortality.filter((m) => m.lot_id === lotId).reduce((s, m) => s + m.count, 0);
}

export function lotAlive(lot: Lot, mortality: MortalityRecord[], sales: Sale[] = []): number {
  return Math.max(0, lot.initial_count - lotDeaths(lot.id, mortality) - lotSold(lot.id, sales));
}

export function lotSold(lotId: string, sales: Sale[]): number {
  return sales.filter((s) => s.lot_id === lotId).reduce((s, x) => s + x.quantity, 0);
}
