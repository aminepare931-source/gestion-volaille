import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { neon } from "@/integrations/neon/client";
import { AppLayout } from "@/components/AppLayout";

// Le check "profil + ferme existent" ne doit se faire qu'une fois par session,
// pas à chaque navigation — sinon chaque changement de page attend 2 allers-retours
// réseau pour rien la plupart du temps.
let profileChecked = false;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession() lit la session en local (rapide, pas d'appel réseau) — suffisant
    // pour un garde de navigation côté client ; la vraie sécurité vient de la RLS
    // côté base, qui revérifie systématiquement le token à chaque requête de données.
    const { data } = await neon.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const user = data.session.user;

    if (!profileChecked) {
      // Filet de sécurité : garantit qu'un profil + une ferme existent, même pour
      // les connexions Google (pas de signUp() classique dans ce cas).
      const { data: profile } = await neon.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (!profile) {
        const fullName = (user.user_metadata as { full_name?: string } | null)?.full_name ?? "";
        await neon.from("profiles").insert({ id: user.id, full_name: fullName });
        await neon.from("farms").insert({ user_id: user.id, name: "Ma Ferme" });
      }
      profileChecked = true;
    }

    return { user };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
