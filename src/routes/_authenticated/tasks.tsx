import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Bot } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks, useLots, useInsert, useUpdate, useDelete } from "@/lib/data";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

const PRIORITY_LABEL: Record<string, string> = { low: "Basse", medium: "Moyenne", high: "Haute", urgent: "Urgente" };
const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-warning/15 text-warning-foreground",
  urgent: "bg-destructive/15 text-destructive",
};

function TasksPage() {
  const { data: tasks = [] } = useTasks();
  const { data: lots = [] } = useLots();
  const insert = useInsert("tasks");
  const update = useUpdate("tasks");
  const del = useDelete("tasks");

  const pending = tasks.filter((t) => t.status === "pending").sort((a, b) => {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
  });
  const done = tasks.filter((t) => t.status === "completed");

  const fields: FieldDef[] = [
    { name: "title", label: "Titre", required: true, placeholder: "Vacciner le lot X" },
    { name: "description", label: "Détails (optionnel)", type: "textarea" },
    {
      name: "priority",
      label: "Priorité",
      type: "select",
      defaultValue: "medium",
      options: [
        { value: "low", label: "Basse" },
        { value: "medium", label: "Moyenne" },
        { value: "high", label: "Haute" },
        { value: "urgent", label: "Urgente" },
      ],
    },
    { name: "due_date", label: "Échéance (optionnel)", type: "date" },
    {
      name: "lot_id",
      label: "Lot concerné (optionnel)",
      type: "select",
      options: lots.map((l) => ({ value: l.id, label: l.name })),
    },
  ];

  async function toggleDone(id: string, currentlyDone: boolean) {
    try {
      await update.mutateAsync({
        id,
        values: currentlyDone
          ? { status: "pending", completed_at: null }
          : { status: "completed", completed_at: new Date().toISOString() },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <>
      <PageHeader
        title="Tâches & rappels"
        subtitle={`${pending.length} en cours`}
        action={
          <FormDialog
            title="Nouvelle tâche"
            fields={fields}
            onSubmit={(v) => insert.mutateAsync(v)}
            trigger={<Button>Ajouter</Button>}
          />
        }
      />
      <div className="space-y-6 p-4 md:p-8">
        {pending.length === 0 && done.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <ListChecks className="mx-auto mb-2 h-8 w-8 opacity-50" /> Aucune tâche. Ajoutez-en une, ou demandez au
            Coach Élevage de vous en suggérer.
          </div>
        )}

        {pending.length > 0 && (
          <div className="space-y-2">
            {pending.map((t) => {
              const lot = lots.find((l) => l.id === t.lot_id);
              return (
                <div key={t.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
                  <Checkbox checked={false} onCheckedChange={() => toggleDone(t.id, false)} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{t.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLOR[t.priority] ?? ""}`}>
                        {PRIORITY_LABEL[t.priority] ?? t.priority}
                      </span>
                      {t.created_by === "ia" && (
                        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                          <Bot className="h-3 w-3" /> Suggéré par l'IA
                        </span>
                      )}
                    </div>
                    {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lot ? lot.name : ""}
                      {lot && t.due_date ? " · " : ""}
                      {t.due_date ? `Échéance ${t.due_date}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => del.mutateAsync(t.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Supprimer
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {done.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Terminées</p>
            <div className="space-y-2 opacity-60">
              {done.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <Checkbox checked={true} onCheckedChange={() => toggleDone(t.id, true)} />
                  <p className="flex-1 text-sm line-through">{t.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
