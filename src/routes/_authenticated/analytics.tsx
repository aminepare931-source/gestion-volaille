import { createFileRoute } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Trophy, Percent, HeartPulse, Coins, Download } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  useLots, useMortalityRecords, useSales, useTransactions, useFeedRecords, useHealthRecords, useFarm,
  lotAlive, lotDeaths, lotSold,
} from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { exportCSV, lotFCR } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: lots = [] } = useLots();
  const { data: mortality = [] } = useMortalityRecords();
  const { data: sales = [] } = useSales();
  const { data: transactions = [] } = useTransactions();
  const { data: feed = [] } = useFeedRecords();
  const { data: health = [] } = useHealthRecords();
  const { data: farm } = useFarm();
  const cur = farm?.currency ?? "FCFA";

  const perLot = lots.map((l) => {
    const feedCost = feed.filter((f) => f.lot_id === l.id).reduce((s, f) => s + Number(f.cost), 0);
    const healthCost = health.filter((h) => h.lot_id === l.id).reduce((s, h) => s + Number(h.cost), 0);
    const txExp = transactions.filter((t) => t.lot_id === l.id && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const cost = Number(l.purchase_cost) + feedCost + healthCost + txExp;
    const rev = sales.filter((s) => s.lot_id === l.id).reduce((s, x) => s + Number(x.total), 0);
    const sold = lotSold(l.id, sales);
    const deaths = lotDeaths(l.id, mortality);
    const survival = l.initial_count > 0 ? ((l.initial_count - deaths) / l.initial_count) * 100 : 0;
    const fcr = lotFCR(l, feed, sales);
    return { name: l.name, profit: rev - cost, cost, rev, sold, survival, fcr, costPerBird: sold > 0 ? cost / sold : 0 };
  });

  function handleExport() {
    exportCSV(
      "analyses-ma-volaille",
      perLot.map((l) => ({
        Lot: l.name,
        Revenus: Math.round(l.rev),
        Cout: Math.round(l.cost),
        Benefice: Math.round(l.profit),
        Survie_pct: l.survival.toFixed(1),
        FCR: l.fcr ? l.fcr.toFixed(2) : "",
        Cout_par_poulet: Math.round(l.costPerBird),
      })),
    );
  }

  const best = [...perLot].sort((a, b) => b.profit - a.profit)[0];
  const avgSurvival = perLot.length ? perLot.reduce((s, l) => s + l.survival, 0) / perLot.length : 0;
  const soldTotal = perLot.reduce((s, l) => s + l.sold, 0);
  const totalCost = perLot.reduce((s, l) => s + l.cost, 0);
  const totalRev = perLot.reduce((s, l) => s + l.rev, 0);
  const avgCostPerBird = soldTotal > 0 ? totalCost / soldTotal : 0;
  const roi = totalCost > 0 ? ((totalRev - totalCost) / totalCost) * 100 : 0;

  const chartData = perLot.map((l) => ({ name: l.name, Bénéfice: Math.round(l.profit) }));

  return (
    <>
      <PageHeader
        title="Analyses"
        subtitle="Performance et rentabilité de la ferme"
        action={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!perLot.length}>
            <Download className="mr-1 h-4 w-4" /> Exporter CSV
          </Button>
        }
      />
      <div className="space-y-6 p-4 md:p-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Lot le plus rentable" value={best?.name ?? "—"} icon={Trophy} tone="accent" sub={best ? formatMoney(best.profit, cur) : undefined} />
          <StatCard label="Survie moyenne" value={`${avgSurvival.toFixed(1)}%`} icon={HeartPulse} tone="primary" />
          <StatCard label="Coût moyen / poulet" value={formatMoney(avgCostPerBird, cur)} icon={Coins} />
          <StatCard label="ROI global" value={`${roi.toFixed(1)}%`} icon={Percent} tone={roi >= 0 ? "success" : "destructive"} />
        </div>

        {chartData.length > 0 ? (
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold">Comparaison des lots (bénéfice)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={70} />
                <Tooltip formatter={(v: number) => formatMoney(v, cur)} />
                <Bar dataKey="Bénéfice" radius={[8, 8, 0, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            Ajoutez des lots et des ventes pour voir vos analyses.
          </div>
        )}

        {perLot.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Lot</th>
                  <th className="px-4 py-2">Survie</th>
                  <th className="px-4 py-2">Coût/poulet</th>
                  <th className="px-4 py-2 text-right">Bénéfice</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {perLot.map((l) => (
                  <tr key={l.name}>
                    <td className="px-4 py-2.5 font-medium">{l.name}</td>
                    <td className="px-4 py-2.5">{l.survival.toFixed(0)}%</td>
                    <td className="px-4 py-2.5">{formatMoney(l.costPerBird, cur)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${l.profit >= 0 ? "text-success" : "text-destructive"}`}>{formatMoney(l.profit, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
