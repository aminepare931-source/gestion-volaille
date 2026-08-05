import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bird, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useLots,
  useBuildings,
  useMortalityRecords,
  useSales,
  useInsert,
  lotAlive,
  lotDeaths,
} from "@/lib/data";
import { formatNumber, formatDate, ageInDays } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/lots/")({
  component: LotsPage,
});

function LotsPage() {
  const { data: lots = [] } = useLots();
  const { data: buildings = [] } = useBuildings();
  const { data: mortality = [] } = useMortalityRecords();
  const { data: sales = [] } = useSales();
  const insert = useInsert("lots");
  const [filter, setFilter] = useState<"all" | "active" | "finished">("all");

  const SPECIES_OPTIONS = [
    { value: "volaille", label: "Volaille" },
    { value: "bovin", label: "Bovin" },
    { value: "ovin", label: "Ovin" },
    { value: "caprin", label: "Caprin" },
    { value: "porcin", label: "Porcin" },
  ];

  const fields: FieldDef[] = [
    { name: "name", label: "Nom du lot", required: true, placeholder: "Lot #1" },
    {
      name: "species",
      label: "Espèce",
      type: "select",
      defaultValue: "volaille",
      options: SPECIES_OPTIONS,
    },
    { name: "breed", label: "Race", placeholder: "Cobb 500" },
    { name: "arrival_date", label: "Date d'arrivée", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
    { name: "initial_count", label: "Effectif initial", type: "number", required: true },
    { name: "purchase_cost", label: "Coût d'achat total", type: "number" },
    {
      name: "building_id",
      label: "Bâtiment",
      type: "select",
      options: buildings.map((b) => ({ value: b.id, label: b.species ? `${b.name} (${b.species})` : b.name })),
    },
  ];

  const filtered = lots.filter((l) =>
    filter === "all" ? true : filter === "active" ? l.status === "active" : l.status !== "active",
  );

  return (
    <>
      <PageHeader
        title="Lots"
        subtitle={`${lots.length} lot(s)`}
        action={
          <FormDialog
            title="Créer un lot"
            fields={fields}
            onSubmit={async (v) => {
              await insert.mutateAsync({ ...v, building_id: v.building_id || null });
            }}
            trigger={<Button>Créer un lot</Button>}
          />
        }
      />
      <div className="space-y-4 p-4 md:p-8">
        <div className="flex gap-2">
          {(["all", "active", "finished"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
              )}
            >
              {f === "all" ? "Tous" : f === "active" ? "En cours" : "Terminés"}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <Bird className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Aucun lot. Créez votre premier lot pour commencer.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => {
              const alive = lotAlive(l, mortality, sales);
              const deaths = lotDeaths(l.id, mortality);
              const rate = l.initial_count > 0 ? (deaths / l.initial_count) * 100 : 0;
              return (
                <Link
                  key={l.id}
                  to="/lots/$id"
                  params={{ id: l.id }}
                  className="group rounded-2xl border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{l.name}</h3>
                      <p className="text-xs text-muted-foreground">{l.breed || "—"}</p>
                    </div>
                    <Badge variant={l.status === "active" ? "default" : "secondary"}>
                      {l.status === "active" ? "En cours" : "Terminé"}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Arrivée</div>
                      {formatDate(l.arrival_date)}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Âge</div>
                      {ageInDays(l.arrival_date)} j
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Vivants</div>
                      {formatNumber(alive)} / {formatNumber(l.initial_count)}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Mortalité</div>
                      <span className={rate > 10 ? "text-destructive font-medium" : ""}>{rate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end text-xs font-medium text-primary">
                    Ouvrir <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
