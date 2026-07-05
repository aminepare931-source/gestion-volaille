import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Bird, Warehouse, Package, X } from "lucide-react";
import { useLots, useBuildings, useStockItems } from "@/lib/data";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  label: string;
  sub: string;
  icon: typeof Bird;
  to: string;
}

export function CommandSearch({ trigger }: { trigger?: "button" | "compact" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: lots = [] } = useLots();
  const { data: buildings = [] } = useBuildings();
  const { data: stock = [] } = useStockItems();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [
      ...lots.map((l) => ({ id: l.id, label: l.name, sub: l.breed || "Lot", icon: Bird, to: `/lots/${l.id}` })),
      ...buildings.map((b) => ({ id: b.id, label: b.name, sub: "Bâtiment", icon: Warehouse, to: "/buildings" })),
      ...stock.map((s) => ({ id: s.id, label: s.name, sub: `Stock · ${s.category}`, icon: Package, to: "/stock" })),
    ];
    const term = q.trim().toLowerCase();
    if (!term) return list.slice(0, 8);
    return list.filter((i) => i.label.toLowerCase().includes(term) || i.sub.toLowerCase().includes(term));
  }, [lots, buildings, stock, q]);

  function go(to: string) {
    setOpen(false);
    setQ("");
    navigate({ to });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
          trigger === "compact" ? "h-9 w-9 justify-center" : "h-9 w-full",
        )}
        aria-label="Recherche rapide"
      >
        <Search className="h-4 w-4 shrink-0" />
        {trigger !== "compact" && (
          <>
            <span className="flex-1 text-left">Rechercher…</span>
            <kbd className="rounded border bg-muted px-1.5 text-[10px]">⌘K</kbd>
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher un lot, un bâtiment, un stock…"
                className="h-12 flex-1 bg-transparent text-sm outline-none"
              />
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Aucun résultat.</p>
              ) : (
                items.map((i) => (
                  <button
                    key={`${i.to}-${i.id}`}
                    onClick={() => go(i.to)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-secondary"
                  >
                    <i.icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1 truncate font-medium">{i.label}</span>
                    <span className="text-xs text-muted-foreground">{i.sub}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
