import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import heroImage from "@/assets/hero.jpg";
import reportImage from "@/assets/report.jpg";
import teamImage from "@/assets/team.jpg";
import partnerCmrpi from "@/assets/image (4).png";
import partnerEmc from "@/assets/image-2.png";
import partnerAusim from "@/assets/image-3.png";
import partnerMinisteres from "@/assets/image-4.png";
import {
  Building2,
  BarChart3,
  ChevronDown,
  FileCheck2,
  Lock,
  Menu,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
  Timer,
  UserCheck,
  X,
} from "lucide-react";

const title = "CyberAudit PME — Évaluez votre maturité cybersécurité";
const description =
  "Auto-évaluation cybersécurité en 5 minutes pour les PME marocaines : sans jargon, confidentielle, avec un plan d'action concret.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const navLinks = [
  { label: "À propos", href: "#a-propos" },
  { label: "Avantages", href: "#avantages" },
  { label: "FAQ", href: "#faq" },
];

const partners = [
  { name: "CMRPI", src: partnerCmrpi },
  { name: "Espace Maroc Cyberconfiance", src: partnerEmc },
  { name: "AUSIM", src: partnerAusim },
  { name: "Ministères Royaume du Maroc", src: partnerMinisteres },
];

const features = [
  {
    icon: Timer,
    title: "Test Rapide",
    text: "Un questionnaire guidé de 5 minutes, pensé pour des dirigeants pressés.",
    tone: "bg-white/15 text-white",
  },
  {
    icon: MessageSquareText,
    title: "Zéro Jargon",
    text: "Des questions en langage clair, sans vocabulaire technique inutile.",
    tone: "bg-primary/25 text-primary-foreground",
  },
  {
    icon: FileCheck2,
    title: "Plan d'Action",
    text: "Un rapport priorisé avec des mesures concrètes à mettre en place.",
    tone: "bg-clay/30 text-clay-foreground",
  },
  {
    icon: Lock,
    title: "Confidentialité",
    text: "Vos réponses restent les vôtres : aucune revente, aucun partage.",
    tone: "bg-white/10 text-white",
  },
];

const steps = [
  {
    n: "01",
    title: "Répondez",
    text: "30 questions simples sur votre organisation, vos outils et vos habitudes.",
  },
  {
    n: "02",
    title: "Obtenez votre score",
    text: "Un niveau de maturité clair, domaine par domaine, visualisé en un coup d'œil.",
  },
  {
    n: "03",
    title: "Agissez",
    text: "Un plan d'action priorisé, avec des actions réalisables dès cette semaine.",
  },
];

const faqs = [
  {
    q: "Qu'est-ce que la maturité cyber ?",
    a: "C'est le niveau de préparation de votre entreprise face aux risques numériques : organisation, sauvegardes, mots de passe, sensibilisation des équipes et capacité à réagir en cas d'incident.",
  },
  {
    q: "Combien de temps dure le test ?",
    a: "Environ 5 minutes. Une trentaine de questions simples, à réponse rapide, que vous pouvez interrompre et reprendre à tout moment.",
  },
  {
    q: "Mes données sont-elles partagées ?",
    a: "Non. Vos réponses sont utilisées uniquement pour générer votre rapport. Aucune donnée nominative n'est transmise à un tiers ni revendue.",
  },
];

