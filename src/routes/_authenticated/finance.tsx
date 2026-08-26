import { createFileRoute } from "@tanstack/react-router";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Wallet, TrendingUp, TrendingDown, Trash2, Download } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { useTransactions, useSales, useLots, useFarm, useInsert, useDelete } from "@/lib/data";
import { formatMoney, formatDate } from "@/lib/format";
import { exportCSV } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/finance")({
  component: FinancePage,
});

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function FinancePage() {
  const { data: transactions = [] } = useTransactions();
  const { data: sales = [] } = useSales();
  const { data: lots = [] } = useLots();
  const { data: farm } = useFarm();
  const insert = useInsert("transactions");
  const del = useDelete("transactions");
  const cur = farm?.currency ?? "FCFA";

  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const salesRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
  const revenue = income + salesRevenue;
  const profit = revenue - expenses;

  const byCategory: Record<string, number> = {};
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  });
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value: Math.round(value) }));

  const fields: FieldDef[] = [
    { name: "type", label: "Type", type: "select", options: [{ value: "expense", label: "Dépense" }, { value: "income", label: "Revenu" }], defaultValue: "expense" },
    { name: "category", label: "Catégorie", required: true, placeholder: "Poussins, Aliments, Vaccins..." },
    { name: "amount", label: "Montant", type: "number", required: true },
    { name: "description", label: "Description" },
    { name: "lot_id", label: "Lot associé (optionnel)", type: "select", options: lots.map((l) => ({ value: l.id, label: l.name })) },
    { name: "record_date", label: "Date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
  ];

  function handleExport() {
    exportCSV(
      "finances-elevage",
      transactions.map((t) => ({
        Date: t.record_date,
        Type: t.type === "expense" ? "Dépense" : "Revenu",
        Categorie: t.category,
        Description: t.description || "",
        Montant: Number(t.amount),
      })),
    );
  }

  return (
    <>
      <PageHeader
        title="Finances"
        subtitle="Dépenses, revenus et bénéfice"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!transactions.length}>
              <Download className="mr-1 h-4 w-4" /> CSV
            </Button>
            <FormDialog title="Nouvelle transaction" fields={fields} trigger={<Button>Ajouter</Button>}
              onSubmit={(v) => insert.mutateAsync({ ...v, lot_id: v.lot_id || null })} />
          </div>
        }
      />
      <div className="space-y-6 p-4 md:p-8">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard label="Dépenses totales" value={formatMoney(expenses, cur)} icon={TrendingDown} />
          <StatCard label="Revenus totaux" value={formatMoney(revenue, cur)} icon={TrendingUp} sub={`dont ${formatMoney(salesRevenue, cur)} de ventes`} />
          <StatCard label="Bénéfice global" value={formatMoney(profit, cur)} icon={Wallet} tone={profit >= 0 ? "success" : "destructive"} />
        </div>

        {pieData.length > 0 && (
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold">Dépenses par catégorie</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v, cur)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div>
          <h3 className="mb-3 font-semibold">Historique des transactions</h3>
          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Aucune transaction.</div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="font-medium">{t.category}</div>
                    <div className="text-xs text-muted-foreground">{t.description || "—"} · {formatDate(t.record_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={t.type === "expense" ? "font-semibold text-destructive" : "font-semibold text-success"}>
                      {t.type === "expense" ? "-" : "+"}{formatMoney(Number(t.amount), cur)}
                    </span>
                    <button onClick={() => del.mutate(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
