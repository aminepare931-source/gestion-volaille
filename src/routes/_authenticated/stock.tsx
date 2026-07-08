import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package, Wheat, Syringe, Pill, Wrench, Trash2, AlertTriangle, Plus, Minus, Info } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { useStockItems, useInsert, useUpdate, useDelete, StockItem } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/stock")({
  component: StockPage,
});

const CATS = [
  { value: "feed", label: "Aliments", icon: Wheat },
  { value: "vaccine", label: "Vaccins", icon: Syringe },
  { value: "medicine", label: "Médicaments", icon: Pill },
  { value: "equipment", label: "Matériel", icon: Wrench },
];

function AdjustDialog({
  item,
  mode,
  onApply,
}: {
  item: StockItem;
  mode: "in" | "out";
  onApply: (delta: number) => Promise<void>;
}) {
  const isIn = mode === "in";
  const fields: FieldDef[] = [
    { name: "amount", label: `Quantité à ${isIn ? "ajouter" : "retirer"} (${item.unit})`, type: "number", required: true },
  ];
  return (
    <FormDialog
      title={`${isIn ? "Entrée de stock" : "Sortie de stock"} — ${item.name}`}
      fields={fields}
      submitLabel={isIn ? "Ajouter au stock" : "Retirer du stock"}
      onSubmit={async (v) => {
        const amount = Number(v.amount) || 0;
        if (amount <= 0) throw new Error("Entrez une quantité valide");
        await onApply(isIn ? amount : -amount);
      }}
      trigger={
        <button
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
            isIn
              ? "border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
              : "border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground",
          )}
          aria-label={isIn ? "Ajouter au stock" : "Retirer du stock"}
        >
          {isIn ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
      }
    />
  );
}

function StockPage() {
  const { data: items = [] } = useStockItems();
  const insert = useInsert("stock_items");
  const update = useUpdate("stock_items");
  const del = useDelete("stock_items");
  const [cat, setCat] = useState<string>("all");

  const fields: FieldDef[] = [
    { name: "category", label: "Catégorie", type: "select", options: CATS.map((c) => ({ value: c.value, label: c.label })), defaultValue: "feed" },
    { name: "name", label: "Nom du produit", required: true },
    { name: "quantity", label: "Quantité de départ", type: "number", required: true },
    { name: "unit", label: "Unité", placeholder: "kg, sac, dose...", defaultValue: "kg" },
    { name: "alert_threshold", label: "Seuil d'alerte", type: "number" },
    { name: "unit_cost", label: "Coût unitaire", type: "number" },
  ];

  async function adjust(item: StockItem, delta: number) {
    const next = Math.max(0, Number(item.quantity) + delta);
    await update.mutateAsync({ id: item.id, values: { quantity: next } });
    toast.success(delta > 0 ? "Stock augmenté" : "Stock diminué");
  }

  const filtered = cat === "all" ? items : items.filter((i) => i.category === cat);

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle={`${items.length} produit(s)`}
        action={<FormDialog title="Ajouter au stock" fields={fields} onSubmit={(v) => insert.mutateAsync(v)} trigger={<Button>Ajouter</Button>} />}
      />
      <div className="space-y-4 p-4 md:p-8">
        <div className="flex items-start gap-3 rounded-2xl border bg-secondary/40 p-4 text-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-muted-foreground">
            <p><strong className="text-foreground">Comment ça marche&nbsp;?</strong></p>
            <p>1. Cliquez sur <strong className="text-foreground">Ajouter</strong> pour créer un produit (ex&nbsp;: sac d'aliment, vaccin…).</p>
            <p>2. Utilisez le bouton <span className="font-semibold text-primary">＋</span> quand vous <strong className="text-foreground">achetez / recevez</strong> du stock.</p>
            <p>3. Utilisez le bouton <span className="font-semibold text-destructive">－</span> quand vous <strong className="text-foreground">utilisez / consommez</strong> du stock.</p>
          </div>
        </div>
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
          <ul className="space-y-2">
            {filtered.map((i) => {
              const Icon = CATS.find((c) => c.value === i.category)?.icon ?? Package;
              const low = Number(i.quantity) <= Number(i.alert_threshold) && Number(i.alert_threshold) > 0;
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary"><Icon className="h-4 w-4 text-primary" /></div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {low && "⚠ "}Seuil {formatNumber(Number(i.alert_threshold))} {i.unit}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {low && <AlertTriangle className="h-4 w-4 text-warning" />}
                    <span className={cn("min-w-[70px] text-right font-semibold tabular-nums", low && "text-warning")}>
                      {formatNumber(Number(i.quantity))} {i.unit}
                    </span>
                    <AdjustDialog item={i} mode="out" onApply={(d) => adjust(i, d)} />
                    <AdjustDialog item={i} mode="in" onApply={(d) => adjust(i, d)} />
                    <button onClick={() => del.mutate(i.id)} className="ml-1 text-muted-foreground hover:text-destructive" aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
