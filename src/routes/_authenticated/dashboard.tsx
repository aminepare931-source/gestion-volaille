import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bird,
  Skull,
  Wallet,
  TrendingUp,
  Plus,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import {
  useLots,
  useMortalityRecords,
  useTransactions,
  useSales,
  useStockItems,
  useFarm,
  lotAlive,
  lotDeaths,
} from "@/lib/data";
import { formatMoney, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: farm } = useFarm();
  const { data: lots = [] } = useLots();
  const { data: mortality = [] } = useMortalityRecords();
  const { data: transactions = [] } = useTransactions();
  const { data: sales = [] } = useSales();
  const { data: stock = [] } = useStockItems();
  const cur = farm?.currency ?? "FCFA";

  const activeLots = lots.filter((l) => l.status === "active");
  const totalAlive = lots.reduce((s, l) => s + lotAlive(l, mortality, sales), 0);
  const totalInitial = lots.reduce((s, l) => s + l.initial_count, 0);
  const totalDeaths = lots.reduce((s, l) => s + lotDeaths(l.id, mortality), 0);
  const mortalityRate = totalInitial > 0 ? (totalDeaths / totalInitial) * 100 : 0;

  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const revenue =
    transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0) +
    sales.reduce((s, x) => s + Number(x.total), 0);
  const profit = revenue - expenses;

  const lowStock = stock.filter((s) => Number(s.quantity) <= Number(s.alert_threshold) && Number(s.alert_threshold) > 0);
  const highMortalityLots = activeLots.filter((l) => {
    const rate = l.initial_count > 0 ? (lotDeaths(l.id, mortality) / l.initial_count) * 100 : 0;
    return rate > 10;
  });

  const chartData = [
    { name: "Revenus", value: Math.round(revenue) },
    { name: "Dépenses", value: Math.round(expenses) },
    { name: "Bénéfice", value: Math.round(profit) },
  ];

  return (
    <>
      <PageHeader title={`Bonjour 👋`} subtitle={farm?.name ?? "Tableau de bord"} />
      <div className="space-y-6 p-4 md:p-8">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/lots">
              <Plus className="mr-1 h-4 w-4" /> Nouveau lot
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/finance">
              <Wallet className="mr-1 h-4 w-4" /> Dépense
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/sales">
              <ShoppingCart className="mr-1 h-4 w-4" /> Vente
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="Lots actifs" value={activeLots.length} icon={Bird} tone="primary" />
          <StatCard label="Volailles vivantes" value={formatNumber(totalAlive)} icon={Bird} />
          <StatCard label="Taux de mortalité" value={`${mortalityRate.toFixed(1)}%`} icon={Skull} tone={mortalityRate > 10 ? "destructive" : "default"} />
          <StatCard label="Dépenses totales" value={formatMoney(expenses, cur)} icon={Wallet} />
          <StatCard label="Revenus totaux" value={formatMoney(revenue, cur)} icon={TrendingUp} />
          <StatCard label="Bénéfice global" value={formatMoney(profit, cur)} icon={TrendingUp} tone={profit >= 0 ? "success" : "destructive"} />
        </div>

        {/* Chart */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="mb-4 font-semibold">Revenus vs Dépenses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={70} />
              <Tooltip formatter={(v: number) => formatMoney(v, cur)} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" /> Alertes
          </h3>
          {lowStock.length === 0 && highMortalityLots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune alerte. Tout va bien 🎉</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lowStock.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Stock faible : <strong>{s.name}</strong> ({formatNumber(Number(s.quantity))} {s.unit})
                </li>
              ))}
              {highMortalityLots.map((l) => (
                <li key={l.id} className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2">
                  <Skull className="h-4 w-4 text-destructive" />
                  Mortalité élevée : <strong>{l.name}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
