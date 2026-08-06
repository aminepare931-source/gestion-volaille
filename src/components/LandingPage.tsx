// Landing page publique. Notes de design (pour reprises futures) :
// - Signature : la "carte carnet" flottant sur la photo de ferme (hero) + la frise
//   J1→J28 du calendrier de vaccination réel (le même que celui utilisé dans
//   src/lib/insights.ts) comme dispositif structurel — légitime ici car c'est une
//   vraie séquence datée du métier, pas un 01/02/03 décoratif.
// - Type : Fraunces (serif chaleureux, caractère "tamponné/carnet") pour les titres,
//   chargé uniquement sur cette route ; le reste du site garde le sans-serif système.
// - Palette : réutilise les tokens existants de l'app (vert primaire, ambre "grain",
//   fond ivoire chaud) pour que la landing reste le même produit, pas une brochure à part.
import { Link } from "@tanstack/react-router";
import { Bird, Warehouse, Package, Wallet, Bot, ShoppingCart, Check } from "lucide-react";
import logo from "@/assets/logo-mark.png";
import farmHero from "@/assets/farm-hero.jpg";
import { VACCINE_SCHEDULE } from "@/lib/insights";

const FEATURES = [
  {
    icon: Bird,
    title: "Lots & bâtiments",
    text: "Un lot par bande d'animaux, un bâtiment par poulailler, étable ou bergerie. Effectif, race, croissance : tout au même endroit.",
  },
  {
    icon: Package,
    title: "Stock & aliment",
    text: "Quantités, seuils d'alerte, consommation par lot. Vous savez toujours combien de jours d'aliment il vous reste.",
  },
  {
    icon: Wallet,
    title: "Finances & ventes",
    text: "Dépenses, revenus, ventes par lot. Le bénéfice réel de chaque bande, pas une estimation à l'œil.",
  },
  {
    icon: ShoppingCart,
    title: "Santé & vaccins",
    text: "Calendrier de vaccination automatique, mortalité suivie en temps réel, alertes dès qu'un taux dépasse la normale.",
  },
  {
    icon: Bot,
    title: "Coach Élevage (IA)",
    text: "Décrivez un lot, elle choisit le bâtiment, calcule les besoins et enregistre les premiers soins. Posez une question, elle répond avec vos vrais chiffres.",
  },
  {
    icon: Warehouse,
    title: "Multi-élevage",
    text: "Volailles, bovins, ovins, caprins, porcins — la même app grandit avec votre exploitation, pas seulement votre poulailler.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap"
      />
      <style>{`
        .ld-display { font-family: "Fraunces", ui-serif, Georgia, serif; font-optical-sizing: auto; }
        .ld-ledger-lines {
          background-image: repeating-linear-gradient(
            to bottom, transparent, transparent 27px, color-mix(in oklch, var(--border) 70%, transparent) 28px
          );
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
            <span className="ld-display text-lg font-semibold">Ma Volaille</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              to="/auth"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Connexion
            </Link>
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Créer un compte
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:px-8 md:py-24">
          <div>
            <p className="mb-3 text-sm font-medium tracking-wide text-primary">
              Pour les éleveurs d'Afrique de l'Ouest
            </p>
            <h1 className="ld-display text-4xl font-semibold leading-[1.05] md:text-5xl">
              Le carnet d'élevage qui tient les comptes à votre place.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              Lots, stock, santé, finances — et une IA qui agit directement dessus. Fini le cahier
              papier et les calculs à la main.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "register" }}
                className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90"
              >
                Commencer gratuitement
              </Link>
              <a
                href="#comment-ca-marche"
                className="rounded-md border px-6 py-3 text-sm font-semibold hover:bg-accent"
              >
                Voir comment ça marche
              </a>
            </div>
          </div>

          {/* Signature: ledger card floating on the farm photo */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border shadow-xl">
              <img src={farmHero} alt="" className="h-64 w-full object-cover md:h-80" />
            </div>
            <div className="ld-ledger-lines absolute -bottom-8 -left-4 w-[85%] rounded-xl border bg-card p-4 shadow-2xl md:-left-8 md:w-[75%] md:p-5">
              <p className="ld-display text-sm font-semibold">Lot Poussins Janvier</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Cobb 500 · Poulailler A · J14</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
                  <Check className="h-3 w-3" /> 198 / 200 vivants
                </span>
                <span className="rounded-full bg-warning/15 px-2 py-1 font-medium text-warning-foreground">
                  Vaccin Gumboro aujourd'hui
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche — vrai calendrier de vaccination, pas une frise décorative */}
      <section id="comment-ca-marche" className="border-t bg-card/40 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="ld-display text-2xl font-semibold md:text-3xl">
            L'app suit le calendrier réel de vos lots, jour par jour.
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Exemple pour un lot de poulets de chair — le même principe s'applique à la mortalité, au
            stock et aux finances : rien à retenir, l'app vous prévient au bon moment.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {VACCINE_SCHEDULE.map((step) => (
              <div key={step.day} className="rounded-xl border bg-background p-4">
                <span className="ld-display inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  J{step.day}
                </span>
                <p className="mt-3 text-sm font-semibold">{step.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="ld-display text-2xl font-semibold md:text-3xl">Tout l'élevage, une seule app.</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t bg-primary py-16 text-primary-foreground md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h2 className="ld-display text-2xl font-semibold md:text-3xl">
            Votre premier lot enregistré en moins de deux minutes.
          </h2>
          <p className="mt-3 text-primary-foreground/85">Gratuit pour commencer. Depuis votre téléphone.</p>
          <Link
            to="/auth"
            search={{ mode: "register" }}
            className="mt-7 inline-block rounded-md bg-background px-7 py-3 text-sm font-semibold text-foreground shadow hover:bg-background/90"
          >
            Créer mon compte
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground md:flex-row md:px-8">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={20} height={20} className="h-5 w-5" />
            <span>Ma Volaille</span>
          </div>
          <p>© {new Date().getFullYear()} — Gestion d'élevage pour l'Afrique de l'Ouest.</p>
        </div>
      </footer>
    </div>
  );
}
