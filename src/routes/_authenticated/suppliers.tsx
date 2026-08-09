import { createFileRoute } from "@tanstack/react-router";
import { Truck, Phone } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { useSuppliers, useTransactions, useInsert } from "@/lib/data";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/suppliers")({
  component: SuppliersPage,
});

const TYPE_LABEL: Record<string, string> = { feed: "Aliment", medication: "Médicaments", equipment: "Équipement", general: "Général" };

function SuppliersPage() {
  const { data: suppliers = [] } = useSuppliers();
  const { data: transactions = [] } = useTransactions();
  const insert = useInsert("suppliers");

  const fields: FieldDef[] = [
    { name: "name", label: "Nom", required: true },
    {
      name: "type",
      label: "Type",
      type: "select",
      defaultValue: "general",
      options: [
        { value: "feed", label: "Aliment" },
        { value: "medication", label: "Médicaments" },
        { value: "equipment", label: "Équipement" },
        { value: "general", label: "Général" },
      ],
    },
    { name: "phone", label: "Téléphone (optionnel)" },
    { name: "address", label: "Adresse (optionnel)" },
    { name: "notes", label: "Notes (optionnel)", type: "textarea" },
  ];

  return (
    <>
      <PageHeader
        title="Fournisseurs"
        subtitle={`${suppliers.length} fournisseur(s)`}
        action={<FormDialog title="Ajouter un fournisseur" fields={fields} onSubmit={(v) => insert.mutateAsync(v)} trigger={<Button>Ajouter</Button>} />}
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 md:p-8 lg:grid-cols-3">
        {suppliers.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <Truck className="mx-auto mb-2 h-8 w-8 opacity-50" /> Aucun fournisseur enregistré.
          </div>
        )}
        {suppliers.map((s) => {
          const spent = transactions.filter((t) => t.supplier_id === s.id).reduce((sum, t) => sum + Number(t.amount), 0);
          return (
            <div key={s.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">{TYPE_LABEL[s.type] ?? s.type}</p>
                </div>
              </div>
              {s.phone && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {s.phone}
                </p>
              )}
              <div className="mt-3 border-t pt-3 text-sm">
                <span className="text-muted-foreground">Total dépensé : </span>
                <span className="font-semibold">{formatMoney(spent)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
