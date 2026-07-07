import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-mark.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("mv-install-dismissed") === "1") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferred) return null;

  const dismiss = () => {
    localStorage.setItem("mv-install-dismissed", "1");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-xl md:bottom-4 md:left-64 md:right-auto md:w-96">
      <button
        onClick={dismiss}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-3">
        <img src={logo} alt="Ma Volaille" width={48} height={48} className="h-12 w-12 rounded-xl" loading="lazy" />
        <div className="pr-6">
          <p className="text-sm font-semibold">Installer Ma Volaille</p>
          <p className="text-xs text-muted-foreground">Accès rapide et hors ligne depuis votre écran d'accueil.</p>
        </div>
      </div>
      <Button
        className="mt-3 w-full gap-2"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setVisible(false);
        }}
      >
        <Download className="h-4 w-4" /> Installer l'application
      </Button>
    </div>
  );
}
