// Config Vite maison — remplace @lovable.dev/vite-tanstack-config.
// Assemble nous-mêmes les plugins que le package Lovable regroupait :
// tailwind, résolution des chemins tsconfig (@/...), TanStack Start,
// build serveur via Nitro (preset "vercel" pour le déploiement sur Vercel),
// React, et le plugin PWA existant.
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  server: {
    host: true,
    port: 8080,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    // Redirige l'entrée serveur bundlée de TanStack Start vers src/server.ts (notre wrapper d'erreurs SSR).
    tanstackStart({ server: { entry: "server" } }),
    // Build-only : Nitro génère le serveur adapté à la plateforme cible. Preset "vercel" pour le déploiement Vercel.
    nitro({ preset: "vercel" }),
    viteReact(),
    VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        manifest: {
          name: "Élevage+ — Gestion d'élevage",
          short_name: "Élevage+",
          description:
            "Gérez vos lots, la croissance, la mortalité, l'alimentation, les finances et les ventes de votre élevage (volailles, bovins, ovins, caprins, porcins).",
          theme_color: "#143a26",
          background_color: "#0f2a1c",
          display: "standalone",
          orientation: "portrait",
          start_url: "/dashboard",
          scope: "/",
          lang: "fr",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }: { request: Request }) =>
                request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html-nav",
                networkTimeoutSeconds: 3,
              },
            },
            {
              urlPattern: ({ url }: { url: URL }) =>
                url.origin === self.location.origin &&
                /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }: { url: URL }) =>
                url.hostname === "api.open-meteo.com",
              handler: "NetworkFirst",
              options: {
                cacheName: "weather",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
              },
            },
          ],
        },
    }),
  ],
});
