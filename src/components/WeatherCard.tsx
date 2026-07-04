import { AlertTriangle, CloudRain, Wind, Thermometer, MapPin } from "lucide-react";
import { useWeather, weatherLabel, weatherEmoji } from "@/lib/weather";
import { cn } from "@/lib/utils";

export function WeatherCard() {
  const { data: w, isLoading, isError } = useWeather();

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-10 w-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (isError || !w) {
    return (
      <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Météo indisponible. Autorisez la localisation pour activer les alertes météo.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {w.place}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-4xl">{weatherEmoji(w.code)}</span>
            <div>
              <div className="text-3xl font-bold leading-none">{w.temperature}°C</div>
              <div className="text-xs text-muted-foreground">{weatherLabel(w.code)}</div>
            </div>
          </div>
        </div>
        <div className="space-y-1 text-right text-xs text-muted-foreground">
          <div className="flex items-center justify-end gap-1"><Thermometer className="h-3.5 w-3.5" /> {w.tempMin}° / {w.tempMax}°</div>
          <div className="flex items-center justify-end gap-1"><CloudRain className="h-3.5 w-3.5" /> {w.rainProbToday}% pluie</div>
          <div className="flex items-center justify-end gap-1"><Wind className="h-3.5 w-3.5" /> {w.windMaxToday} km/h</div>
        </div>
      </div>

      {w.alerts.length > 0 && (
        <div className="mt-3 space-y-2">
          {w.alerts.map((a, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                a.level === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning",
              )}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
