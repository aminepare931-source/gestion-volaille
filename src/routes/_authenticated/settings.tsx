import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { User, Building2, LogOut, Palette } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useFarm, useUpdate } from "@/lib/data";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const CURRENCIES = ["FCFA", "EUR", "USD", "MAD", "NGN", "GHS", "XOF"];

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { theme } = useTheme();
  const { data: profile } = useProfile();
  const { data: farm } = useFarm();
  const updateProfile = useUpdate("profiles", ["profile"]);
  const updateFarm = useUpdate("farms", ["farm"]);

  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [currency, setCurrency] = useState("FCFA");

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
  }, [profile]);
  useEffect(() => {
    if (farm) {
      setFarmName(farm.name);
      setCurrency(farm.currency);
    }
  }, [farm]);

  async function saveProfile() {
    if (!profile) return;
    await updateProfile.mutateAsync({ id: profile.id, values: { full_name: fullName } });
    toast.success("Profil mis à jour");
  }
  async function saveFarm() {
    if (!farm) return;
    await updateFarm.mutateAsync({ id: farm.id, values: { name: farmName, currency } });
    toast.success("Ferme mise à jour");
  }
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <PageHeader title="Réglages" subtitle="Profil, ferme et préférences" />
      <div className="max-w-lg space-y-4 p-4 md:p-8">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><User className="h-4 w-4" /> Profil</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom complet</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <Button onClick={saveProfile} size="sm">Enregistrer</Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" /> Ferme</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="farm">Nom de la ferme</Label>
              <Input id="farm" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cur">Devise</Label>
              <select id="cur" value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Button onClick={saveFarm} size="sm">Enregistrer</Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Palette className="h-4 w-4" /> Apparence</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Thème {theme === "dark" ? "sombre" : "clair"}</p>
              <p className="text-xs text-muted-foreground">Basculer entre le mode clair et sombre</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium">Couleur d'accent</p>
            <p className="mb-3 text-xs text-muted-foreground">Choisissez la palette de l'application</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${
                    palette === p.id ? "border-primary ring-2 ring-primary/40" : "border-border hover:bg-secondary"
                  }`}
                  aria-label={p.label}
                >
                  <span className="h-7 w-7 rounded-full" style={{ background: p.swatch }} />
                  <span className="text-[11px] font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>




        <Button variant="destructive" onClick={signOut} className="w-full">
          <LogOut className="mr-1 h-4 w-4" /> Déconnexion
        </Button>
      </div>
    </>
  );
}
