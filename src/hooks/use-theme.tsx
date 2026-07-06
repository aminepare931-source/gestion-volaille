import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
export type Palette = "foret" | "ocean" | "terre" | "prune" | "corail" | "or";

export const PALETTES: { id: Palette; label: string; swatch: string }[] = [
  { id: "foret", label: "Forêt", swatch: "oklch(0.52 0.13 150)" },
  { id: "ocean", label: "Océan", swatch: "oklch(0.55 0.14 230)" },
  { id: "terre", label: "Terre", swatch: "oklch(0.55 0.14 45)" },
  { id: "prune", label: "Prune", swatch: "oklch(0.5 0.16 310)" },
  { id: "corail", label: "Corail", swatch: "oklch(0.62 0.19 20)" },
  { id: "or", label: "Or", swatch: "oklch(0.72 0.15 85)" },
];

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
  palette: Palette;
  setPalette: (p: Palette) => void;
};

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  toggle: () => {},
  palette: "foret",
  setPalette: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [palette, setPaletteState] = useState<Palette>("foret");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem("mv-theme")) as Theme | null;
    const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setTheme(stored ?? (prefersDark ? "dark" : "light"));
    const storedPalette = (typeof localStorage !== "undefined" && localStorage.getItem("mv-palette")) as Palette | null;
    if (storedPalette) setPaletteState(storedPalette);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    if (typeof localStorage !== "undefined") localStorage.setItem("mv-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-palette", palette);
    if (typeof localStorage !== "undefined") localStorage.setItem("mv-palette", palette);
  }, [palette]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const setPalette = (p: Palette) => setPaletteState(p);

  return (
    <ThemeContext.Provider value={{ theme, toggle, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
