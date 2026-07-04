import { useQuery } from "@tanstack/react-query";

export type Weather = {
  temperature: number;
  windSpeed: number; // km/h
  precipitation: number; // mm
  rainProbToday: number; // %
  windMaxToday: number; // km/h
  tempMax: number;
  tempMin: number;
  code: number;
  place: string;
  alerts: WeatherAlert[];
};

export type WeatherAlert = {
  level: "danger" | "warning";
  message: string;
};

// WMO weather interpretation codes -> label (French)
export function weatherLabel(code: number): string {
  const map: Record<number, string> = {
    0: "Ciel dégagé",
    1: "Peu nuageux",
    2: "Partiellement nuageux",
    3: "Couvert",
    45: "Brouillard",
    48: "Brouillard givrant",
    51: "Bruine légère",
    53: "Bruine",
    55: "Bruine forte",
    61: "Pluie faible",
    63: "Pluie",
    65: "Forte pluie",
    71: "Neige faible",
    80: "Averses",
    81: "Averses fortes",
    82: "Averses violentes",
    95: "Orage",
    96: "Orage avec grêle",
    99: "Orage violent avec grêle",
  };
  return map[code] ?? "—";
}

export function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 65) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

function buildAlerts(w: Omit<Weather, "alerts">): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  if (w.rainProbToday >= 70 || [65, 82, 95, 96, 99].includes(w.code)) {
    alerts.push({
      level: "danger",
      message: "Forte pluie / orage attendu — protégez les poussins, vérifiez les toitures et le drainage du poulailler.",
    });
  } else if (w.rainProbToday >= 40) {
    alerts.push({ level: "warning", message: "Pluie probable aujourd'hui — surveillez l'humidité et la litière." });
  }
  if (w.windMaxToday >= 45) {
    alerts.push({
      level: "danger",
      message: "Vent fort prévu — sécurisez les abris, fermez les côtés exposés du poulailler.",
    });
  }
  if (w.tempMax >= 35) {
    alerts.push({
      level: "warning",
      message: "Forte chaleur — assurez de l'eau fraîche en continu et une bonne ventilation.",
    });
  }
  if (w.tempMin <= 12) {
    alerts.push({ level: "warning", message: "Nuit fraîche — pensez au chauffage pour les jeunes poussins." });
  }
  return alerts;
}

async function reverseName(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&language=fr`,
    );
    const j = await r.json();
    return j?.results?.[0]?.name ?? "Votre position";
  } catch {
    return "Votre position";
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Géolocalisation indisponible"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 600000,
    });
  });
}

export function useWeather() {
  return useQuery({
    queryKey: ["weather"],
    staleTime: 15 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<Weather> => {
      let lat = 6.37; // fallback: Lomé / Afrique de l'Ouest
      let lon = 2.39;
      let place = "Position par défaut";
      try {
        const pos = await getPosition();
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        place = await reverseName(lat, lon);
      } catch {
        // keep fallback
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Météo indisponible");
      const d = await res.json();

      const base = {
        temperature: Math.round(d.current.temperature_2m),
        windSpeed: Math.round(d.current.wind_speed_10m),
        precipitation: d.current.precipitation ?? 0,
        rainProbToday: d.daily.precipitation_probability_max?.[0] ?? 0,
        windMaxToday: Math.round(d.daily.wind_speed_10m_max?.[0] ?? 0),
        tempMax: Math.round(d.daily.temperature_2m_max?.[0] ?? 0),
        tempMin: Math.round(d.daily.temperature_2m_min?.[0] ?? 0),
        code: d.current.weather_code ?? 0,
        place,
      };
      return { ...base, alerts: buildAlerts(base) };
    },
  });
}
