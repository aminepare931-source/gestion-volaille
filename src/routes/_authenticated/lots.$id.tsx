import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bird,
  Skull,
  Scale,
  Wheat,
  Syringe,
  Wallet,
  ShoppingCart,
  Trash2,
  Pencil,
  FileDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { FormDialog, FieldDef } from "@/components/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useLot,
  useFarm,
  useBuildings,
  useFeedRecords,
  useHealthRecords,
  useMortalityRecords,
  useWeightRecords,
  useSales,
  useTransactions,
  useStockItems,
  useInsert,
  useUpdate,
  useDelete,
  lotAlive,
  lotDeaths,
  lotSold,
} from "@/lib/data";
import { formatMoney, formatNumber, formatDate, ageInDays } from "@/lib/format";
import { exportLotPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_authenticated/lots/$id")({
  component: LotDetail,
});

const today = () => new Date().toISOString().slice(0, 10);

function LotDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data: lot } = useLot(id);
  const { data: farm } = useFarm();
  const { data: buildings = [] } = useBuildings();
  const { data: feed = [] } = useFeedRecords();
  const { data: health = [] } = useHealthRecords();
  const { data: mortality = [] } = useMortalityRecords();
  const { data: weights = [] } = useWeightRecords();
  const { data: sales = [] } = useSales();
  const { data: transactions = [] } = useTransactions();
  const { data: stock = [] } = useStockItems();

  const cur = farm?.currency ?? "FCFA";
  const insertFeed = useInsert("feed_records", ["lots"]);
  const insertHealth = useInsert("health_records");
  const insertMort = useInsert("mortality_records");
  const insertWeight = useInsert("weight_records", ["lots"]);
  const insertSale = useInsert("sales", ["lots"]);
  const updateLot = useUpdate("lots");
  const updateStock = useUpdate("stock_items");
  const delMort = useDelete("mortality_records");

  if (!lot) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Lot introuvable. <Link to="/lots" className="text-primary underline">Retour</Link>
      </div>
    );
  }

  const lotFeed = feed.filter((f) => f.lot_id === id);
  const lotHealth = health.filter((h) => h.lot_id === id);
  const lotMort = mortality.filter((m) => m.lot_id === id);
  const lotWeights = weights.filter((w) => w.lot_id === id);
  const lotSales = sales.filter((s) => s.lot_id === id);

  const deaths = lotDeaths(id, mortality);
  const alive = lotAlive(lot, mortality, sales);
  const sold = lotSold(id, sales);
  const feedCost = lotFeed.reduce((s, f) => s + Number(f.cost), 0);
  const feedKg = lotFeed.reduce((s, f) => s + Number(f.quantity_kg), 0);
  const healthCost = lotHealth.reduce((s, h) => s + Number(h.cost), 0);
  const lotTx = transactions.filter((t) => t.lot_id === id);
  const txExpense = lotTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const txIncome = lotTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalCost = Number(lot.purchase_cost) + feedCost + healthCost + txExpense;
  const revenue = lotSales.reduce((s, x) => s + Number(x.total), 0) + txIncome;
  const profit = revenue - totalCost;
  const costPerBird = sold > 0 ? totalCost / sold : 0;

  const growthData = [...lotWeights]
    .sort((a, b) => a.record_date.localeCompare(b.record_date))
    .map((w) => ({ date: formatDate(w.record_date), poids: Number(w.avg_weight) }));

  const feedFields: FieldDef[] = [
    { name: "feed_type", label: "Type d'aliment", required: true, placeholder: "Démarrage" },
    { name: "quantity_kg", label: "Quantité (kg)", type: "number", required: true },
    { name: "cost", label: "Coût", type: "number" },
    { name: "record_date", label: "Date", type: "date", defaultValue: today() },
  ];
  const healthFields: FieldDef[] = [
    { name: "type", label: "Type", type: "select", options: [{ value: "vaccine", label: "Vaccin" }, { value: "treatment", label: "Traitement" }] },
    { name: "name", label: "Nom", required: true },
    { name: "cost", label: "Coût", type: "number" },
    { name: "notes", label: "Notes", type: "textarea" },
    { name: "record_date", label: "Date", type: "date", defaultValue: today() },
  ];
  const mortFields: FieldDef[] = [
    { name: "count", label: "Nombre de morts", type: "number", required: true },
    { name: "cause", label: "Cause", placeholder: "Maladie, chaleur..." },
    { name: "record_date", label: "Date", type: "date", defaultValue: today() },
  ];
  const weightFields: FieldDef[] = [
    { name: "avg_weight", label: "Poids moyen (g)", type: "number", required: true },
    { name: "record_date", label: "Date", type: "date", defaultValue: today() },
  ];
  const saleFields: FieldDef[] = [
    { name: "quantity", label: "Nombre de volailles vendues", type: "number", required: true },
    {
      name: "mode",
      label: "Mode de vente",
      type: "select",
      defaultValue: "tete",
      options: [
        { value: "tete", label: "Prix à la tête" },
        { value: "kg", label: "Prix au kilo (poids)" },
      ],
    },
    { name: "total_weight", label: "Poids total (kg) — si vente au kilo", type: "number" },
    { name: "unit_price", label: "Prix (par tête ou par kg)", type: "number", required: true },
    { name: "client", label: "Client" },
    { name: "record_date", label: "Date", type: "date", defaultValue: today() },
  ];

  const editFields: FieldDef[] = [
    { name: "name", label: "Nom du lot", required: true, defaultValue: lot.name },
    { name: "breed", label: "Race", defaultValue: lot.breed ?? "" },
    { name: "arrival_date", label: "Date d'arrivée", type: "date", defaultValue: lot.arrival_date },
    { name: "initial_count", label: "Nombre de poussins", type: "number", required: true, defaultValue: lot.initial_count },
    { name: "purchase_cost", label: "Coût d'achat total", type: "number", defaultValue: Number(lot.purchase_cost) },
    {
      name: "building_id",
      label: "Bâtiment",
      type: "select",
      defaultValue: lot.building_id ?? "",
      options: buildings.map((b) => ({ value: b.id, label: b.name })),
    },
  ];

  const l = lot;
  function buildPdf() {
    exportLotPdf({
      lotName: l.name,
      breed: l.breed ?? "",
      farmName: farm?.name ?? "Ma Volaille",
      currency: cur,
      arrivalDate: l.arrival_date,
      ageDays: ageInDays(l.arrival_date),
      initialCount: l.initial_count,
      alive,
      deaths,
      sold,
      feedKg,
      totalCost,
      revenue,
      profit,
      costPerBird,
      feed: lotFeed.map((f) => ({ date: f.record_date, type: f.feed_type, kg: Number(f.quantity_kg), cost: Number(f.cost) })),
      health: lotHealth.map((h) => ({ date: h.record_date, name: h.name, type: h.type === "vaccine" ? "Vaccin" : "Traitement", cost: Number(h.cost) })),
      mortality: lotMort.map((m) => ({ date: m.record_date, count: m.count, cause: m.cause || "—" })),
      sales: lotSales.map((s) => ({ date: s.record_date, qty: s.quantity, client: s.client || "—", total: Number(s.total) })),
    });
  }

  return (
    <>
      <PageHeader
        title={lot.name}
        subtitle={`${lot.breed || "—"} · ${ageInDays(lot.arrival_date)} jours`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={lot.status === "active" ? "default" : "secondary"}>
              {lot.status === "active" ? "En cours" : "Terminé"}
            </Badge>
            <FormDialog
              title="Modifier le lot"
              fields={editFields}
              submitLabel="Enregistrer les modifications"
              trigger={<Button variant="outline" size="sm"><Pencil className="mr-1 h-4 w-4" /> Modifier</Button>}
              onSubmit={async (v) =>
                await updateLot.mutateAsync({ id, values: { ...v, building_id: v.building_id || null } })
              }
            />
            <Button variant="outline" size="sm" onClick={buildPdf}>
              <FileDown className="mr-1 h-4 w-4" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateLot.mutate({ id, values: { status: lot.status === "active" ? "finished" : "active" } })
              }
            >
              {lot.status === "active" ? "Clôturer" : "Rouvrir"}
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-4 md:p-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/lots">
            <ArrowLeft className="mr-1 h-4 w-4" /> Tous les lots
          </Link>
        </Button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Poussins initiaux" value={formatNumber(lot.initial_count)} icon={Bird} />
          <StatCard label="Vivants" value={formatNumber(alive)} icon={Bird} tone="primary" />
          <StatCard label="Morts" value={formatNumber(deaths)} icon={Skull} tone={deaths > lot.initial_count * 0.1 ? "destructive" : "default"} />
          <StatCard label="Bâtiment" value={buildings.find((b) => b.id === lot.building_id)?.name ?? "—"} />
          <StatCard label="Aliment total" value={`${formatNumber(feedKg)} kg`} icon={Wheat} />
          <StatCard label="Coût total" value={formatMoney(totalCost, cur)} icon={Wallet} />
          <StatCard label="Revenus" value={formatMoney(revenue, cur)} icon={ShoppingCart} />
          <StatCard label="Bénéfice net" value={formatMoney(profit, cur)} tone={profit >= 0 ? "success" : "destructive"} sub={`Coût/poulet ${formatMoney(costPerBird, cur)}`} />
        </div>

        {/* Growth chart */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Scale className="h-4 w-4" /> Croissance (poids moyen)</h3>
          {growthData.length < 2 ? (
            <p className="text-sm text-muted-foreground">Ajoutez au moins 2 pesées pour voir la courbe.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="poids" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3">
            <FormDialog title="Ajouter une pesée" fields={weightFields} trigger={<Button size="sm" variant="outline">+ Pesée</Button>}
              onSubmit={async (v) => {
                await insertWeight.mutateAsync({ ...v, lot_id: id });
                await updateLot.mutateAsync({ id, values: { avg_weight: Number(v.avg_weight) } });
              }} />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="feed">
          <TabsList className="flex w-full flex-wrap">
            <TabsTrigger value="feed"><Wheat className="mr-1 h-4 w-4" /> Alimentation</TabsTrigger>
            <TabsTrigger value="health"><Syringe className="mr-1 h-4 w-4" /> Santé</TabsTrigger>
            <TabsTrigger value="mortality"><Skull className="mr-1 h-4 w-4" /> Mortalité</TabsTrigger>
            <TabsTrigger value="sales"><ShoppingCart className="mr-1 h-4 w-4" /> Ventes</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-3">
            <div className="flex justify-end">
              <FormDialog title="Ajouter consommation" fields={feedFields}
                onSubmit={async (v) => await insertFeed.mutateAsync({ ...v, lot_id: id })} />
            </div>
            <RecordList
              rows={lotFeed.map((f) => ({ id: f.id, main: f.feed_type, sub: `${formatNumber(Number(f.quantity_kg))} kg`, right: formatMoney(Number(f.cost), cur), date: f.record_date }))}
              empty="Aucune consommation enregistrée." />
          </TabsContent>

          <TabsContent value="health" className="space-y-3">
            <div className="flex justify-end">
              <FormDialog title="Ajouter soin" fields={healthFields}
                onSubmit={async (v) => await insertHealth.mutateAsync({ ...v, lot_id: id })} />
            </div>
            <RecordList
              rows={lotHealth.map((h) => ({ id: h.id, main: h.name, sub: h.type === "vaccine" ? "Vaccin" : "Traitement", right: formatMoney(Number(h.cost), cur), date: h.record_date }))}
              empty="Aucun soin enregistré." />
          </TabsContent>

          <TabsContent value="mortality" className="space-y-3">
            <div className="flex justify-end">
              <FormDialog title="Enregistrer décès" fields={mortFields}
                onSubmit={async (v) => await insertMort.mutateAsync({ ...v, lot_id: id })} />
            </div>
            <RecordList
              rows={lotMort.map((m) => ({ id: m.id, main: `${formatNumber(m.count)} morts`, sub: m.cause || "—", date: m.record_date }))}
              empty="Aucun décès enregistré."
              onDelete={(rid) => delMort.mutate(rid)} />
          </TabsContent>

          <TabsContent value="sales" className="space-y-3">
            <div className="flex justify-end">
              <FormDialog title="Nouvelle vente" fields={saleFields}
                onSubmit={async (v) => {
                  const total = Number(v.quantity) * Number(v.unit_price);
                  await insertSale.mutateAsync({ ...v, lot_id: id, total });
                }} />
            </div>
            <RecordList
              rows={lotSales.map((s) => ({ id: s.id, main: `${formatNumber(s.quantity)} volailles`, sub: s.client || "—", right: formatMoney(Number(s.total), cur), date: s.record_date }))}
              empty="Aucune vente." />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function RecordList({
  rows,
  empty,
  onDelete,
}: {
  rows: { id: string; main: string; sub?: string; right?: string; date: string }[];
  empty: string;
  onDelete?: (id: string) => void;
}) {
  if (rows.length === 0)
    return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</div>;
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{r.main}</div>
            <div className="text-xs text-muted-foreground">{r.sub} · {formatDate(r.date)}</div>
          </div>
          <div className="flex items-center gap-3">
            {r.right && <span className="font-semibold">{r.right}</span>}
            {onDelete && (
              <button onClick={() => onDelete(r.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
