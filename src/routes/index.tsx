import { createFileRoute, redirect } from "@tanstack/react-router";
import { neon } from "@/integrations/neon/client";
import { LandingPage } from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await neon.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
    // Pas de session : on affiche la landing publique (plus de redirect direct vers /auth).
  },
  component: LandingPage,
});
