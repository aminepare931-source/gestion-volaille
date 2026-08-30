import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Nom affiché dans le message d'erreur, pour savoir quelle zone a planté. */
  label?: string;
}

interface State {
  error: Error | null;
}

/** Barrière anti-crash générique. À utiliser autour de zones qui peuvent planter
 * indépendamment du reste de l'app (ex: le chat IA) : si ÇA plante, seule cette
 * zone affiche une erreur récupérable — le reste de l'app continue de fonctionner
 * normalement, au lieu d'un écran blanc total. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error(`[ErrorBoundary${this.props.label ? ` — ${this.props.label}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm font-medium">
            {this.props.label ? `${this.props.label} a rencontré un problème.` : "Une erreur est survenue."}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Vos données ne sont pas perdues. Essayez de recharger la page.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
