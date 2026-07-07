import { useState } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import authBg from "@/assets/auth-bg.jpg";
import registerBg from "@/assets/register-bg.jpg";
import logo from "@/assets/logo-mark.png";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Connexion — Ma Volaille" },
      { name: "description", content: "Connectez-vous à Ma Volaille pour gérer votre élevage de volailles." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, farm_name: farmName || "Ma Ferme" },
          },
        });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen">
      {/* Visual side */}
      <div className="relative hidden w-1/2 lg:block">
        <img
          src={mode === "login" ? authBg : registerBg}
          alt="Élevage de volailles en Afrique"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <div className="mb-4 flex items-center gap-3">
            <img src={logo} alt="Ma Volaille" width={44} height={44} className="h-11 w-11" />
            <span className="text-2xl font-bold">Ma Volaille</span>
          </div>
          <p className="max-w-md text-lg font-medium leading-snug">
            La gestion moderne de votre élevage de volailles, pensée pour l'Afrique.
          </p>
          <p className="mt-2 max-w-md text-sm text-white/80">
            Lots, mortalité, alimentation, finances et intelligence artificielle — le tout hors ligne.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="relative flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="absolute inset-0 -z-10 lg:hidden">
          <img
            src={mode === "login" ? authBg : registerBg}
            alt="Élevage de volailles"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <img src={logo} alt="Ma Volaille" width={56} height={56} className="h-14 w-14" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              {mode === "login" ? "Bon retour 👋" : "Créez votre compte"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Connectez-vous pour gérer votre élevage"
                : "Commencez à piloter votre élevage en quelques secondes"}
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <form onSubmit={submit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Nom complet</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="farmName">Nom de la ferme</Label>
                    <Input id="farmName" value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="Ma Ferme" />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "..." : mode === "login" ? "Se connecter" : "Créer un compte"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full" size="lg" onClick={google}>
              Continuer avec Google
            </Button>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="font-semibold text-primary hover:underline"
              >
                {mode === "login" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
