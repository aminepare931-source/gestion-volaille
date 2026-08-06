import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Stethoscope, AlertTriangle, Pill } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { useDiseases, useMedications, useInsert } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/health")({
  component: HealthPage,
});

const SEVERITY_COLOR: Record<string, string> = {
  mild: "bg-muted text-muted-foreground",
  moderate: "bg-warning/15 text-warning-foreground",
  severe: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/20 text-destructive",
};
const SEVERITY_LABEL: Record<string, string> = { mild: "Légère", moderate: "Modérée", severe: "Sévère", critical: "Critique" };
const SPECIES_OPTIONS = ["volaille", "bovin", "ovin", "caprin", "porcin"];

function HealthPage() {
  const { data: diseases = [] } = useDiseases();
  const { data: medications = [] } = useMedications();
  const insert = useInsert("medications");
  const [speciesFilter, setSpeciesFilter] = useState<string>("volaille");

  const filtered = diseases.filter((d) => d.species.includes(speciesFilter));

  const medFields: FieldDef[] = [
    { name: "name", label: "Nom du médicament", required: true },
    {
      name: "category",
      label: "Catégorie",
      type: "select",
      defaultValue: "other",
      options: [
        { value: "antibiotic", label: "Antibiotique" },
        { value: "antiparasitic", label: "Antiparasitaire" },
        { value: "vitamin", label: "Vitamine" },
        { value: "vaccine", label: "Vaccin" },
        { value: "other", label: "Autre" },
      ],
    },
    { name: "quantity", label: "Quantité", type: "number", required: true },
    { name: "unit", label: "Unité", placeholder: "flacon, dose, kg...", defaultValue: "unité" },
    { name: "expiry_date", label: "Date de péremption (optionnel)", type: "date" },
  ];

  return (
    <>
      <PageHeader title="Santé" subtitle="Encyclopédie des maladies & stock de médicaments" />
      <div className="space-y-8 p-4 md:p-8">
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Maladies courantes</h2>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {SPECIES_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeciesFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    speciesFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((d) => (
              <div key={d.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{d.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_COLOR[d.severity] ?? ""}`}>
                    {SEVERITY_LABEL[d.severity] ?? d.severity}
                  </span>
                </div>
                {d.contagious && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Contagieuse
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Symptômes : </span>
                  {d.symptoms.join(", ")}
                </p>
                {d.prevention && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Prévention : </span>
                    {d.prevention}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Stock de médicaments</h2>
            <div className="ml-auto">
              <FormDialog title="Ajouter un médicament" fields={medFields} onSubmit={(v) => insert.mutateAsync(v)} trigger={<Button size="sm">Ajouter</Button>} />
            </div>
          </div>
          {medications.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucun médicament en stock.
            </div>
          ) : (
            <div className="space-y-2">
              {medications.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.quantity} {m.unit}
                      {m.expiry_date ? ` · Péremption ${formatDate(m.expiry_date)}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
