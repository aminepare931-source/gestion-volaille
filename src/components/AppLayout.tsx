import { ReactNode, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import logo from "@/assets/logo-mark.png";
import {
  LayoutDashboard,
  Bird,
  Warehouse,
  Package,
  Wallet,
  ShoppingCart,
  BarChart3,
  Bell,
  ListChecks,
  Users,
  Stethoscope,
  Wrench,
  Truck,
  Settings,
  LogOut,
  Bot,
  Menu,
} from "lucide-react";
import { neon } from "@/integrations/neon/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { CommandSearch } from "@/components/CommandSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  { to: "/tasks", label: "Tâches", icon: ListChecks },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/health", label: "Santé", icon: Stethoscope },
  { to: "/equipment", label: "Équipements", icon: Wrench },
  { to: "/suppliers", label: "Fournisseurs", icon: Truck },
  { to: "/settings", label: "Réglages", icon: Settings },
];

// Bottom bar shows the 4 most important destinations on mobile; a "Plus" menu holds the rest.
const bottomNav = [nav[0], nav[1], nav[4], nav[6]];
const bottomNavPaths = new Set(bottomNav.map((n) => n.to));
const restNav = nav.filter((n) => !bottomNavPaths.has(n.to) && n.to !== "/settings");
const byPath = (path: string) => restNav.find((n) => n.to === path)!;
const menuGroups = [
  { label: "Élevage", items: [byPath("/buildings"), byPath("/stock"), byPath("/health"), byPath("/equipment")] },
  { label: "Commerce", items: [byPath("/sales"), byPath("/clients"), byPath("/suppliers")] },
  { label: "Suivi", items: [byPath("/analytics"), byPath("/notifications"), byPath("/tasks")] },
  { label: "Compte", items: [nav.find((n) => n.to === "/settings")!] },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await neon.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar py-5 md:flex">
        <div className="flex items-center gap-2 px-5 pb-6">
          <img
            src={logo}
            alt="Élevage+"
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl"
            loading="lazy"
          />
          <span className="text-lg font-bold tracking-tight">Élevage+</span>
        </div>
        <div className="mb-3 flex items-center gap-2 px-4">
          <CommandSearch />
          <ThemeToggle />
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
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
                <n.icon className="h-4.5 w-4.5 shrink-0" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="mx-3 mt-2 flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors"
              aria-label="Plus de menus"
            >
              <Menu className="h-5 w-5" />
              Plus
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 py-4">
              {menuGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {group.items.map((n) => {
                      const active = pathname === n.to || pathname.startsWith(n.to + "/");
                      return (
                        <Link
                          key={n.to}
                          to={n.to}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center text-[11px] font-medium transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-secondary",
                          )}
                        >
                          <n.icon className="h-5 w-5" />
                          {n.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border p-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </SheetContent>
        </Sheet>
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 md:hidden">
          <CommandSearch trigger="compact" />
          <ThemeToggle />
        </div>
        {action}
      </div>
    </div>
  );
}
