import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { approveAuditor, getPendingAuditors } from "@/lib/admin.functions";

const title = "Administration — CyberAudit PME";
const description = "Validez les demandes d’accès auditeur.";

export const Route = createFileRoute("/admin")({
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
  component: AdminPage,
});

type PendingAuditorRow = {
  user_id: string;
  entity: string;
  entity_other: string | null;
  verified: boolean;
  created_at: string;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    job_title: string | null;
    account_type: string | null;
  } | null;
};

function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingAuditorRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAdminPage();
  }, []);

  async function loadAdminPage() {
    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      void navigate({ to: "/auth", search: { role: "pme", mode: "signin" } });
      return;
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      setError("Accès refusé. Ce compte n’a pas le rôle administrateur.");
      setLoading(false);
      return;
    }

    try {
      const records = await getPendingAuditors();
      setPending(records as unknown as PendingAuditorRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(userId: string) {
    setBusy(true);
    setError(null);
    try {
      await approveAuditor({ data: { userId } });
      await loadAdminPage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground shadow-soft">
          <Loader2 className="size-4 animate-spin text-primary" /> Chargement du panneau d’administration…
        </div>
      </div>
    );
  }

  return (
    <div className="surface-hero min-h-screen px-5 py-10">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-border bg-card/90 p-6 shadow-soft sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Retour au site
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="size-3.5" /> Admin
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Users className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Validation auditeur</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Demandes en attente</h1>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-8 space-y-4">
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
              Aucune demande d’auditeur à valider pour le moment.
            </div>
          ) : (
            pending.map((item) => (
              <div
                key={item.user_id}
                className="rounded-2xl border border-border bg-secondary/20 p-5 shadow-soft"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      {item.profiles?.first_name ?? ""} {item.profiles?.last_name ?? ""}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.profiles?.email ?? "Email non disponible"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.entity}
                      {item.entity_other ? ` · ${item.entity_other}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleApprove(item.user_id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Valider
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