function Index() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setLoginOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#" className="group flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:-translate-y-0.5">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              CyberAudit <span className="text-primary">PME</span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="relative rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative" ref={loginRef}>
              <button
                type="button"
                onClick={() => setLoginOpen((v) => !v)}
                aria-expanded={loginOpen}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
              >
                Se connecter
                <ChevronDown
                  className={`size-4 transition-transform duration-300 ${loginOpen ? "rotate-180" : ""}`}
                />
              </button>
              {loginOpen && (
                <div className="rise absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-soft">
                  <a
                    href="/auth?role=pme"
                    className="flex items-start gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-secondary"
                  >
                    <Building2 className="mt-0.5 size-4 text-primary" />
                    <span>
                      <span className="block text-sm font-medium">Espace PME</span>
                      <span className="block text-xs text-muted-foreground">
                        Suivre mes évaluations
                      </span>
                    </span>
                  </a>
                  <a
                    href="/auth?role=auditeur"
                    className="flex items-start gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-secondary"
                  >
                    <UserCheck className="mt-0.5 size-4 text-primary" />
                    <span>
                      <span className="block text-sm font-medium">Espace Auditeur</span>
                      <span className="block text-xs text-muted-foreground">
                        Gérer mes dossiers clients
                      </span>
                    </span>
                  </a>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              className="rounded-xl border border-border p-2 md:hidden"
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="rise border-t border-border bg-background px-5 py-3 md:hidden">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-2 py-2.5 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main>
        <section className="surface-hero overflow-hidden px-5 py-16 sm:py-24" id="a-propos">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <span className="rise inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-medium text-primary shadow-soft">
                <Sparkles className="size-3.5" /> Auto-évaluation gratuite
              </span>
              <h1
                className="hero-title rise mt-6 text-4xl text-balance sm:text-5xl lg:text-6xl"
                style={{ animationDelay: "80ms" }}
              >
                Évaluez la maturité cybersécurité de votre PME en{" "}
                <span className="text-primary">5 minutes</span>
              </h1>
              <p
                className="rise mx-auto mt-6 max-w-xl text-sm text-muted-foreground sm:text-base lg:mx-0"
                style={{ animationDelay: "160ms" }}
              >
                Un outil d'auto-évaluation interactif, sans jargon technique, conçu pour protéger le
                tissu économique marocain.
              </p>
              <div
                className="rise mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
                style={{ animationDelay: "240ms" }}
              >
                <a
                  href="#etapes"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                >
                  Démarrer l'évaluation
                </a>
                <a
                  href="#faq"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-medium transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                >
                  En savoir plus
                </a>
              </div>
              <dl className="rise mt-10 grid grid-cols-3 gap-4" style={{ animationDelay: "320ms" }}>
                {[
                  ["5 min", "de test"],
                  ["24", "questions"],
                  ["100%", "confidentiel"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-2xl border border-border bg-card/70 p-3">
                    <dt className="text-xl font-semibold text-primary">{v}</dt>
                    <dd className="text-xs text-muted-foreground">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rise relative" style={{ animationDelay: "200ms" }}>
              <div className="absolute -top-8 -right-6 size-40 rounded-full bg-clay/25 blur-3xl" />
              <div className="absolute -bottom-10 -left-8 size-48 rounded-full bg-primary/25 blur-3xl" />
              <img
                src={heroImage}
                alt="Dirigeant de PME consultant son tableau de bord de cybersécurité"
                width={1200}
                height={1200}
                className="relative w-full rounded-[2rem] border border-border object-cover shadow-lift"
              />
              <div className="float-slow absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft sm:left-8">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <BarChart3 className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Score 78/100</span>
                  <span className="block text-xs text-muted-foreground">Maturité en hausse</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-10">
          <p className="text-center text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Une initiative soutenue par
          </p>
          <div className="marquee-pause relative mt-6 overflow-hidden">
            <div className="marquee-track flex gap-14 pr-14">
              {[...partners, ...partners, ...partners].map((p, i) => (
                <span key={`${p.name}-${i}`} className="flex shrink-0 items-center">
                  <img
                    src={p.src}
                    alt={`Logo ${p.name}`}
                    loading="lazy"
                    className="h-12 w-auto max-w-[200px] object-contain transition-transform duration-300 hover:scale-105 sm:h-14"
                  />
                </span>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-card to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-card to-transparent" />
          </div>
        </section>

        <section id="avantages" className="surface-ink relative overflow-hidden px-5 py-20 sm:py-24">
          <div className="dot-grid absolute inset-0 opacity-25" />
          <div className="absolute -top-24 -left-24 size-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 size-80 rounded-full bg-clay/20 blur-3xl" />
          <div className="relative mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight text-ink-foreground sm:text-4xl">
              Pensé pour les dirigeants, pas pour les experts
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-ink-foreground/75">
              Quatre principes simples qui rendent l'audit accessible à toute PME.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <article
                  key={f.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:bg-white/15 hover:shadow-lift"
                >
                  <div className="absolute -right-8 -top-8 size-24 rounded-full bg-primary/25 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span
                    className={`relative flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${f.tone}`}
                  >
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="relative mt-5 text-base font-semibold text-ink-foreground">{f.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-ink-foreground/75">{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="etapes" className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -top-6 -left-6 size-36 rounded-full bg-clay/20 blur-3xl" />
              <img
                src={reportImage}
                alt="Illustration d'un rapport de maturité cybersécurité"
                width={1200}
                height={912}
                loading="lazy"
                className="relative w-full rounded-[2rem] border border-border object-cover shadow-soft"
              />
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-xs font-semibold tracking-[0.2em] text-clay uppercase">
                Comment ça marche
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Trois étapes, un plan d'action clair
              </h2>
              <ol className="mt-8 space-y-5">
                {steps.map((s) => (
                  <li
                    key={s.n}
                    className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform duration-300 hover:translate-x-1"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                      {s.n}
                    </span>
                    <span>
                      <span className="block font-semibold">{s.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="surface-ink px-5 py-20 text-ink-foreground sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Une cybersécurité à la portée de chaque équipe marocaine
              </h2>
              <p className="mt-5 text-ink-foreground/75">
                Nos recommandations s'adaptent à votre taille, votre secteur et vos moyens. Pas de
                projet à six chiffres : des gestes simples, appliqués au bon moment.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  ["+2 500", "PME accompagnées"],
                  ["12", "domaines évalués"],
                  ["0 DH", "pour démarrer"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                    <p className="text-2xl font-semibold">{v}</p>
                    <p className="text-xs text-ink-foreground/70">{l}</p>
                  </div>
                ))}
              </div>
              <a
                href="#etapes"
                className="mt-9 inline-flex items-center gap-2 rounded-xl bg-clay px-6 py-3.5 text-sm font-semibold text-clay-foreground transition-transform duration-300 hover:-translate-y-0.5"
              >
                Lancer mon évaluation
              </a>
            </div>
            <img
              src={teamImage}
              alt="Équipe d'une PME marocaine travaillant ensemble"
              width={1200}
              height={912}
              loading="lazy"
              className="w-full rounded-[2rem] border border-white/15 object-cover shadow-lift"
            />
          </div>
        </section>

        <section id="faq" className="border-t border-border bg-secondary/40 px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
              Foire aux questions
            </h2>
            <div className="mt-10 space-y-3">
              {faqs.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div
                    key={item.q}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-colors duration-300 hover:border-primary/30"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium sm:text-base"
                    >
                      {item.q}
                      <Plus
                        className={`size-4 shrink-0 text-primary transition-transform duration-300 ${open ? "rotate-45" : ""}`}
                      />
                    </button>
                    <div
                      className="grid transition-all duration-500 ease-out"
                      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-primary" />
            CyberAudit PME
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground">
            <a href="#" className="transition-colors hover:text-primary">
              Mentions légales
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Contact
            </a>
          </nav>
          <p className="text-xs text-muted-foreground">© 2026 — Guide CMRPI/AUSIM</p>
        </div>
      </footer>
    </div>
  );
}
