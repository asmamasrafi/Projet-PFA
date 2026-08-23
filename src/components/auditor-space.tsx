import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import {
  Archive,
  ArrowRight,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AuditorTab = "overview" | "missions" | "companies" | "reports" | "profile";
type MissionStatus = "À planifier" | "En cours" | "À valider" | "Clôturée";

type Mission = {
  id: string;
  company: string;
  sector: string;
  size: string;
  region: string;
  auditorNote: string;
  domains: DomainScore[];
  recommendations: Recommendation[];
  status: MissionStatus;
  progress: number;
  due: string;
  score: number | null;
  risk: "Faible" | "Modéré" | "Élevé";
  contact: string;
  updated: string;
};

const navItems: { id: AuditorTab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "missions", label: "Mes missions", icon: ClipboardCheck },
  { id: "companies", label: "Dossiers PME", icon: Users },
  { id: "reports", label: "Rapports", icon: FileBarChart },
  { id: "profile", label: "Mon profil", icon: UserCircle2 },
];

const statusStyles: Record<MissionStatus, string> = {
  "À planifier": "bg-amber-50 text-amber-700 ring-amber-200",
  "En cours": "bg-blue-50 text-blue-700 ring-blue-200",
  "À valider": "bg-violet-50 text-violet-700 ring-violet-200",
  Clôturée: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
const recommendationsByIndex: Record<number, string> = {
  6: "Rédigez un document simple listant les règles de sécurité de base et partagez-le avec tous les employés.",
  7: "Désignez une personne responsable de la sécurité informatique, même à temps partiel.",
  8: "Faites l'inventaire de tout votre matériel et vos logiciels, et tenez-le à jour.",
  9: "Prenez le temps, une fois par an, d'évaluer les risques informatiques de l'entreprise.",
  10: "Donnez à chaque employé un compte individuel : évitez les comptes partagés.",
  11: "Mettez en place des règles claires sur les mots de passe (complexité, renouvellement régulier).",
  12: "Retirez systématiquement les accès informatiques d'un employé dès son départ.",
  13: "Séparez le réseau Wi-Fi des visiteurs de celui des employés, et protégez les deux par un mot de passe.",
  14: "Installez un antivirus à jour sur tous les postes de travail.",
  15: "Organisez une session annuelle de sensibilisation aux risques informatiques.",
  16: "Formez vos employés à reconnaître les emails suspects et les tentatives de phishing.",
  17: "Contrôlez l'accès physique aux locaux où se trouvent vos ordinateurs et serveurs.",
  18: "Restreignez l'accès aux données confidentielles (clients, RH) à un nombre limité de personnes.",
  19: "Mettez en place une sauvegarde régulière de vos données importantes.",
  20: "Conservez une copie de vos sauvegardes ailleurs que sur le poste ou serveur principal.",
  21: "Rédigez une procédure simple expliquant quoi faire en cas d'incident informatique.",
  22: "Préparez un plan de secours pour continuer à fonctionner en cas de panne majeure.",
  23: "Vérifiez que votre entreprise respecte la loi 09-08 sur la protection des données personnelles.",
};

const categoryLabels: Record<string, string> = {
  "Contexte de l'entreprise": "Contexte et exposition aux risques",
  "Contexte et exposition aux risques": "Contexte et exposition aux risques",
  "Gouvernance et organisation": "Gouvernance et organisation",
  "Accès, mots de passe et réseau": "Accès, mots de passe et réseau",
  "Sensibilisation et sécurité humaine": "Sensibilisation et sécurité humaine",
  "Sauvegarde, incidents et conformité": "Sauvegarde, incidents et conformité",
};

function normalizeCategory(category: string) {
  return categoryLabels[category] ?? category;
}
function formatAuditorName(firstName: string, lastName: string) {
  const trimmedFirst = firstName.trim();
  const capitalizedFirst = trimmedFirst
    ? trimmedFirst.charAt(0).toUpperCase() + trimmedFirst.slice(1).toLowerCase()
    : "";
  const upperLast = lastName.trim().toUpperCase();
  return `${capitalizedFirst} ${upperLast}`.trim();
}
type DomainScore = { name: string; score: number };
type Recommendation = { question: string; recommendation: string };

function computeDomainsAndRecommendations(
  auditId: string,
  answerRows: { audit_id: string; question_id: string; score: number | null }[],
  questionById: Map<string, { axis: string; question: string; noted: boolean; sort_order: number }>,
): { domains: DomainScore[]; recommendations: Recommendation[] } {
  const categoryScores = new Map<string, number[]>();
  const candidates: { question: string; recommendation: string; level: number }[] = [];

  answerRows
    .filter((answer) => answer.audit_id === auditId)
    .forEach((answer) => {
      const question = questionById.get(answer.question_id);
      if (!question || !question.noted || answer.score === null) return;
      const normalized = normalizeCategory(question.axis);
      const scores = categoryScores.get(normalized) ?? [];
      scores.push(answer.score);
      categoryScores.set(normalized, scores);

      const recommendation = recommendationsByIndex[question.sort_order - 1];
      if (recommendation) {
        candidates.push({ question: question.question, recommendation, level: answer.score });
      }
    });

  const domains = Array.from(categoryScores.entries()).map(([name, scores]) => ({
    name,
    score: Math.round((scores.reduce((total, score) => total + score, 0) / (scores.length * 3)) * 100),
  }));

  candidates.sort((left, right) => left.level - right.level);
  const priorityCandidates = candidates.filter((candidate) => candidate.level < 3);
  const selected = priorityCandidates.slice(0, 5);
  if (selected.length < 3) {
    selected.push(...candidates.filter((candidate) => !selected.includes(candidate)).slice(0, 3 - selected.length));
  }

  return { domains, recommendations: selected.slice(0, 5) };
}
const riskStyles = {
  Faible: "text-emerald-700",
  Modéré: "text-amber-700",
  Élevé: "text-rose-700",
};

export function AuditorSpace({ email, onLogout }: { email: string | null; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<AuditorTab>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MissionStatus | "Toutes">("Toutes");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selected, setSelected] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [auditorName, setAuditorName] = useState("Auditeur CyberAudit");
  const [auditorEntity, setAuditorEntity] = useState("Cabinet auditeur");
  const [auditorVerified, setAuditorVerified] = useState(false);
  const [notes, setNotes] = useState("");
  const [auditorId, setAuditorId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const auditorInitials = (email ?? "AU")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AU";
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  useEffect(() => {
    let active = true;

    async function loadMissions() {
      setLoading(true);
      setLoadError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setLoadError("Session auditeur introuvable.");
          setLoading(false);
        }
        return;
      }
      if (active) setAuditorId(user.id);

      const [{ data: profile }, { data: auditorProfile }] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
        supabase.from("auditor_profiles").select("entity, verified").eq("user_id", user.id).maybeSingle(),
      ]);
      const fullName = formatAuditorName(profile?.first_name ?? "", profile?.last_name ?? "");
      if (active) {
        setAuditorName(fullName || "Auditeur CyberAudit");
        setAuditorEntity(auditorProfile?.entity || "Cabinet auditeur");
        setAuditorVerified(Boolean(auditorProfile?.verified));
      }

      const [{ data: companies, error: companiesError }, { data: audits, error: auditsError }, { data: answers }, { data: notesRows }, { data: questionRows }] = await Promise.all([
        supabase.from("companies").select("id, name, sector, size, region, updated_at").order("name"),
        supabase
          .from("audits")
          .select("id, company_id, status, score, updated_at, submitted_at")
          .order("updated_at", { ascending: false }),
        supabase.from("audit_answers").select("audit_id, question_id, score"),
        supabase.from("audit_notes").select("audit_id, note"),
        supabase.from("audit_questions").select("id, axis, question, noted, sort_order"),
      ]);

      if (auditsError) {
        if (active) {
          setLoadError("Les audits PME ne peuvent pas être chargés.");
          setLoading(false);
        }
        return;
      }

      if (companiesError) {
        if (active) {
          setLoadError("Les dossiers PME ne peuvent pas être chargés.");
          setLoading(false);
        }
        return;
      }

      const companyById = new Map((companies ?? []).map((company) => [company.id, company]));
      const answersByAudit = new Map<string, number>();
      (answers ?? []).forEach((answer) => {
        answersByAudit.set(answer.audit_id, (answersByAudit.get(answer.audit_id) ?? 0) + 1);
      });
      const noteByAudit = new Map((notesRows ?? []).map((row) => [row.audit_id, row.note]));
      const questionById = new Map((questionRows ?? []).map((question) => [question.id, question]));
      const formattedMissions = (audits ?? []).map((audit) => {
        const company = companyById.get(audit.company_id);
        const answerCount = answersByAudit.get(audit.id) ?? 0;
        const progress = Math.min(100, Math.round((answerCount / 24) * 100));
        const status: MissionStatus =
          audit.status === "completed"
            ? "Clôturée"
            : audit.status === "submitted" || audit.status === "in_review"
              ? "À valider"
              : progress > 0
                ? "En cours"
                : "À planifier";
        const score = audit.score;
        const risk: Mission["risk"] = score === null ? "Élevé" : score < 50 ? "Élevé" : score < 75 ? "Modéré" : "Faible";
        const date = audit.submitted_at ?? audit.updated_at;

        return {
          id: audit.id,
          company: company?.name || "PME non renseignée",
          sector: company?.sector || "Secteur non renseigné",
          size: company?.size || "Taille non renseignée",
          region: company?.region || "Région non renseignée",
          status,
          progress,
          due: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date)),
          score,
          auditorNote: noteByAudit.get(audit.id) ?? "", ...computeDomainsAndRecommendations(audit.id, answers ?? [], questionById), 
          risk,
          contact: "Compte PME",
          updated: `Mis à jour le ${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(audit.updated_at))}`,
        } satisfies Mission;
      });
      const companiesWithoutAudits = (companies ?? [])
        .filter((company) => !(audits ?? []).some((audit) => audit.company_id === company.id))
        .map((company) => ({
          id: `company-${company.id}`,
          company: company.name || "PME non renseignée",
          sector: company.sector || "Secteur non renseigné",
          size: company.size || "Taille non renseignée",
          region: company.region || "Région non renseignée",
          status: "À planifier" as const,
          progress: 0,
          due: "À planifier",
          score: null,
          auditorNote: "",
          domains: [],
          recommendations: [],
          risk: "Modéré" as const,
          contact: "Compte PME",
          updated: `Entreprise mise à jour le ${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(company.updated_at))}`,
        } satisfies Mission));

      if (active) {
        setMissions([...formattedMissions, ...companiesWithoutAudits]);
        setLoading(false);
      }
    }

    void loadMissions();
    return () => {
      active = false;
    };
  }, []);

  const filteredMissions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return missions.filter((mission) => {
      const matchesQuery =
        !normalized ||
        `${mission.company} ${mission.id} ${mission.sector}`.toLowerCase().includes(normalized);
      return matchesQuery && (statusFilter === "Toutes" || mission.status === statusFilter);
    });
  },  [missions, query, statusFilter]);

  function selectTab(tab: AuditorTab) {
    setActiveTab(tab);
    setMobileOpen(false);
    setSelected(null);
  }

  const actionableCount = missions.filter((mission) => mission.status === "À valider" || mission.status === "En cours").length;
    function openMission(mission: Mission) {
    setSelected(mission);
    setNotes(mission.auditorNote);
    setSaved(false);
  }

  async function saveNote() {
    if (!selected || !auditorId || selected.id.startsWith("company-")) return;
    const { error } = await supabase.from("audit_notes").upsert({
      audit_id: selected.id,
      auditor_id: auditorId,
      note: notes,
      updated_at: new Date().toISOString(),
    });
    if (!error) {
      setSaved(true);
      setMissions((prev) =>
        prev.map((mission) => (mission.id === selected.id ? { ...mission, auditorNote: notes } : mission)),
      );
    }
  }
  async function validateAudit() {
    if (!selected || selected.status !== "À valider") return;
    const { error } = await supabase
      .from("audits")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", selected.id);
    if (!error) {
      setMissions((prev) =>
        prev.map((mission) =>
          mission.id === selected.id ? { ...mission, status: "Clôturée" as MissionStatus } : mission,
        ),
      );
      setSelected((prev) => (prev ? { ...prev, status: "Clôturée" as MissionStatus } : prev));
    }
  }
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-70.5 border-r border-slate-200 bg-white p-5 shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                  CyberAudit
                </p>
                <p className="text-sm font-semibold">Espace auditeur</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-10 rounded-2xl border border-primary/10 bg-primary-soft p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                <UserCircle2 className="size-5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{auditorName}</p>
                <p className="truncate text-xs text-slate-500">
                  {auditorEntity} · {auditorVerified ? "Vérifié" : "En vérification"}
                </p>
              </div>
            </div>
            <p className="mt-3 truncate text-xs text-slate-600">{email ?? "Compte auditeur"}</p>
          </div>

          <nav className="mt-8 space-y-1.5" aria-label="Navigation auditeur">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all ${activeTab === id ? "bg-primary text-primary-foreground shadow-soft" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4" />
                  {label}
                </span>
                <ChevronRight
                  className={`size-4 ${activeTab === id ? "opacity-100" : "opacity-40"}`}
                />
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Bell className="size-4" /> À traiter cette semaine
            </div>
            <p className="mt-3 text-3xl font-semibold">{actionableCount}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {actionableCount === 0 ? "Aucune mission à traiter" : "Missions à suivre ou valider"}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary/20 hover:text-primary"
          >
            <LogOut className="size-4" />
            Se déconnecter
          </button>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-9 lg:py-7">
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Ouvrir le menu"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 lg:hidden"
              >
                <Menu className="size-4" />
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Portail professionnel
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {activeTab === "overview"
                    ? `Bonjour, ${auditorName}`
                    : navItems.find((item) => item.id === activeTab)?.label}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
                <CalendarDays className="size-4" />
                {todayLabel}
              </div>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => selectTab("missions")}
                className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-primary/30 hover:text-primary"
              >
                <Bell className="size-4" />
                {actionableCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {actionableCount > 9 ? "9+" : actionableCount}
                  </span>
                )}
              </button>
              <span className="hidden size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary sm:flex">
                {auditorInitials}
              </span>
            </div>
          </header>

          <main className="py-7">
            {loadError && <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>}
            {loading && <p className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Chargement des PME et audits...</p>}
            {activeTab === "overview" && (
              <Overview missions={missions} onNavigate={selectTab} onSelect={openMission} />
            )}
            {activeTab === "missions" && (
              <MissionList
                missions={filteredMissions}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onSelect={openMission}
              />
            )}
            {activeTab === "companies" && (
              <CompanyList missions={missions} onSelect={openMission} />
            )}
            {activeTab === "reports" && <Reports missions={missions} onSelect={openMission} />}
            {activeTab === "profile" && <Profile email={email} />}
          </main>
        </div>
      </div>

      {selected && (
        <MissionDrawer
          mission={selected}
          notes={notes}
          setNotes={setNotes}
          saved={saved}
          canSaveNote={auditorId !== null && !selected.id.startsWith("company-")}
          onSave={saveNote}
          onValidate={validateAudit}
          onClose={() => {
            setSelected(null);
            setSaved(false);
          }}
        />
      )}

    </div>
  );
}

