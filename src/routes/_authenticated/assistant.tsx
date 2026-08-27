import { useMemo, useRef, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Sparkles, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { neon } from "@/integrations/neon/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AiActionCard, type ActionState } from "@/components/ai/AiActionCard";
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
  "Fais le point sur les alertes en cours",
  "Crée un lot de 200 poussins Cobb 500 arrivés aujourd'hui",
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

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: (): Record<string, string> => (tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
    }),
  });

  const queryClient = useQueryClient();
  const [actions, setActions] = useState<Record<string, ActionState>>({});

  // Détecte les nouvelles propositions d'action dans les messages et les ajoute à l'état
  // local (sans jamais écraser une action déjà en cours de traitement/modifiée).
  useEffect(() => {
    setActions((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const m of messages) {
        for (const part of m.parts as any[]) {
          const output = part?.output;
          if (output && output.__pending_action && !next[output.actionId]) {
            next[output.actionId] = { kind: output.kind, summary: output.summary, payload: output.payload, status: "pending" };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [messages]);

  async function getToken() {
    if (!tokenRef.current) {
      const { data } = await neon.auth.getSession();
      tokenRef.current = data.session?.access_token ?? null;
    }
    return tokenRef.current;
  }

  async function approveAction(actionId: string) {
    const action = actions[actionId];
    if (!action) return;
    setActions((p) => ({ ...p, [actionId]: { ...action, status: "approving" } }));
    try {
      const t = await getToken();
      const res = await fetch("/api/actions/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({ kind: action.kind, payload: action.payload }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      setActions((p) => ({ ...p, [actionId]: { ...action, status: "done" } }));
      queryClient.invalidateQueries();
    } catch (err) {
      setActions((p) => ({ ...p, [actionId]: { ...action, status: "error", error: err instanceof Error ? err.message : "Erreur" } }));
    }
  }

  function rejectAction(actionId: string) {
    setActions((p) => (p[actionId] ? { ...p, [actionId]: { ...p[actionId], status: "rejected" } } : p));
  }

  function changeActionPayload(actionId: string, payload: Record<string, unknown>) {
    setActions((p) => (p[actionId] ? { ...p, [actionId]: { ...p[actionId], payload } } : p));
  }

  async function approveAllInOrder(actionIds: string[]) {
    // Séquentiel, pas en parallèle : certaines actions dépendent de l'ID d'une
    // action précédente (ex: un soin qui référence le lot juste créé) — l'ordre
    // de création doit être respecté pour que les clés étrangères soient valides.
    for (const id of actionIds) {
      if (actions[id]?.status === "pending") await approveAction(id);
    }
  }

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

  async function submit(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    if (!tokenRef.current) {
      const { data } = await neon.auth.getSession();
      tokenRef.current = data.session?.access_token ?? null;
    }
    sendMessage({ text: t }, { body: { context } });
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <>
      <PageHeader title="Assistant IA" subtitle="Coach Élevage — conseils, alertes et actions directes" />
      <div className="flex h-[calc(100vh-9rem)] flex-col md:h-[calc(100vh-8.5rem)]">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 md:p-8">
          {messages.length === 0 && (
            <div className="mx-auto max-w-md py-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Bot className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold">Bonjour, je suis votre Coach Élevage</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Je connais vos lots, vos finances, votre stock et la météo — et je peux préparer des actions
                pour vous : créer un lot, enregistrer un soin ou une vente, ajuster le stock. Vous validez
                chaque proposition avant qu'elle soit enregistrée. Posez-moi une question ou une instruction.
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
            const pendingIds = (m.parts as any[])
              .map((p) => p?.output?.__pending_action && actions[p.output.actionId] ? p.output.actionId : null)
              .filter((id): id is string => !!id);
            const stillPending = pendingIds.filter((id) => actions[id]?.status === "pending");
            return (
              <div key={m.id} className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
                {text && (
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
                )}
                {pendingIds.length > 0 && (
                  <div className="w-full max-w-[85%] space-y-2">
                    {stillPending.length > 1 && (
                      <button
                        onClick={() => approveAllInOrder(stillPending)}
                        className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Tout approuver ({stillPending.length})
                      </button>
                    )}
                    {pendingIds.map((id) => (
                      <AiActionCard
                        key={id}
                        action={actions[id]}
                        onApprove={() => approveAction(id)}
                        onReject={() => rejectAction(id)}
                        onChange={(payload) => changeActionPayload(id, payload)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {status === "submitted" && (
            <div className="flex justify-start">
              <div className="rounded-2xl border bg-card px-4 py-2.5 text-sm text-muted-foreground">Réflexion…</div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error.message || "Une erreur est survenue. Vérifiez votre connexion et réessayez."}
              </div>
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
