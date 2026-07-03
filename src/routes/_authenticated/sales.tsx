import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { useSales, useLots, useFarm, useInsert, useDelete } from "@/lib/data";
import { formatMoney, formatNumber, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesPage,
});

function SalesPage() {
  const { data: sales = [] } = useSales();
  const { data: lots = [] } = useLots();
  const { data: farm } = useFarm();
  const insert = useInsert("sales");
  const del = useDelete("sales");
  const cur = farm?.currency ?? "FCFA";

  const totalQty = sales.reduce((s, x) => s + x.quantity, 0);
  const totalRev = sales.reduce((s, x) => s + Number(x.total), 0);

  const fields: FieldDef[] = [
    { name: "lot_id", label: "Lot", type: "select", options: lots.map((l) => ({ value: l.id, label: l.name })), required: true },
    { name: "quantity", label: "Quantité", type: "number", required: true },
    { name: "unit_price", label: "Prix unitaire", type: "number", required: true },
    { name: "client", label: "Client" },
    { name: "record_date", label: "Date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
  ];

  return (
    <>
      <PageHeader
        title="Ventes"
        subtitle={`${sales.length} vente(s)`}
        action={<FormDialog title="Nouvelle vente" fields={fields} trigger={<Button>Nouvelle vente</Button>}
          onSubmit={(v) => insert.mutateAsync({ ...v, total: Number(v.quantity) * Number(v.unit_price) })} />}
      />
      <div className="space-y-6 p-4 md:p-8">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Volailles vendues" value={formatNumber(totalQty)} icon={ShoppingCart} tone="primary" />
          <StatCard label="Revenu total" value={formatMoney(totalRev, cur)} tone="success" />
        </div>
        {sales.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-50" /> Aucune vente.
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {sales.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="font-medium">{formatNumber(s.quantity)} volailles · {lots.find((l) => l.id === s.lot_id)?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{s.client || "Client anonyme"} · {formatDate(s.record_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatMoney(Number(s.total), cur)}</span>
                  <button onClick={() => del.mutate(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
