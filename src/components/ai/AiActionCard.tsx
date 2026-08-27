import { useState } from "react";
import { Check, X, Pencil, Loader2, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ActionStatus = "pending" | "approving" | "done" | "rejected" | "error";

export interface ActionState {
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
  status: ActionStatus;
  error?: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nom",
  title: "Titre",
  species: "Espèce",
  breed: "Race",
  initial_count: "Effectif",
  purchase_cost: "Coût d'achat",
  arrival_date: "Date d'arrivée",
  feed_type: "Type d'aliment",
  quantity_kg: "Quantité (kg)",
  cost: "Coût",
  record_date: "Date",
  count: "Nombre",
  cause: "Cause",
  avg_weight: "Poids moyen (kg)",
  quantity: "Quantité",
  unit_price: "Prix unitaire",
  amount: "Montant",
  category: "Catégorie",
  description: "Description",
  type: "Type",
  priority: "Priorité",
  due_date: "Échéance",
  phone: "Téléphone",
  address: "Adresse",
  notes: "Notes",
  capacity: "Capacité",
  building_type: "Type de bâtiment",
  unit: "Unité",
  alert_threshold: "Seuil d'alerte",
  unit_cost: "Coût unitaire",
  expiry_date: "Date de péremption",
  delta: "Variation",
};

function labelFor(key: string) {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// Champs jamais proposés à l'édition : identifiants internes (pas de sélecteur
// de relation en v1) et objets imbriqués (ex: "values" de update_record).
function isEditable(key: string, value: unknown) {
  if (key === "id" || key === "user_id") return false;
  if (key.endsWith("_id")) return false;
  if (value !== null && typeof value === "object") return false;
  return true;
}

export function AiActionCard({
  action,
  onApprove,
  onReject,
  onChange,
}: {
  action: ActionState;
  onApprove: () => void;
  onReject: () => void;
  onChange: (payload: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const editableEntries = Object.entries(action.payload).filter(([k, v]) => isEditable(k, v));

  return (
    <div className="rounded-xl border bg-card p-3.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{action.summary}</p>
        {action.status === "done" && <Check className="h-4 w-4 shrink-0 text-primary" />}
        {action.status === "rejected" && <X className="h-4 w-4 shrink-0 text-muted-foreground" />}
        {action.status === "error" && <CircleAlert className="h-4 w-4 shrink-0 text-destructive" />}
      </div>

      {action.status === "error" && <p className="mt-1 text-xs text-destructive">{action.error}</p>}
      {action.status === "rejected" && <p className="mt-1 text-xs text-muted-foreground">Refusée.</p>}
      {action.status === "done" && <p className="mt-1 text-xs text-muted-foreground">Enregistré.</p>}

      {editing && action.status === "pending" && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
          {editableEntries.map(([key, value]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{labelFor(key)}</Label>
              <Input
                className="h-8 text-xs"
                type={typeof value === "number" ? "number" : key.includes("date") ? "date" : "text"}
                value={value === null || value === undefined ? "" : String(value)}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next = typeof value === "number" ? Number(raw) || 0 : raw;
                  onChange({ ...action.payload, [key]: next });
                }}
              />
            </div>
          ))}
        </div>
      )}

      {action.status === "pending" && (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={onApprove} className="h-8">
            <Check className="mr-1 h-3.5 w-3.5" /> Approuver
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)} className="h-8">
            <Pencil className="mr-1 h-3.5 w-3.5" /> Modifier
          </Button>
          <Button size="sm" variant="ghost" onClick={onReject} className="h-8 text-muted-foreground">
            <X className="mr-1 h-3.5 w-3.5" /> Refuser
          </Button>
        </div>
      )}
      {action.status === "approving" && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…
        </div>
      )}
    </div>
  );
}
