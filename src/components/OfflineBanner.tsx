import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-warning px-4 py-1.5 text-center text-xs font-medium text-warning-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      Mode hors ligne — vos données restent consultables, vos actions seront envoyées au retour du réseau.
    </div>
  );
}
