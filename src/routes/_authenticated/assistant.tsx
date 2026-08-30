import { useMemo, useRef, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Bot, Send, Sparkles, CheckCheck, Plus, Mic, MicOff } from "lucide-react";
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
import { toast } from "sonner";

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

// Persiste la conversation en localStorage : sans ça, changer de page ou fermer
// l'app fait tout disparaître (useChat ne garde son état qu'en mémoire du composant).
const CHAT_STORAGE_KEY = "elevage-plus:chat-history";
const MAX_STORED_MESSAGES = 60;

function loadStoredMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

  const { messages, sendMessage, status, error, setMessages } = useChat({
    messages: useMemo(() => loadStoredMessages(), []),
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: (): Record<string, string> => (tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
    }),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch {
      // Stockage plein ou indisponible : sans gravité, la conversation reste utilisable en mémoire.
    }
  }, [messages]);

  function newConversation() {
    setMessages([]);
    seenActionIds.current.clear();
    setActions({});
    if (typeof window !== "undefined") window.localStorage.removeItem(CHAT_STORAGE_KEY);
  }

  const queryClient = useQueryClient();
  const [actions, setActions] = useState<Record<string, ActionState>>({});

  // Détecte les nouvelles propositions d'action dans les messages et les ajoute à l'état
  // local (sans jamais écraser une action déjà en cours de traitement/modifiée).
  const seenActionIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const toAdd: [string, ActionState][] = [];
    for (const m of messages) {
      for (const part of m.parts as any[]) {
        const output = part?.output;
        const actionId = output?.actionId;
        if (output?.__pending_action === true && typeof actionId === "string" && !seenActionIds.current.has(actionId)) {
          seenActionIds.current.add(actionId);
          toAdd.push([actionId, { kind: output.kind, summary: output.summary, payload: output.payload, status: "pending" }]);
        }
      }
    }
    if (toAdd.length > 0) {
      setActions((prev) => ({ ...prev, ...Object.fromEntries(toAdd) }));
    }
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

  useEffect(() => {
    // Arrête le micro si l'utilisateur quitte la page pendant qu'il dicte —
    // sinon la reconnaissance vocale continue de tourner en arrière-plan.
    return () => recognitionRef.current?.stop();
  }, []);

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  function toggleVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("La dictée vocale n'est pas disponible sur ce navigateur. Essayez avec Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error("Je n'ai pas bien entendu, réessayez.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

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
      <PageHeader
        title="Assistant IA"
        subtitle="Coach Élevage — conseils, alertes et actions directes"
        action={
          messages.length > 0 ? (
            <Button variant="outline" size="sm" onClick={newConversation}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Nouvelle conversation
            </Button>
          ) : undefined
        }
      />
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
              placeholder={listening ? "Je vous écoute…" : "Écrivez ou dictez votre question…"}
              className="max-h-32 flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <Button
              type="button"
              size="icon"
              variant={listening ? "destructive" : "outline"}
              className="h-11 w-11 shrink-0 rounded-xl"
              onClick={toggleVoiceInput}
              title="Dicter au lieu d'écrire"
            >
              {listening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={busy || !input.trim()} onClick={() => submit(input)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
