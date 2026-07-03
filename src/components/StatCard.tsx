import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  sub,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "accent" | "success" | "destructive";
  sub?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-card",
    primary: "bg-primary text-primary-foreground",
    accent: "bg-accent text-accent-foreground",
    success: "bg-success text-success-foreground",
    destructive: "bg-destructive text-destructive-foreground",
  };
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", tones[tone])}>
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium", tone === "default" ? "text-muted-foreground" : "opacity-80")}>
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 opacity-70" />}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className={cn("mt-0.5 text-xs", tone === "default" ? "text-muted-foreground" : "opacity-80")}>{sub}</div>}
    </div>
  );
}
