import { createFileRoute } from "@tanstack/react-router";
import { Warehouse } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBuildings, useLots, useMortalityRecords, useSales, useInsert, lotAlive } from "@/lib/data";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/buildings")({
  component: BuildingsPage,
});

function BuildingsPage() {
  const { data: buildings = [] } = useBuildings();
  const { data: lots = [] } = useLots();
  const { data: mortality = [] } = useMortalityRecords();
  const { data: sales = [] } = useSales();
  const insert = useInsert("buildings");

  const fields: FieldDef[] = [
    { name: "name", label: "Nom du bâtiment", required: true, placeholder: "Poulailler A" },
    { name: "capacity", label: "Capacité (volailles)", type: "number", required: true },
  ];

  return (
    <>
      <PageHeader
        title="Bâtiments"
        subtitle={`${buildings.length} bâtiment(s)`}
        action={<FormDialog title="Ajouter un bâtiment" fields={fields} onSubmit={(v) => insert.mutateAsync(v)} trigger={<Button>Ajouter</Button>} />}
      />
      <div className="grid gap-3 p-4 md:grid-cols-2 md:p-8 lg:grid-cols-3">
        {buildings.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <Warehouse className="mx-auto mb-2 h-8 w-8 opacity-50" /> Aucun bâtiment.
          </div>
        )}
        {buildings.map((b) => {
          const activeLots = lots.filter((l) => l.building_id === b.id && l.status === "active");
          const pastLots = lots.filter((l) => l.building_id === b.id).length;
          const occupancy = activeLots.reduce((s, l) => s + lotAlive(l, mortality, sales), 0);
          const pct = b.capacity > 0 ? Math.min(100, (occupancy / b.capacity) * 100) : 0;
          return (
            <div key={b.id} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <Warehouse className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{b.name}</h3>
                  <p className="text-xs text-muted-foreground">Capacité {formatNumber(b.capacity)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Occupation</span>
                  <span className="font-medium">{formatNumber(occupancy)} / {formatNumber(b.capacity)}</span>
                </div>
                <Progress value={pct} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{pastLots} lot(s) au total · {activeLots.length} actif(s)</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
