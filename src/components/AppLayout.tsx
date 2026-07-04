import { ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bird,
  Warehouse,
  Package,
  Wallet,
  ShoppingCart,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Feather,
  Bot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { to: "/lots", label: "Lots", icon: Bird },
  { to: "/buildings", label: "Bâtiments", icon: Warehouse },
  { to: "/stock", label: "Stock", icon: Package },
  { to: "/finance", label: "Finances", icon: Wallet },
  { to: "/sales", label: "Ventes", icon: ShoppingCart },
  { to: "/assistant", label: "Assistant IA", icon: Bot },
  { to: "/analytics", label: "Analyses", icon: BarChart3 },
  { to: "/notifications", label: "Alertes", icon: Bell },
  { to: "/settings", label: "Réglages", icon: Settings },
];

// Bottom bar shows the 5 most important destinations on mobile.
const bottomNav = [nav[0], nav[1], nav[3], nav[4], nav[5]];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar px-3 py-5 md:flex">
        <div className="flex items-center gap-2 px-2 pb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Feather className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">Ma Volaille</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => {
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <n.icon className="h-4.5 w-4.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4.5 w-4.5" /> Déconnexion
        </button>
      </aside>

      {/* Main */}
      <main className="pb-24 md:ml-60 md:pb-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t bg-card/95 backdrop-blur md:hidden">
        {bottomNav.map((n) => {
          const active = pathname === n.to || pathname.startsWith(n.to + "/");
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <n.icon className={cn("h-5 w-5", active && "scale-110")} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b bg-card/50 px-4 py-5 md:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
