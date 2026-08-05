import { createFileRoute, redirect } from "@tanstack/react-router";
import { neon } from "@/integrations/neon/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await neon.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth" });
  },
  component: () => null,
});
