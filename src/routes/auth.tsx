import { useState } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { neon } from "@/integrations/neon/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import authBg from "@/assets/auth-bg.jpg";
import registerBg from "@/assets/register-bg.jpg";
import logo from "@/assets/logo-mark.png";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    mode: z.enum(["login", "register"]).optional(),
  }),
  beforeLoad: async () => {
    const { data } = await neon.auth.getSession();
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
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "register">(initialMode ?? "login");
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Connexion par téléphone sans SMS/coût : le numéro devient l'identifiant, transformé
  // en email "fantôme" en coulisses pour rester compatible avec l'auth email/mot de passe
  // de Neon (invisible pour l'utilisateur, qui ne voit et ne tape que son numéro).
  function normalizePhone(raw: string) {
    let digits = raw.replace(/[^0-9]/g, "");
    if (!digits.startsWith("226") && digits.length === 8) digits = "226" + digits; // BF par défaut
    return digits;
  }
  function phoneToSyntheticEmail(raw: string) {
    return `${normalizePhone(raw)}@tel.mavolaille.app`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const identifier = method === "phone" ? phoneToSyntheticEmail(phone) : email;

      if (mode === "login") {
        const { error } = await neon.auth.signInWithPassword({ email: identifier, password });
        if (error) throw error;
      } else {
        const { data, error } = await neon.auth.signUp({
          email: identifier,
          password,
          options: {
            ...(method === "email" ? { emailRedirectTo: window.location.origin } : {}),
            data: { full_name: fullName, farm_name: farmName || "Ma Ferme", phone: method === "phone" ? normalizePhone(phone) : null },
          },
        });
        if (error) throw error;

        // Contrairement à Supabase, Neon n'a pas de trigger côté base pour créer
        // automatiquement le profil + la ferme par défaut à l'inscription : on le fait ici.
        const userId = data.user?.id;
        if (userId) {
          await neon.from("profiles").insert({ id: userId, full_name: fullName, phone: method === "phone" ? normalizePhone(phone) : null });
          await neon.from("farms").insert({ user_id: userId, name: farmName || "Ma Ferme" });
        }
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const { error } = await neon.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast.error("Connexion Google impossible");
    }
    // En cas de succès, Supabase redirige automatiquement vers le provider OAuth.
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
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMethod("phone")}
                className={`rounded-md py-1.5 text-sm font-medium transition-colors ${method === "phone" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                Téléphone
              </button>
              <button
                type="button"
                onClick={() => setMethod("email")}
                className={`rounded-md py-1.5 text-sm font-medium transition-colors ${method === "email" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                Email
              </button>
            </div>

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
              {method === "phone" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="70 12 34 56"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              )}
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
