import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, formatNumber, formatDate } from "@/lib/format";

interface LotPdfData {
  lotName: string;
  breed: string;
  farmName: string;
  currency: string;
  arrivalDate: string;
  ageDays: number;
  initialCount: number;
  alive: number;
  deaths: number;
  sold: number;
  feedKg: number;
  totalCost: number;
  revenue: number;
  profit: number;
  costPerBird: number;
  feed: { date: string; type: string; kg: number; cost: number }[];
  health: { date: string; name: string; type: string; cost: number }[];
  mortality: { date: string; count: number; cause: string }[];
  sales: { date: string; qty: number; client: string; total: number }[];
}

export function exportLotPdf(d: LotPdfData) {
  const doc = new jsPDF();
  const cur = d.currency;
  doc.setFontSize(18);
  doc.text(d.farmName, 14, 18);
  doc.setFontSize(14);
  doc.text(`Fiche du lot : ${d.lotName}`, 14, 27);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `${d.breed || "—"} · Arrivée ${formatDate(d.arrivalDate)} · ${d.ageDays} jours`,
    14,
    34,
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 40,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Poussins initiaux", formatNumber(d.initialCount)],
      ["Vivants", formatNumber(d.alive)],
      ["Morts", formatNumber(d.deaths)],
      ["Vendus", formatNumber(d.sold)],
      ["Aliment total", `${formatNumber(d.feedKg)} kg`],
      ["Coût total", formatMoney(d.totalCost, cur)],
      ["Revenus", formatMoney(d.revenue, cur)],
      ["Bénéfice net", formatMoney(d.profit, cur)],
      ["Coût / poulet", formatMoney(d.costPerBird, cur)],
    ],
    theme: "striped",
    headStyles: { fillColor: [34, 139, 34] },
  });

  const y = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (d.feed.length) {
    autoTable(doc, {
      startY: y(),
      head: [["Alimentation", "Type", "Kg", "Coût"]],
      body: d.feed.map((f) => [formatDate(f.date), f.type, formatNumber(f.kg), formatMoney(f.cost, cur)]),
      headStyles: { fillColor: [34, 139, 34] },
    });
  }
  if (d.health.length) {
    autoTable(doc, {
      startY: y(),
      head: [["Santé", "Nom", "Type", "Coût"]],
      body: d.health.map((h) => [formatDate(h.date), h.name, h.type, formatMoney(h.cost, cur)]),
      headStyles: { fillColor: [34, 139, 34] },
    });
  }
  if (d.mortality.length) {
    autoTable(doc, {
      startY: y(),
      head: [["Mortalité", "Nombre", "Cause"]],
      body: d.mortality.map((m) => [formatDate(m.date), formatNumber(m.count), m.cause]),
      headStyles: { fillColor: [200, 60, 60] },
    });
  }
  if (d.sales.length) {
    autoTable(doc, {
      startY: y(),
      head: [["Ventes", "Quantité", "Client", "Total"]],
      body: d.sales.map((s) => [formatDate(s.date), formatNumber(s.qty), s.client, formatMoney(s.total, cur)]),
      headStyles: { fillColor: [34, 139, 34] },
    });
  }

  doc.save(`lot-${d.lotName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
