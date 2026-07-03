export function formatMoney(n: number, currency = "FCFA"): string {
  const v = Math.round((n || 0) * 100) / 100;
  return `${v.toLocaleString("fr-FR")} ${currency}`;
}

export function formatNumber(n: number): string {
  return (n || 0).toLocaleString("fr-FR");
}

export function ageInDays(dateStr: string): number {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
