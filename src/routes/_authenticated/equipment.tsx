import { createFileRoute } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { useEquipment, useBuildings, useInsert } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/equipment")({
  component: EquipmentPage,
});

const STATUS_LABEL: Record<string, string> = { operational: "Opérationnel", maintenance: "En maintenance", broken: "En panne", retired: "Retiré" };
const STATUS_COLOR: Record<string, string> = {
  operational: "bg-primary/10 text-primary",
  maintenance: "bg-warning/15 text-warning-foreground",
  broken: "bg-destructive/15 text-destructive",
  retired: "bg-muted text-muted-foreground",
};

function EquipmentPage() {
  const { data: equipment = [] } = useEquipment();
  const { data: buildings = [] } = useBuildings();
  const insert = useInsert("equipment");

  const fields: FieldDef[] = [
    { name: "name", label: "Nom", required: true, placeholder: "Éleveuse gaz, mangeoire automatique..." },
    {
      name: "category",
      label: "Catégorie",
      type: "select",
      defaultValue: "general",
      options: [
        { value: "heating", label: "Chauffage" },
        { value: "ventilation", label: "Ventilation" },
        { value: "feeding", label: "Alimentation" },
        { value: "watering", label: "Abreuvement" },
        { value: "cleaning", label: "Nettoyage" },
        { value: "general", label: "Général" },
      ],
    },
    { name: "brand", label: "Marque (optionnel)" },
    { name: "model", label: "Modèle (optionnel)" },
    { name: "purchase_price", label: "Prix d'achat (optionnel)", type: "number" },
    { name: "building_id", label: "Bâtiment (optionnel)", type: "select", options: buildings.map((b) => ({ value: b.id, label: b.name })) },
  ];

  return (
    <>
      <PageHeader
        title="Équipements"
        subtitle={`${equipment.length} équipement(s)`}
        action={<FormDialog title="Ajouter un équipement" fields={fields} onSubmit={(v) => insert.mutateAsync(v)} trigger={<Button>Ajouter</Button>} />}
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 md:p-8 lg:grid-cols-3">
        {equipment.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <Wrench className="mx-auto mb-2 h-8 w-8 opacity-50" /> Aucun équipement enregistré.
          </div>
        )}
        {equipment.map((e) => {
          const building = buildings.find((b) => b.id === e.building_id);
          return (
            <div key={e.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{e.name}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[e.status] ?? ""}`}>
                  {STATUS_LABEL[e.status] ?? e.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {[e.brand, e.model].filter(Boolean).join(" · ") || "—"}
              </p>
              {building && <p className="mt-1 text-xs text-muted-foreground">{building.name}</p>}
            </div>
          );
        })}
      </div>
    </>
  );
}
