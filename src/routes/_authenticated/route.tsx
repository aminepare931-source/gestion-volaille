import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { neon } from "@/integrations/neon/client";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await neon.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Filet de sécurité : garantit qu'un profil + une ferme existent, même pour
    // les connexions Google (pas de signUp() classique dans ce cas).
    const { data: profile } = await neon.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    if (!profile) {
      const fullName = (data.user.user_metadata as { full_name?: string } | null)?.full_name ?? "";
      await neon.from("profiles").insert({ id: data.user.id, full_name: fullName });
      await neon.from("farms").insert({ user_id: data.user.id, name: "Ma Ferme" });
    }

    return { user: data.user };
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
