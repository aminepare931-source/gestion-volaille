import { createFileRoute } from "@tanstack/react-router";
import { Users, Phone } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { useClients, useSales, useInsert } from "@/lib/data";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
});

const TYPE_LABEL: Record<string, string> = { individual: "Particulier", business: "Entreprise", wholesale: "Grossiste" };

function ClientsPage() {
  const { data: clients = [] } = useClients();
  const { data: sales = [] } = useSales();
  const insert = useInsert("clients");

  const fields: FieldDef[] = [
    { name: "name", label: "Nom", required: true, placeholder: "Amadou Traoré" },
    {
      name: "type",
      label: "Type",
      type: "select",
      defaultValue: "individual",
      options: [
        { value: "individual", label: "Particulier" },
        { value: "business", label: "Entreprise" },
        { value: "wholesale", label: "Grossiste" },
      ],
    },
    { name: "phone", label: "Téléphone (optionnel)", placeholder: "+226 ..." },
    { name: "address", label: "Adresse (optionnel)" },
    { name: "notes", label: "Notes (optionnel)", type: "textarea" },
  ];

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client(s)`}
        action={
          <FormDialog title="Ajouter un client" fields={fields} onSubmit={(v) => insert.mutateAsync(v)} trigger={<Button>Ajouter</Button>} />
        }
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 md:p-8 lg:grid-cols-3">
        {clients.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-50" /> Aucun client. Les ventes existantes restent
            utilisables sans fiche client (champ texte libre).
          </div>
        )}
        {clients.map((c) => {
          const clientSales = sales.filter((s) => s.client_id === c.id);
          const total = clientSales.reduce((s, sale) => s + Number(sale.total), 0);
          return (
            <div key={c.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{TYPE_LABEL[c.type] ?? c.type}</p>
                </div>
              </div>
              {c.phone && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">{clientSales.length} achat(s)</span>
                <span className="font-semibold text-primary">{formatMoney(total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
