import { createFileRoute } from "@tanstack/react-router";
import { Bell, AlertTriangle, Skull, Syringe, Package } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { useStockItems, useLots, useMortalityRecords, lotDeaths } from "@/lib/data";
import { formatNumber, ageInDays } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

interface Alert {
  id: string;
  type: string;
  icon: typeof Bell;
  priority: "high" | "medium" | "low";
  message: string;
}

function NotificationsPage() {
  const { data: stock = [] } = useStockItems();
  const { data: lots = [] } = useLots();
  const { data: mortality = [] } = useMortalityRecords();

  const alerts: Alert[] = [];

  stock.forEach((s) => {
    if (Number(s.alert_threshold) > 0 && Number(s.quantity) <= Number(s.alert_threshold)) {
      alerts.push({ id: `stock-${s.id}`, type: "Stock", icon: Package, priority: "medium", message: `Stock faible : ${s.name} (${formatNumber(Number(s.quantity))} ${s.unit})` });
    }
  });

  lots.filter((l) => l.status === "active").forEach((l) => {
    const rate = l.initial_count > 0 ? (lotDeaths(l.id, mortality) / l.initial_count) * 100 : 0;
    if (rate > 10) alerts.push({ id: `mort-${l.id}`, type: "Mortalité", icon: Skull, priority: "high", message: `Mortalité élevée sur ${l.name} (${rate.toFixed(1)}%)` });
    const age = ageInDays(l.arrival_date);
    if (age >= 40 && age <= 55) alerts.push({ id: `sale-${l.id}`, type: "Vaccin/Vente", icon: Syringe, priority: "low", message: `${l.name} approche l'âge de vente (${age} jours)` });
  });

  const tones: Record<string, string> = {
    high: "bg-destructive/10 text-destructive",
    medium: "bg-warning/10 text-warning",
    low: "bg-primary/10 text-primary",
  };
  const labels: Record<string, string> = { high: "Urgent", medium: "Important", low: "Info" };

  return (
    <>
      <PageHeader title="Notifications" subtitle={`${alerts.length} alerte(s)`} />
      <div className="space-y-3 p-4 md:p-8">
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" /> Aucune alerte pour le moment.
          </div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[a.priority]}`}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{a.type}</span>
                  <Badge variant="secondary" className="text-[10px]">{labels[a.priority]}</Badge>
                </div>
                <p className="text-sm">{a.message}</p>
              </div>
              <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          ))
        )}
      </div>
    </>
  );
}
