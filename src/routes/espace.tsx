import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const title = "Mon espace — CyberAudit PME";
const description = "Votre espace personnel CyberAudit PME.";

export const Route = createFileRoute("/espace")({
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
  component: EspacePage,
});

function EspacePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<"pme" | "auditor" | "admin" | "unknown">("unknown");

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        void navigate({ to: "/auth", search: { role: "pme", mode: "signin" } });
        return;
      }

      if (!active) return;
      setEmail(session.user.email ?? null);

      try {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (roleRow?.role) {
          setRole(roleRow.role as "pme" | "auditor" | "admin");
        } else {
          setRole("pme");
        }
      } catch {
        setRole("pme");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-sm text-muted-foreground shadow-soft">
          Chargement de votre espace…
        </div>
      </div>
    );
  }

  return (
    <div className="surface-hero min-h-screen px-5 py-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-border bg-card/90 p-6 shadow-soft sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Retour au site
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition-all hover:border-primary/40 hover:text-primary"
          >
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-primary/15 bg-primary-soft p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Mon espace</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Bienvenue dans votre espace CyberAudit
              </h1>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <UserCircle2 className="size-4 text-primary" />
                Profil
              </div>
              <p className="mt-3 text-base font-semibold">{email ?? "Compte connecté"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {role === "auditor"
                  ? "Compte auditeur"
                  : role === "admin"
                    ? "Compte administrateur"
                    : "Compte PME"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <p className="text-sm text-muted-foreground">Statut</p>
              <p className="mt-3 text-lg font-semibold text-primary">Actif</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Votre espace est prêt pour la prochaine évaluation.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card/80 p-5 text-sm text-muted-foreground">
            Cette page est prête à accueillir votre tableau de bord, vos évaluations et vos recommandations.
          </div>
        </div>
      </div>
    </div>
  );
}
