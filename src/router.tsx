import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data around long enough to survive an offline session.
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
        staleTime: 1000 * 30,
        retry: 1,
        refetchOnWindowFocus: false,
        networkMode: "offlineFirst",
      },
      mutations: {
        // "online" (défaut) : une mutation lancée hors-ligne est mise en PAUSE plutôt que
        // d'échouer immédiatement, puis rejouée automatiquement au retour du réseau
        // (comportement natif de React Query via l'onlineManager). "offlineFirst" ferait
        // échouer l'écriture dès la première tentative hors-ligne — pas ce qu'on veut ici.
      },
    },
  });

  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
};
