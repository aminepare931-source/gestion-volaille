import { ReactNode, useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
}

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FormDialog({
  title,
  fields,
  onSubmit,
  trigger,
  submitLabel = "Enregistrer",
  initialValues,
}: {
  title: string;
  fields: FieldDef[];
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  trigger?: ReactNode;
  submitLabel?: string;
  initialValues?: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues ?? {});

  function handleOpenChange(o: boolean) {
    if (o) setValues(initialValues ?? {});
    setOpen(o);
  }

  function set(name: string, v: unknown) {
    setValues((p) => ({ ...p, [name]: v }));
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fields) {
        let v = values[f.name] ?? f.defaultValue ?? (f.type === "number" ? 0 : "");
        if (f.type === "number") v = Number(v) || 0;
        payload[f.name] = v;
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        // Hors-ligne : la mutation est mise en attente par React Query et ne se résoudra
        // qu'au retour du réseau (potentiellement bien plus tard) — ne pas bloquer l'UI
        // dessus, sinon le dialogue resterait "en cours" indéfiniment.
        onSubmit(payload).catch((err) => {
          toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi différé");
        });
        toast.info("Hors ligne : sera enregistré automatiquement au retour du réseau");
        setValues(initialValues ?? {});
        setOpen(false);
        return;
      }
      await onSubmit(payload);
      toast.success("Enregistré");
      setValues(initialValues ?? {});
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-4">
          {fields.map((f) => {
            const val = (values[f.name] ?? f.defaultValue ?? "") as string;
            return (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea id={f.name} value={val} onChange={(e) => set(f.name, e.target.value)} required={f.required} />
                ) : f.type === "select" ? (
                  <Select value={val} onValueChange={(v) => set(f.name, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={f.placeholder ?? "Choisir"} />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options?.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={f.name}
                    type={f.type ?? "text"}
                    value={val}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)}
                    required={f.required}
                    step={f.type === "number" ? "any" : undefined}
                  />
                )}
              </div>
            );
          })}
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