function Overview({
  missions,
  onNavigate,
  onSelect,
}: {
  missions: Mission[];
  onNavigate: (tab: AuditorTab) => void;
  onSelect: (mission: Mission) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Missions actives"
          value={String(missions.filter((mission) => mission.status !== "Clôturée").length)}
          detail="Selon les audits de la plateforme"
          icon={ClipboardCheck}
          tone="lime"
        />
        <Stat
          label="Dossiers suivis"
          value={String(new Set(missions.map((mission) => mission.company)).size)}
          detail="PME suivies"
          icon={Users}
          tone="teal"
        />
        <Stat
          label="À valider"
          value={String(missions.filter((mission) => mission.status === "À valider").length)}
          detail="Audits à valider"
          icon={BookOpenCheck}
          tone="amber"
        />
        <Stat
          label="Score moyen"
          value={
            missions.filter((mission) => mission.score !== null).length
              ? `${Math.round(
                  missions
                    .filter((mission) => mission.score !== null)
                    .reduce((total, mission) => total + (mission.score ?? 0), 0) /
                    missions.filter((mission) => mission.score !== null).length,
                )}%`
              : "—"
          }
          detail="Sur les audits avec score"
          icon={FileBarChart}
          tone="violet"
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                À suivre en priorité
              </p>
              <h2 className="mt-2 text-xl font-semibold">Votre activité cette semaine</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("missions")}
              className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex"
            >
              Toutes les missions <ArrowRight className="size-4" />
            </button>
          </div>
                   <div className="mt-6 space-y-3">
            {(() => {
              const priorityMissions = missions
                .filter((mission) => mission.status !== "Clôturée" && mission.company !== "PME non renseignée")
                .sort((a, b) => {
                  const weight: Record<MissionStatus, number> = {
                    "À valider": 0,
                    "En cours": 1,
                    "À planifier": 2,
                    Clôturée: 3,
                  };
                  return weight[a.status] - weight[b.status];
                })
                .slice(0, 3);

              if (priorityMissions.length === 0) {
                return (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Aucune mission active pour le moment — tous les dossiers sont clôturés ou aucun audit n'est encore enregistré.
                  </p>
                );
              }

              return priorityMissions.map((mission) => (
              <button
                key={mission.id}
                type="button"
                onClick={() => onSelect(mission)}
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-100 p-3 text-left transition hover:border-primary/20 hover:bg-primary-soft"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${mission.status === "À valider" ? "bg-violet-100 text-violet-700" : "bg-primary-soft text-primary"}`}
                >
                  <FileText className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{mission.company}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusStyles[mission.status]}`}
                    >
                      {mission.status}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {mission.id} · Échéance {mission.due}
                  </span>
                </span>
                <span className="text-right">
                  <span className={`block text-sm font-bold ${riskStyles[mission.risk]}`}>
                    {mission.risk}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {mission.score === null ? "Score —" : `Score ${mission.score}%`}
                  </span>
                </span>
                <ChevronRight className="size-4 text-slate-300 transition group-hover:text-primary" />
            </button>
              ));
            })()}
          </div>
        </div>
        <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-soft">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/80">
            Qualité d'audit
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {missions.length === 0 ? "Aucune donnée PME disponible." : "Votre activité auditeur"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
            {missions.length === 0
              ? "Les PME et audits disponibles apparaîtront ici."
              : `${missions.filter((mission) => mission.status === "Clôturée").length} audit(s) clôturé(s) sur ${missions.length}.`}
          </p>
          <div className="mt-7 h-2 rounded-full bg-primary-foreground/20">
            <div
              className="h-2 rounded-full bg-primary-foreground"
              style={{
                width: `${missions.length ? Math.round((missions.filter((mission) => mission.status === "Clôturée").length / missions.length) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-primary-foreground/70">
            <span>Progression du mois</span>
            <span className="font-semibold text-white">
              {missions.length ? Math.round((missions.filter((mission) => mission.status === "Clôturée").length / missions.length) * 100) : 0}%
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("reports")}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-primary-foreground/15 px-3 py-2 text-sm font-semibold transition hover:bg-primary-foreground/25"
          >
            Voir les rapports <ArrowRight className="size-4" />
          </button>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Calendrier</p>
            <h2 className="mt-2 text-xl font-semibold">Prochaines échéances</h2>
          </div>
          <CalendarDays className="size-5 text-slate-400" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {missions.filter((mission) => mission.status !== "Clôturée").slice(0, 3).map((mission) => (
            <Deadline key={mission.id} date={mission.due} title={`${mission.status} · ${mission.company}`} urgent={mission.status === "À valider"} />
          ))}
          {missions.filter((mission) => mission.status !== "Clôturée").length === 0 && (
            <p className="text-sm text-slate-500">Aucune échéance active.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "lime" | "teal" | "amber" | "violet";
}) {
  const tones = {
    lime: "bg-primary-soft text-primary",
    teal: "bg-primary-soft text-primary",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`flex size-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-5" />
        </span>
          <span className="text-xs text-slate-400">
          {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date())}
        </span>
      </div>
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs font-medium text-primary">{detail}</p>
    </div>
  );
}

function Deadline({
  date,
  title,
  urgent = false,
}: {
  date: string;
  title: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${urgent ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50"}`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wider ${urgent ? "text-rose-600" : "text-slate-400"}`}
      >
        {date}
      </p>
      <p className="mt-2 text-sm font-semibold leading-5">{title}</p>
    </div>
  );
}

function MissionList({
  missions: filtered,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  onSelect,
}: {
  missions: Mission[];
  query: string;
  setQuery: (value: string) => void;
  statusFilter: MissionStatus | "Toutes";
  setStatusFilter: (value: MissionStatus | "Toutes") => void;
  onSelect: (mission: Mission) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Portefeuille</p>
          <h2 className="mt-2 text-2xl font-semibold">Mes missions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pilotez vos évaluations et gardez chaque livrable sous contrôle.
          </p>
        </div>

      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une PME ou une référence"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as MissionStatus | "Toutes")}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
        >
          <option>Toutes</option>
          <option>À planifier</option>
          <option>En cours</option>
          <option>À valider</option>
          <option>Clôturée</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr] gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 md:grid">
          <span>Entreprise</span>
          <span>Statut</span>
          <span>Progression</span>
          <span>Échéance</span>
          <span>Risque</span>
        </div>
        {filtered.map((mission) => (
          <button
            key={mission.id}
            type="button"
            onClick={() => onSelect(mission)}
            className="grid w-full gap-3 border-b border-slate-100 px-5 py-4 text-left transition last:border-0 hover:bg-primary-soft md:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr] md:items-center md:gap-4"
          >
            <span>
              <span className="font-semibold">{mission.company}</span>
              <span className="mt-1 block text-xs text-slate-500">
                {mission.id} · {mission.sector}
              </span>
            </span>
            <span
              className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[mission.status]}`}
            >
              {mission.status}
            </span>
            <span>
              <span className="flex justify-between text-xs text-slate-500 md:hidden">
                <span>Progression</span>
                <span>{mission.progress}%</span>
              </span>
              <span className="mt-2 block h-1.5 rounded-full bg-slate-100 md:mt-0">
                <span
                  className="block h-1.5 rounded-full bg-primary"
                  style={{ width: `${mission.progress}%` }}
                />
              </span>
            </span>
            <span className="text-sm text-slate-600">{mission.due}</span>
            <span className={`text-sm font-semibold ${riskStyles[mission.risk]}`}>
              {mission.risk}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            Aucune mission ne correspond à votre recherche.
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyList({
  missions: all,
  onSelect,
}: {
  missions: Mission[];
  onSelect: (mission: Mission) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Relation client
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Dossiers PME</h2>
        <p className="mt-1 text-sm text-slate-500">
          Retrouvez les entreprises accompagnées et leur dernière activité.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {all.map((mission) => (
          <button
            key={mission.company}
            type="button"
            onClick={() => onSelect(mission)}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lift"
          >
            <div className="flex items-start justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Users className="size-5" />
              </span>
              <span className={`text-xs font-semibold ${riskStyles[mission.risk]}`}>
                {mission.risk} risque
              </span>
            </div>
            <h3 className="mt-5 font-semibold">{mission.company}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {mission.sector} · {mission.size} · {mission.region}
            </p>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>Dernier contact</span>
              <span className="font-medium text-slate-700">{mission.updated}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Reports({ missions, onSelect }: { missions: Mission[]; onSelect: (mission: Mission) => void }) {
  const reports = missions.filter((mission) => mission.score !== null);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Livrables</p>
        <h2 className="mt-2 text-2xl font-semibold">Rapports d'audit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Téléchargez et partagez les rapports finalisés avec vos clients.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.5fr_1fr_0.7fr_0.5fr] gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:grid">
          <span>Rapport</span>
          <span>Entreprise</span>
          <span>Date</span>
          <span />
        </div>
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid sm:grid-cols-[1.5fr_1fr_0.7fr_0.5fr]"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <FileText className="size-4" />
              </span>
              <span className="text-sm font-semibold">Rapport de diagnostic cybersécurité</span>
            </span>
            <span className="text-sm text-slate-600">{report.company}</span>
            <span className="text-sm text-slate-500">{report.due}</span>
            <span className="ml-auto flex items-center gap-1">
            <button
                type="button"
                aria-label={`Voir le rapport de ${report.company}`}
                onClick={() => generateMissionReport(report, "view")}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
              >
                <Eye className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Télécharger le rapport de ${report.company}`}
                onClick={() => generateMissionReport(report, "download")}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
              >
                <Download className="size-4" />
              </button>
            </span>
            <span className="w-full text-xs text-primary sm:hidden">
              Score final : {report.score}%
            </span>
          </div>
        ))}
        {reports.length === 0 && (
          <p className="p-10 text-center text-sm text-slate-500">
            Aucun rapport finalisé dans les audits disponibles.
          </p>
        )}
      </div>
    </div>
  );
}

function Profile({ email }: { email: string | null }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [entity, setEntity] = useState("");
  const [verified, setVerified] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);
      const [{ data: profile }, { data: auditorProfile }] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
        supabase.from("auditor_profiles").select("entity, verified").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
      setEntity(auditorProfile?.entity ?? "");
      setVerified(Boolean(auditorProfile?.verified));
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);
    setMessage(null);
    const [{ error: profileError }, { error: auditorError }] = await Promise.all([
      supabase.from("profiles").update({ first_name: firstName.trim(), last_name: lastName.trim() }).eq("id", userId),
      supabase.from("auditor_profiles").update({ entity: entity.trim() }).eq("user_id", userId),
    ]);
    setSaving(false);
    if (profileError || auditorError) {
      setMessage("Une erreur est survenue, réessayez.");
    } else {
      setMessage("Profil mis à jour avec succès.");
      setEditing(false);
    }
  }

  const fullName = formatAuditorName(firstName, lastName);
  const initials =
    (fullName || email || "AU")
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AU";

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Identité professionnelle
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Mon profil auditeur</h2>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-xl font-bold text-primary">
            {initials}
          </span>
          <div>
            <h3 className="text-lg font-semibold">{fullName || "Auditeur CyberAudit"}</h3>
            <p className="text-sm text-slate-500">{email ?? "Compte auditeur"}</p>
          </div>
          <span
            className={`sm:ml-auto inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
          >
            <CheckCircle2 className="size-3.5" /> {verified ? "Profil vérifié" : "Profil en vérification"}
          </span>
        </div>

        {message && (
          <p className="mt-4 rounded-xl bg-primary-soft px-4 py-2 text-sm text-primary">{message}</p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {editing ? (
            <>
              <label className="block">
                <span className="text-xs text-slate-500">Prénom</span>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Nom</span>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Organisme</span>
                <input
                  value={entity}
                  onChange={(event) => setEntity(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </label>
              <ProfileField label="Email professionnel" value={email ?? "Non renseigné"} />
            </>
          ) : (
            <>
              <ProfileField label="Prénom et nom" value={fullName || "Non renseigné"} />
              <ProfileField label="Organisme" value={entity || "Non renseigné"} />
              <ProfileField label="Fonction" value="Auditeur cybersécurité" />
              <ProfileField label="Email professionnel" value={email ?? "Non renseigné"} />
            </>
          )}
        </div>

        {editing ? (
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            <Settings className="size-4" />
            Modifier mes informations
          </button>
        )}
      </section>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function MissionDrawer({
  mission,
  notes,
  setNotes,
  saved,
  canSaveNote,
  onSave,
  onValidate,
  onClose,
}: {
  mission: Mission;
  notes: string;
  setNotes: (value: string) => void;
  saved: boolean;
  canSaveNote: boolean;
  onSave: () => void;
  onValidate: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 p-0 sm:p-4"
      onClick={onClose}
    >
      <section
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
               <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Dossier {mission.id}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{mission.company}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {mission.sector} · {mission.size} · {mission.region}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer le dossier"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[mission.status]}`}>
            {mission.status}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Échéance</p>
            <p className="mt-1 text-sm font-semibold">{mission.due}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Score de maturité</p>
            <p className="mt-1 text-sm font-semibold">
              {mission.score === null ? "Non disponible" : `${mission.score}%`}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Avancement de la mission</span>
            <span className="font-bold text-primary">{mission.progress}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${mission.progress}%` }}
            />
          </div>
        </div>
        <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Point d'attention
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            {mission.score === null
              ? "Audit non finalisé par la PME : aucun point d'attention disponible pour le moment."
              : mission.risk === "Élevé"
                ? `Score de maturité faible (${mission.score}%) : recommandé de revoir les mesures de sécurité en priorité avec la PME.`
                : mission.risk === "Modéré"
                  ? `Score correct (${mission.score}%), mais plusieurs axes restent à renforcer avant validation.`
                  : `Bon niveau de maturité (${mission.score}%) : le dossier peut être validé.`}
          </p>
        </div>
                {mission.domains.length > 0 && (
          <div className="mt-7">
            <p className="text-sm font-semibold">Détail par domaine</p>
            <div className="mt-3 space-y-2">
              {mission.domains.map((domain) => (
                <div key={domain.name} className="flex items-center gap-3">
                  <span className="w-48 shrink-0 text-xs text-slate-500">{domain.name}</span>
                  <span className="h-2 flex-1 rounded-full bg-slate-100">
                    <span
                      className="block h-2 rounded-full bg-primary"
                      style={{ width: `${domain.score}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs font-semibold">{domain.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mission.recommendations.length > 0 && (
          <div className="mt-7">
            <p className="text-sm font-semibold">Recommandations (vues par la PME)</p>
            <ul className="mt-3 space-y-2">
              {mission.recommendations.map((item) => (
                <li key={item.question} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="text-xs text-slate-500">{item.question}</p>
                  <p className="mt-1 text-slate-700">{item.recommendation}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <label className="mt-7 block">
          <span className="text-sm font-semibold">Notes de suivi</span>
          <textarea
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
            placeholder="Ajoutez une note pour votre prochain échange..."
            rows={5}
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </label>
               <button
          type="button"
          onClick={onSave}
          disabled={!canSaveNote}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saved ? <CheckCircle2 className="size-4" /> : <Archive className="size-4" />}
          {saved ? "Note enregistrée" : "Enregistrer la note"}
        </button>

        {mission.status === "À valider" && (
          <button
            type="button"
            onClick={onValidate}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle2 className="size-4" />
            Valider l'audit et clôturer le dossier
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600"
        >
          Fermer le dossier
        </button>
      </section>
    </div>
  );
}
function generateMissionReport(mission: Mission, mode: "view" | "download") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport d'audit cybersécurité", margin, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Entreprise : ${mission.company}`, margin, y);
  y += 7;
  doc.text(`Secteur : ${mission.sector} · Taille : ${mission.size} · Région : ${mission.region}`, margin, y);
  y += 7;
  doc.text(`Dossier : ${mission.id}`, margin, y);
  y += 7;
  doc.text(`Statut : ${mission.status}`, margin, y);
  y += 7;
  doc.text(`Échéance : ${mission.due}`, margin, y);
  y += 10;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(
    mission.score === null ? "Score de maturité : non disponible" : `Score de maturité : ${mission.score}%`,
    margin,
    y,
  );
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Niveau de risque évalué : ${mission.risk}`, margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Point d'attention", margin, y);
  y += 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const attentionText =
    mission.score === null
      ? "Audit non finalisé par la PME."
      : mission.risk === "Élevé"
        ? `Score de maturité faible (${mission.score}%) : recommandé de revoir les mesures de sécurité en priorité avec la PME.`
        : mission.risk === "Modéré"
          ? `Score correct (${mission.score}%), mais plusieurs axes restent à renforcer avant validation.`
          : `Bon niveau de maturité (${mission.score}%) : le dossier peut être validé.`;
  const wrappedAttention = doc.splitTextToSize(attentionText, pageWidth - margin * 2);
  doc.text(wrappedAttention, margin, y);
  y += wrappedAttention.length * 6 + 8;
    if (mission.domains.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Détail par domaine", margin, y);
    y += 7;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    mission.domains.forEach((domain) => {
      doc.text(`${domain.name} : ${domain.score}%`, margin, y);
      y += 6;
    });
    y += 4;
  }

  if (mission.recommendations.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Recommandations", margin, y);
    y += 7;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    mission.recommendations.forEach((item) => {
      const wrapped = doc.splitTextToSize(`• ${item.recommendation}`, pageWidth - margin * 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 6 + 2;
    });
    y += 4;
  }
  if (mission.auditorNote) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Notes de l'auditeur", margin, y);
    y += 7;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const wrappedNote = doc.splitTextToSize(mission.auditorNote, pageWidth - margin * 2);
    doc.text(wrappedNote, margin, y);
  }

  const filename = `rapport-audit-${mission.company.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  if (mode === "download") {
    doc.save(filename);
  } else {
    window.open(doc.output("bloburl"), "_blank");
  }
}