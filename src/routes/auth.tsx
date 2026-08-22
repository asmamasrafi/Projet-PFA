import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { registerAuditor } from "@/lib/auditor.functions";
import {
  COMPANY_SIZES,
  REGIONS,
  SECTORS,
  passwordStrength,
} from "@/lib/auth-options";

const title = "Connexion & inscription — CyberAudit PME";
const description =
  "Créez votre espace PME ou auditeur CyberAudit PME et suivez vos évaluations de maturité cybersécurité en toute confidentialité.";

type Role = "pme" | "auditeur";
type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: search["role"] === "auditeur" ? ("auditeur" as const) : ("pme" as const),
    mode: search["mode"] === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const field =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15";
const labelCls = "mb-1.5 block text-xs font-semibold tracking-wide text-foreground/80 uppercase";

function AuthPage() {
  const { role, mode } = Route.useSearch();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [step, setStep] = useState(1);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // pme signup
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState<string>(SECTORS[0]);
  const [size, setSize] = useState<string>(COMPANY_SIZES[0]);
  const [region, setRegion] = useState<string>(REGIONS[0]);
  const [city, setCity] = useState("");
  const [accept, setAccept] = useState(false);
  // auditor
  const [accessCode, setAccessCode] = useState("");

  const strength = useMemo(() => passwordStrength(password), [password]);

  useEffect(() => {
    setError(null);
    setNotice(null);
    setStep(1);
  }, [role, mode]);

  function setUrl(next: { role?: Role; mode?: Mode }) {
    void navigate({
      to: "/auth",
      search: { role: next.role ?? role, mode: next.mode ?? mode },
    });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    await supabase.auth.signOut({ scope: "local" });
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("Invalid login")
          ? "Email ou mot de passe incorrect."
          : "Connexion impossible. Réessayez dans un instant.",
      );
      return;
    }
    void navigate({ to: "/espace" });
  }

  async function handlePmeSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) {
      setError("Veuillez accepter les conditions d'utilisation.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: firstName,
          last_name: lastName,
          job_title: jobTitle,
          company_name: companyName,
          sector,
          company_size: size,
          region,
          city,
        },
      },
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("already")
          ? "Un compte existe déjà avec cet email."
          : "Inscription impossible : " + err.message,
      );
      return;
    }
    if (data.session) {
      void navigate({ to: "/espace" });
      return;
    }
    setNotice(
      "Compte créé. Vérifiez votre boîte mail et cliquez sur le lien de confirmation pour activer votre espace.",
    );
  }

  async function handleAuditorSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Vérifiez les informations saisies (mot de passe de 8 caractères minimum).");
      return;
    }

    setBusy(true);
    try {
      const res = await registerAuditor({
        data: {
          firstName,
          lastName,
          email,
          password,
          accessCode,
        },
      });
      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        return;
      }
      await supabase.auth.signOut({ scope: "local" });
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (err) {
        setNotice("Compte auditeur créé. Connectez-vous avec vos identifiants.");
        setUrl({ mode: "signin" });
        return;
      }
      void navigate({ to: "/espace" });
    } catch (error) {
      setBusy(false);
      const message =
        error instanceof Error
          ? error.message.includes("password")
            ? "Vérifiez les informations saisies (mot de passe de 8 caractères minimum)."
            : error.message.includes("Supabase") || error.message.includes("environment")
              ? "La configuration Supabase du serveur est incomplète. Vérifiez les variables d'environnement."
              : "Vérifiez les informations saisies."
          : "Vérifiez les informations saisies.";
      setError(message);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Connexion Google indisponible pour le moment.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/espace" });
  }

  async function handleReset() {
    if (!email) {
      setError("Saisissez votre email pour recevoir le lien de réinitialisation.");
      return;
    }
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    setNotice("Si un compte existe, un lien de réinitialisation vient d'être envoyé.");
  }

  const isSignup = mode === "signup";
  const isAuditor = role === "auditeur";

  return (
    <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      {/* Visual side */}
      <aside className="surface-ink relative hidden overflow-hidden px-10 py-12 text-ink-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="dot-grid absolute inset-0 opacity-25" />
        <div className="absolute -top-24 -left-20 size-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 size-80 rounded-full bg-clay/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2 text-ink-foreground">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheck className="size-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">CyberAudit PME</span>
        </Link>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
            <Sparkles className="size-3.5" /> Espace sécurisé
          </span>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-balance">
            Suivez votre maturité cyber, évaluation après évaluation.
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-ink-foreground/80">
            {[
              "Historique complet de vos scores et plans d'action",
              "Rapports exportables à partager avec votre direction",
              "Données hébergées et confidentielles, jamais revendues",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-foreground/60">© 2026 — Guide CMRPI/AUSIM</p>
      </aside>

      {/* Form side */}
      <main className="flex items-center justify-center bg-background px-5 py-10 sm:px-10">
        <div className="w-full max-w-lg">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Retour au site
          </Link>

          {/* Role switch */}
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-secondary/60 p-1.5">
            {(
              [
                { id: "pme", label: "Espace PME", icon: Building2 },
                { id: "auditeur", label: "Espace Auditeur", icon: UserCheck },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setUrl({ role: r.id })}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  role === r.id
                    ? "bg-primary text-primary-foreground shadow-lift"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <r.icon className="size-4" />
                {r.label}
              </button>
            ))}
          </div>

          <div className="rise mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {isSignup
                ? isAuditor
                  ? "Créer un compte auditeur"
                  : "Créer votre espace PME"
                : "Bon retour parmi nous"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSignup
                ? isAuditor
                  ? "Réservé aux auditeurs agréés : un code d'agrément est requis."
                  : "Quelques informations et votre première évaluation démarre."
                : "Connectez-vous pour retrouver vos évaluations et vos rapports."}
            </p>

            {error && (
              <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p className="mt-5 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-accent-foreground">
                {notice}
              </p>
            )}

            {/* SIGN IN */}
            {!isSignup && (
              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <div>
                  <label className={labelCls} htmlFor="email">
                    Email professionnel
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      required
                      maxLength={255}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@entreprise.ma"
                      className={`${field} pl-10`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls} htmlFor="password">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${field} pr-11 pl-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      aria-label="Afficher le mot de passe"
                      className="absolute top-3 right-3 text-muted-foreground hover:text-primary"
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <SubmitButton busy={busy} label="Se connecter" />
              </form>
            )}

            {/* PME SIGN UP */}
            {isSignup && !isAuditor && (
              <form onSubmit={handlePmeSignUp} className="mt-6 space-y-5">
                <Stepper step={step} />
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Prénom</label>
                        <input
                          required
                          maxLength={80}
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={field}
                          placeholder="Yasmine"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Nom</label>
                        <input
                          required
                          maxLength={80}
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={field}
                          placeholder="Bennani"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Fonction</label>
                      <input
                        maxLength={120}
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className={field}
                        placeholder="Directrice générale"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Email professionnel</label>
                      <input
                        type="email"
                        required
                        maxLength={255}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={field}
                        placeholder="vous@entreprise.ma"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Mot de passe</label>
                      <div className="relative">
                        <input
                          type={showPwd ? "text" : "password"}
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${field} pr-11`}
                          placeholder="8 caractères minimum"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((v) => !v)}
                          aria-label="Afficher le mot de passe"
                          className="absolute top-3 right-3 text-muted-foreground hover:text-primary"
                        >
                          {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${(strength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{strength.label}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!firstName || !lastName || !email || password.length < 8) {
                          setError("Complétez vos informations (mot de passe : 8 caractères min).");
                          return;
                        }
                        setError(null);
                        setStep(2);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      Continuer <ArrowRight className="size-4" />
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Nom de l'entreprise</label>
                      <input
                        required
                        maxLength={160}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className={field}
                        placeholder="Atlas Industries SARL"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Secteur</label>
                        <select
                          value={sector}
                          onChange={(e) => setSector(e.target.value)}
                          className={field}
                        >
                          {SECTORS.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Taille</label>
                        <select
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          className={field}
                        >
                          {COMPANY_SIZES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Région</label>
                        <select
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          className={field}
                        >
                          {REGIONS.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Ville</label>
                        <input
                          maxLength={80}
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className={field}
                          placeholder="Casablanca"
                        />
                      </div>
                    </div>
                    <label className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={accept}
                        onChange={(e) => setAccept(e.target.checked)}
                        className="mt-0.5 size-4 accent-[oklch(0.62_0.14_158)]"
                      />
                      <span className="text-muted-foreground">
                        J'accepte les conditions d'utilisation et la politique de confidentialité.
                        Mes réponses ne seront jamais revendues.
                      </span>
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <ArrowLeft className="size-4" /> Retour
                      </button>
                      <SubmitButton busy={busy} label="Créer mon espace" />
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* AUDITOR SIGN UP */}
            {isSignup && isAuditor && (
              <form onSubmit={handleAuditorSignUp} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Prénom</label>
                    <input
                      required
                      maxLength={80}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Nom</label>
                    <input
                      required
                      maxLength={80}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={field}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm text-primary">
                  Compte unique de l'entité CMRPI
                </div>
                <div>
                  <label className={labelCls}>Email professionnel</label>
                  <input
                    type="email"
                    required
                    maxLength={255}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className={labelCls}>Mot de passe</label>
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={field}
                    placeholder="8 caractères minimum"
                  />
                </div>
                <div>
                  <label className={labelCls}>Code d'agrément</label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground" />
                    <input
                      required
                      maxLength={120}
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      className={`${field} pl-10`}
                      placeholder="Code fourni par l'administrateur"
                    />
                  </div>
                </div>
                <SubmitButton busy={busy} label="Créer mon compte auditeur" />
              </form>
            )}

            {!isAuditor && (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-medium transition-all duration-200 hover:border-primary/40 hover:text-primary"
                >
                  <GoogleIcon /> Continuer avec Google
                </button>
              </>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignup ? "Vous avez déjà un compte ?" : "Pas encore de compte ?"}{" "}
              <button
                type="button"
                onClick={() => setUrl({ mode: isSignup ? "signin" : "signup" })}
                className="font-semibold text-primary hover:underline"
              >
                {isSignup ? "Se connecter" : "Créer un compte"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-60"
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {label}
    </button>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-3">
      {[1, 2].map((n) => (
        <div key={n} className="flex flex-1 items-center gap-3">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
              step >= n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {n}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {n === 1 ? "Votre compte" : "Votre entreprise"}
          </span>
          {n === 1 && <span className="h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.68 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.2 14.7 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c5.7 0 9.5-4 9.5-9.6 0-.6-.06-1.1-.15-1.6H12z"
      />
    </svg>
  );
}
