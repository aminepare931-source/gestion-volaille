import { useMemo, useRef, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { neon } from "@/integrations/neon/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useLots,
  useMortalityRecords,
  useSales,
  useStockItems,
  useTransactions,
  useFeedRecords,
  useFarm,
  lotAlive,
  lotDeaths,
  lotSold,
} from "@/lib/data";
import { useWeather } from "@/lib/weather";
import { formatMoney, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
});

const SUGGESTIONS = [
  "Quel est mon lot le plus rentable ?",
  "Comment réduire la mortalité ?",
  "Que dois-je faire vu la météo aujourd'hui ?",
  "Mon stock d'aliment est-il suffisant ?",
];

function AssistantPage() {
  const { data: farm } = useFarm();
  const { data: lots = [] } = useLots();
  const { data: mortality = [] } = useMortalityRecords();
  const { data: sales = [] } = useSales();
  const { data: stock = [] } = useStockItems();
  const { data: transactions = [] } = useTransactions();
  const { data: feed = [] } = useFeedRecords();
  const { data: weather } = useWeather();
  const cur = farm?.currency ?? "FCFA";

  const context = useMemo(() => {
    const active = lots.filter((l) => l.status === "active");
    const lotLines = lots
      .map((l) => {
        const alive = lotAlive(l, mortality, sales);
        const deaths = lotDeaths(l.id, mortality);
        const sold = lotSold(l.id, sales);
        const rate = l.initial_count > 0 ? ((deaths / l.initial_count) * 100).toFixed(1) : "0";
        return `- ${l.name} (${l.breed || "race ?"}) : ${alive} vivants, ${deaths} morts (${rate}%), ${sold} vendus, statut ${l.status}`;
      })
      .join("\n");
    const stockLines = stock
      .map((s) => {
        const low = Number(s.quantity) <= Number(s.alert_threshold) && Number(s.alert_threshold) > 0;
        return `- ${s.name} (${s.category}) : ${s.quantity} ${s.unit}${low ? " ⚠️ BAS" : ""}`;
      })
      .join("\n");
    const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const income =
      transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0) +
      sales.reduce((s, x) => s + Number(x.total), 0);
    const feedKg = feed.reduce((s, f) => s + Number(f.quantity_kg), 0);

    return `Ferme : ${farm?.name ?? "—"} (devise ${cur})
Lots actifs : ${active.length} / ${lots.length}
${lotLines || "Aucun lot."}

Finances : revenus ${formatMoney(income, cur)}, dépenses ${formatMoney(expenses, cur)}, bénéfice ${formatMoney(income - expenses, cur)}
Aliment consommé (total) : ${formatNumber(feedKg)} kg

Stock :
${stockLines || "Aucun stock enregistré."}

Météo : ${
      weather
        ? `${weather.temperature}°C, ${weather.rainProbToday}% pluie, vent max ${weather.windMaxToday} km/h à ${weather.place}. Alertes: ${
            weather.alerts.map((a) => a.message).join(" | ") || "aucune"
          }`
        : "non disponible"
    }`;
  }, [lots, mortality, sales, stock, transactions, feed, farm, cur, weather]);

  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    neon.auth.getSession().then(({ data }) => {
      tokenRef.current = data.session?.access_token ?? null;
    });
    const { data: sub } = neon.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: (): Record<string, string> => (tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
    }),
  });

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t }, { body: { context } });
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <>
      <PageHeader title="Assistant IA" subtitle="Coach Volaille — conseils, alertes et prévention" />
      <div className="flex h-[calc(100vh-9rem)] flex-col md:h-[calc(100vh-8.5rem)]">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 md:p-8">
          {messages.length === 0 && (
            <div className="mx-auto max-w-md py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Bot className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold">Bonjour, je suis votre Coach Volaille</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Je connais vos lots, vos finances, votre stock et la météo. Posez-moi une question.
              </p>
              <div className="mt-5 grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-left text-sm hover:border-primary"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "prose prose-sm max-w-none border bg-card text-foreground dark:prose-invert",
                  )}
                >
                  {isUser ? text : <ReactMarkdown>{text}</ReactMarkdown>}
                </div>
              </div>
            );
          })}

          {status === "submitted" && (
            <div className="flex justify-start">
              <div className="rounded-2xl border bg-card px-4 py-2.5 text-sm text-muted-foreground">Réflexion…</div>
            </div>
          )}
        </div>

        <div className="border-t bg-card/50 p-3 md:p-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Écrivez votre question…"
              className="max-h-32 flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <Button size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={busy || !input.trim()} onClick={() => submit(input)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
