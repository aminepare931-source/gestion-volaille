import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package, Wheat, Syringe, Pill, Wrench, Trash2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { useStockItems, useInsert, useDelete } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/stock")({
  component: StockPage,
});

const CATS = [
  { value: "feed", label: "Aliments", icon: Wheat },
  { value: "vaccine", label: "Vaccins", icon: Syringe },
  { value: "medicine", label: "Médicaments", icon: Pill },
  { value: "equipment", label: "Matériel", icon: Wrench },
];

function StockPage() {
  const { data: items = [] } = useStockItems();
  const insert = useInsert("stock_items");
  const del = useDelete("stock_items");
  const [cat, setCat] = useState<string>("all");

  const fields: FieldDef[] = [
    { name: "category", label: "Catégorie", type: "select", options: CATS.map((c) => ({ value: c.value, label: c.label })), defaultValue: "feed" },
    { name: "name", label: "Nom du produit", required: true },
    { name: "quantity", label: "Quantité", type: "number", required: true },
    { name: "unit", label: "Unité", placeholder: "kg, sac, dose...", defaultValue: "kg" },
    { name: "alert_threshold", label: "Seuil d'alerte", type: "number" },
    { name: "unit_cost", label: "Coût unitaire", type: "number" },
  ];

  const filtered = cat === "all" ? items : items.filter((i) => i.category === cat);

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle={`${items.length} produit(s)`}
        action={<FormDialog title="Ajouter au stock" fields={fields} onSubmit={(v) => insert.mutateAsync(v)} trigger={<Button>Ajouter</Button>} />}
      />
      <div className="space-y-4 p-4 md:p-8">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCat("all")} className={cn("rounded-full px-4 py-1.5 text-sm font-medium", cat === "all" ? "bg-primary text-primary-foreground" : "bg-secondary")}>Tous</button>
          {CATS.map((c) => (
            <button key={c.value} onClick={() => setCat(c.value)} className={cn("rounded-full px-4 py-1.5 text-sm font-medium", cat === c.value ? "bg-primary text-primary-foreground" : "bg-secondary")}>{c.label}</button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <Package className="mx-auto mb-2 h-8 w-8 opacity-50" /> Aucun produit.
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {filtered.map((i) => {
              const Icon = CATS.find((c) => c.value === i.category)?.icon ?? Package;
              const low = Number(i.quantity) <= Number(i.alert_threshold) && Number(i.alert_threshold) > 0;
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary"><Icon className="h-4 w-4 text-primary" /></div>
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">Seuil {formatNumber(Number(i.alert_threshold))} {i.unit}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {low && <AlertTriangle className="h-4 w-4 text-warning" />}
                    <span className={cn("font-semibold", low && "text-warning")}>{formatNumber(Number(i.quantity))} {i.unit}</span>
                    <button onClick={() => del.mutate(i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
