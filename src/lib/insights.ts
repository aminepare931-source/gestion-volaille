import type { Lot, FeedRecord, Sale, MortalityRecord } from "@/lib/data";
import { ageInDays } from "@/lib/format";

// ---------- CSV export ----------
export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Indice de consommation (FCR) ----------
// FCR = kg d'aliment consommé / kg de gain de poids (approx. via poids vendu).
export function lotFCR(
  lot: Lot,
  feed: FeedRecord[],
  sales: Sale[],
): number | null {
  const feedKg = feed.filter((f) => f.lot_id === lot.id).reduce((s, f) => s + Number(f.quantity_kg), 0);
  const soldKg = sales
    .filter((s) => s.lot_id === lot.id)
    .reduce((s, x) => s + Number((x as { total_weight?: number }).total_weight ?? 0), 0);
  if (feedKg <= 0 || soldKg <= 0) return null;
  return feedKg / soldKg;
}

// ---------- Calendrier de prophylaxie (poulets de chair) ----------
export interface VaccineStep {
  day: number;
  name: string;
  detail: string;
}
export const VACCINE_SCHEDULE: VaccineStep[] = [
  { day: 1, name: "Marek", detail: "Vaccination au couvoir" },
  { day: 7, name: "Newcastle + Bronchite (HB1)", detail: "Eau de boisson ou goutte oculaire" },
  { day: 14, name: "Gumboro (IBD)", detail: "Eau de boisson" },
  { day: 21, name: "Newcastle (Lasota) rappel", detail: "Eau de boisson" },
  { day: 28, name: "Gumboro rappel", detail: "Eau de boisson" },
];

export interface VaccineReminder {
  lotId: string;
  lotName: string;
  step: VaccineStep;
  dueInDays: number; // négatif = en retard
}

export function upcomingVaccines(lots: Lot[]): VaccineReminder[] {
  const out: VaccineReminder[] = [];
  lots
    .filter((l) => l.status === "active")
    .forEach((l) => {
      const age = ageInDays(l.arrival_date);
      VACCINE_SCHEDULE.forEach((step) => {
        const dueInDays = step.day - age;
        if (dueInDays >= -2 && dueInDays <= 4) {
          out.push({ lotId: l.id, lotName: l.name, step, dueInDays });
        }
      });
    });
  return out.sort((a, b) => a.dueInDays - b.dueInDays);
}

// ---------- Score de santé du troupeau (0-100) ----------
export function flockHealthScore(
  lots: Lot[],
  mortality: MortalityRecord[],
): { score: number; label: string; tone: "success" | "warning" | "destructive" } {
  const active = lots.filter((l) => l.status === "active");
  const initial = active.reduce((s, l) => s + l.initial_count, 0);
  const deaths = mortality
    .filter((m) => active.some((l) => l.id === m.lot_id))
    .reduce((s, m) => s + m.count, 0);
  const rate = initial > 0 ? (deaths / initial) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(100 - rate * 4)));
  if (score >= 85) return { score, label: "Excellent", tone: "success" };
  if (score >= 65) return { score, label: "Correct", tone: "warning" };
  return { score, label: "À surveiller", tone: "destructive" };
}

// ---------- Recommandations intelligentes ----------
export function smartTips(args: {
  lots: Lot[];
  mortality: MortalityRecord[];
  feed: FeedRecord[];
  sales: Sale[];
}): string[] {
  const { lots, mortality, feed, sales } = args;
  const tips: string[] = [];
  lots
    .filter((l) => l.status === "active")
    .forEach((l) => {
      const age = ageInDays(l.arrival_date);
      const rate = l.initial_count > 0 ? (lotDeaths(l.id, mortality) / l.initial_count) * 100 : 0;
      if (rate > 8) tips.push(`Mortalité élevée sur ${l.name} : vérifiez l'eau, la ventilation et démarrez un traitement.`);
      if (age >= 42 && age <= 56) tips.push(`${l.name} atteint le poids commercial (${age} j) : planifiez la vente pour maximiser la marge.`);
      const fcr = lotFCR(l, feed, sales);
      if (fcr && fcr > 2) tips.push(`Indice de consommation élevé sur ${l.name} (${fcr.toFixed(2)}) : ajustez la ration et la qualité de l'aliment.`);
    });
  if (tips.length === 0) tips.push("Tout est sous contrôle. Continuez à enregistrer vos données quotidiennes pour des analyses précises.");
  return tips.slice(0, 4);
}

function lotDeaths(lotId: string, mortality: MortalityRecord[]): number {
  return mortality.filter((m) => m.lot_id === lotId).reduce((s, m) => s + m.count, 0);
}
