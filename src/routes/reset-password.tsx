import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const title = "Réinitialiser le mot de passe — CyberAudit PME";
const description = "Définissez un nouveau mot de passe pour accéder à votre espace CyberAudit PME.";

export const Route = createFileRoute("/reset-password")({
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
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError("Lien expiré ou invalide. Demandez un nouveau lien depuis la page de connexion.");
      return;
    }
    setDone(true);
    setTimeout(() => void navigate({ to: "/espace" }), 1200);
  }

  return (
    <div className="surface-hero flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-soft">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choisissez un mot de passe d'au moins 8 caractères.
        </p>
        {error && (
          <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {done ? (
          <p className="mt-6 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-accent-foreground">
            Mot de passe mis à jour. Redirection vers votre espace…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <Lock className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Mettre à jour
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
