import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCircle2,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuditorSpace } from "@/components/auditor-space";

const title = "Mon espace — CyberAudit PME";
const description = "Votre espace personnel CyberAudit PME.";

type TabId = "overview" | "profile" | "settings" | "history" | "audit";
type AuditStatus = "Validé" | "En cours" | "À revoir";

type AuditRecord = {
  id: number;
  name: string;
  date: string;
  score: number;
  status: AuditStatus;
  scope: string;
};

const navItems: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profil", icon: UserCircle2 },
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "history", label: "Historique", icon: History },
  { id: "audit", label: "Audit", icon: ShieldCheck },
];

const overviewStats = [
  { label: "Score global", value: "82%", delta: "+8 pts", color: "bg-emerald-500", icon: Target },
  {
    label: "Audits réalisés",
    value: "14",
    delta: "2 ce mois",
    color: "bg-blue-500",
    icon: FileText,
  },
  {
    label: "Risques critiques",
    value: "03",
    delta: "-2 depuis le dernier audit",
    color: "bg-amber-500",
    icon: AlertTriangle,
  },
  {
    label: "Plan d’action",
    value: "89%",
    delta: "7 actions en cours",
    color: "bg-violet-500",
    icon: TrendingUp,
  },
];

const domains = [
  { name: "Gouvernance", score: 90 },
  { name: "Sécurité des accès", score: 84 },
  { name: "Sauvegarde", score: 76 },
  { name: "Sensibilisation", score: 88 },
  { name: "Réponse d’incident", score: 72 },
  { name: "Données & conformité", score: 81 },
];

const auditHistory: AuditRecord[] = [
  {
    id: 1042,
    name: "Audit de conformité",
    date: "12 mai 2026",
    score: 86,
    status: "Validé",
    scope: "Risque / Gouvernance",
  },
  {
    id: 1039,
    name: "Maturité IAM",
    date: "26 avril 2026",
    score: 74,
    status: "En cours",
    scope: "Accès / Identité",
  },
  {
    id: 1031,
    name: "Audit sécurité réseau",
    date: "18 mars 2026",
    score: 68,
    status: "À revoir",
    scope: "Infrastructure",
  },
  {
    id: 1025,
    name: "Sensibilisation et phishing",
    date: "05 février 2026",
    score: 91,
    status: "Validé",
    scope: "RH / Culture",
  },
  {
    id: 1018,
    name: "Plan de continuité",
    date: "12 janvier 2026",
    score: 78,
    status: "Validé",
    scope: "Récup / Continuité",
  },
];

const auditAxes = [
  {
    name: "Contexte de l'entreprise",
    noted: false,
    questions: [
      [
        "Le système informatique est-il indispensable au fonctionnement quotidien de l'entreprise ?",
        ["Non", "Oui"],
      ],
      [
        "Une panne informatique de plusieurs jours aurait-elle un impact important sur l'activité ?",
        ["Non", "Oui"],
      ],
      [
        "La perte ou la modification accidentelle de données aurait-elle des conséquences importantes ?",
        ["Non", "Oui"],
      ],
      [
        "Une fuite d'informations sensibles (clients, finances) nuirait-elle gravement à l'entreprise ?",
        ["Non", "Oui"],
      ],
      [
        "L'entreprise évolue-t-elle dans un secteur très concurrentiel où l'information a de la valeur ?",
        ["Non", "Oui"],
      ],
      [
        "Le système informatique est-il connecté à internet ou à des partenaires externes ?",
        ["Non", "Oui"],
      ],
    ],
  },
  {
    name: "Gouvernance et organisation",
    noted: true,
    questions: [
      [
        "Avez-vous mis en place des règles de sécurité informatique dans votre entreprise ?",
        [
          "Aucune règle définie : chacun fait comme il veut.",
          "Quelques règles existent, mais elles sont seulement dites à l'oral et pas toujours suivies.",
          "Des règles sont suivies au quotidien par les employés, mais elles ne sont écrites nulle part.",
          "Il existe un document écrit avec les règles de sécurité, distribué à tous les employés.",
        ],
      ],
      [
        "Une personne est-elle chargée de s'occuper de la sécurité informatique de l'entreprise ?",
        [
          "Personne ne s'occupe de la sécurité informatique.",
          "Quelqu'un s'en occupe de temps en temps, sans que ce soit son rôle officiel.",
          "Une personne s'en occupe régulièrement, mais ce n'est pas écrit dans ses fonctions.",
          "Une personne est officiellement désignée responsable, et tout le monde le sait.",
        ],
      ],
      [
        "Savez-vous exactement quels ordinateurs et logiciels sont utilisés dans votre entreprise ?",
        [
          "Aucune liste n'existe : personne ne sait précisément ce qui est utilisé.",
          "Une liste existe mais elle est incomplète et rarement mise à jour.",
          "Une liste existe et elle est mise à jour de temps en temps, mais pas systématiquement.",
          "Une liste complète existe et elle est tenue à jour à chaque changement.",
        ],
      ],
      [
        "Réfléchissez-vous régulièrement aux risques informatiques qui menacent votre entreprise (virus, panne, vol) ?",
        [
          "Jamais : ces risques ne sont pas évalués.",
          "De temps en temps, mais sans méthode particulière ni suivi.",
          "Régulièrement, en général une fois dans l'année.",
          "Au moins une fois par an, de façon organisée et structurée.",
        ],
      ],
    ],
  },
  {
    name: "Accès, mots de passe et réseau",
    noted: true,
    questions: [
      [
        "Chaque employé possède-t-il son propre compte pour se connecter aux ordinateurs et aux logiciels ?",
        [
          "Non : plusieurs employés utilisent le même identifiant et le même mot de passe.",
          "Une partie seulement des employés a un compte individuel.",
          "Tous les employés ont un compte individuel.",
          "Tous les employés ont un compte individuel, et l'entreprise vérifie qui accède à quoi.",
        ],
      ],
      [
        "Comment sont gérés les mots de passe dans votre entreprise ?",
        [
          "Il n'y a aucune règle particulière sur les mots de passe.",
          "Il existe des règles de base, mais les mots de passe sont rarement changés.",
          "Les mots de passe sont corrects, et changés de temps en temps.",
          "Les mots de passe sont complexes (lettres, chiffres, symboles) et changés régulièrement.",
        ],
      ],
      [
        "Quand un employé quitte l'entreprise, ses accès informatiques sont-ils supprimés ?",
        [
          "Non, jamais fait : d'anciens employés peuvent encore avoir accès.",
          "Cela arrive, mais souvent avec du retard.",
          "Cela est fait la plupart du temps.",
          "Cela est fait systématiquement, dès le jour du départ de l'employé.",
        ],
      ],
      [
        "Le réseau Wi-Fi de votre entreprise est-il protégé ?",
        [
          "Non, il n'y a pas de mot de passe sur le Wi-Fi.",
          "Il y a un mot de passe, mais il est le même pour les employés et pour les visiteurs.",
          "Il y a un mot de passe, mais il est connu et partagé largement.",
          "Il existe un réseau séparé pour les visiteurs et un réseau protégé pour les employés.",
        ],
      ],
      [
        "Les ordinateurs de votre entreprise sont-ils protégés par un antivirus ?",
        [
          "Non, aucun antivirus n'est installé.",
          "Un antivirus est installé sur certains ordinateurs seulement.",
          "Un antivirus est installé partout, mais il n'est pas toujours mis à jour.",
          "Un antivirus est installé et mis à jour sur tous les ordinateurs.",
        ],
      ],
    ],
  },
  {
    name: "Sensibilisation et sécurité humaine",
    noted: true,
    questions: [
      [
        "Vos employés sont-ils informés des risques liés à internet et aux emails (virus, arnaques) ?",
        [
          "Non, aucune information n'est donnée à ce sujet.",
          "Quelques conseils sont donnés de temps en temps, de manière informelle.",
          "Une information est donnée de temps en temps, mais sans régularité.",
          "Une formation ou une information est organisée au moins une fois par an.",
        ],
      ],
      [
        "Vos employés savent-ils reconnaître un email suspect ou une tentative d'arnaque (phishing) ?",
        [
          "Non, les employés ne sont pas informés sur ce sujet.",
          "Quelques employés seulement savent reconnaître un email suspect.",
          "La plupart des employés savent le reconnaître.",
          "Tous les employés savent reconnaître un email suspect et savent quoi faire.",
        ],
      ],
      [
        "L'accès aux locaux où se trouvent les ordinateurs et serveurs importants est-il protégé ?",
        [
          "Non, aucune protection particulière (portes ouvertes, accès libre).",
          "Quelques précautions de bon sens sont prises, mais rien d'organisé.",
          "L'accès à certaines zones sensibles est limité.",
          "L'accès est strictement contrôlé, par exemple avec une porte fermée à clé ou un badge.",
        ],
      ],
      [
        "Les informations confidentielles (données des clients, dossiers du personnel) sont-elles protégées ?",
        [
          "Non, aucune protection particulière n'est mise en place.",
          "L'accès est limité, mais de façon informelle, sans règle précise.",
          "L'accès est restreint, mais ce n'est pas écrit officiellement.",
          "L'accès est restreint et protégé, par exemple par un mot de passe ou un dossier réservé.",
        ],
      ],
    ],
  },
  {
    name: "Sauvegarde, incidents et conformité",
    noted: true,
    questions: [
      [
        "Les données importantes de votre entreprise (factures, clients, documents) sont-elles sauvegardées ?",
        [
          "Non, il n'y a aucune sauvegarde.",
          "Une sauvegarde est faite de temps en temps, sans planification.",
          "Une sauvegarde est faite régulièrement, mais elle n'est jamais vérifiée.",
          "Une sauvegarde est faite régulièrement et son bon fonctionnement est vérifié.",
        ],
      ],
      [
        "Où sont conservées les sauvegardes de vos données ?",
        [
          "Toujours au même endroit que les données d'origine (même ordinateur ou serveur).",
          "Une copie est faite ailleurs, mais seulement de temps en temps.",
          "Une copie est faite ailleurs régulièrement.",
          "Les sauvegardes sont toujours conservées ailleurs (disque externe ou cloud).",
        ],
      ],
      [
        "En cas de problème informatique (panne, piratage), vos employés savent-ils quoi faire ?",
        [
          "Non, il n'existe aucune consigne à ce sujet.",
          "On réagit au cas par cas, sans règle précise.",
          "Certaines consignes existent et sont connues de quelques personnes seulement.",
          "Il existe une procédure écrite, connue de tous les employés.",
        ],
      ],
      [
        "Si votre système informatique tombait en panne pendant plusieurs jours, votre entreprise pourrait-elle continuer à fonctionner ?",
        [
          "Non, aucun plan n'est prévu pour ce genre de situation.",
          "Quelques solutions de secours existent, mais de façon ponctuelle.",
          "Un plan existe, mais il n'est pas complet ni testé.",
          "Un plan complet existe et a déjà été testé pour vérifier qu'il fonctionne.",
        ],
      ],
      [
        "Votre entreprise respecte-t-elle les règles marocaines sur la protection des données personnelles (loi 09-08) ?",
        [
          "Non, ces règles ne sont pas respectées.",
          "Elles sont respectées de façon isolée, sans démarche organisée.",
          "Elles sont généralement respectées.",
          "Elles sont respectées et l'entreprise vérifie régulièrement qu'elle est en conformité.",
        ],
      ],
    ],
  },
] as const;

const auditQuestions = auditAxes.flatMap((axis) =>
  axis.questions.map(([question, options]) => ({
    category: axis.name,
    noted: axis.noted,
    question,
    options,
  })),
);

type AuditQuestion = {
  id: string | null;
  category: string;
  noted: boolean;
  question: string;
  options: string[];
};

const fallbackQuestions: AuditQuestion[] = auditQuestions.map((question) => ({
  ...question,
  id: null,
  options: [...question.options],
}));

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
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"pme" | "auditor" | "admin" | "unknown">("unknown");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [auditStarted, setAuditStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questions, setQuestions] = useState<AuditQuestion[]>(fallbackQuestions);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
      setUserId(session.user.id);
      setEmail(session.user.email ?? null);

      try {
        const [{ data: roleRows }, { data: profile }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", session.user.id),
          supabase.from("profiles").select("account_type").eq("id", session.user.id).maybeSingle(),
        ]);

        const roles = (roleRows ?? []).map((row) => row.role);
        const detectedRole = roles.includes("auditor")
          ? "auditor"
          : roles.includes("admin")
            ? "admin"
            : profile?.account_type === "auditor"
              ? "auditor"
              : "pme";

        setRole(detectedRole);

        if (detectedRole === "pme") {
          const [{ data: company }, { data: questionRows }] = await Promise.all([
            supabase.from("companies").select("id").eq("owner_id", session.user.id).maybeSingle(),
            supabase
              .from("audit_questions")
              .select("id, axis, question, options, noted, sort_order")
              .eq("active", true)
              .order("sort_order", { ascending: true }),
          ]);

          if (questionRows?.length) {
            setQuestions(
              questionRows.map((question) => ({
                id: question.id,
                category: question.axis,
                noted: question.noted,
                question: question.question,
                options: Array.isArray(question.options)
                  ? question.options.filter(
                      (option): option is string => typeof option === "string",
                    )
                  : [],
              })),
            );
          }

          if (company) {
            const { data: draft } = await supabase
              .from("audits")
              .select("id")
              .eq("owner_id", session.user.id)
              .eq("company_id", company.id)
              .eq("status", "draft")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (draft) {
              setAuditId(draft.id);
              const { data: savedAnswers } = await supabase
                .from("audit_answers")
                .select("question_id, answer")
                .eq("audit_id", draft.id);

              if (savedAnswers?.length && questionRows?.length) {
                const questionIndexes = new Map(
                  questionRows.map((question, index) => [question.id, index]),
                );
                setAnswers(
                  Object.fromEntries(
                    savedAnswers.flatMap((answer) => {
                      const index = questionIndexes.get(answer.question_id);
                      return index === undefined ? [] : [[index, answer.answer]];
                    }),
                  ),
                );
              }
            }
          }
        }
      } catch {
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_type")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile?.account_type === "auditor") {
          setRole("auditor");
        } else {
          setRole("pme");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [navigate]);

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const scorePercent = useMemo(() => {
    const scoredAnswers = Object.entries(answers).filter(
      ([questionIndex]) => questions[Number(questionIndex)]?.noted,
    );

    if (scoredAnswers.length === 0) return 0;

    const total = scoredAnswers.reduce(
      (sum, [questionIndex, value]) =>
        sum + questions[Number(questionIndex)].options.indexOf(value),
      0,
    );
    return Math.round((total / (scoredAnswers.length * 3)) * 100);
  }, [answers, questions]);

  const currentQuestionData = questions[currentQuestion];

  async function handleLogout() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  async function handleAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: value }));

    const questionId = currentQuestionData.id;
    if (auditId && questionId) {
      const { error } = await supabase.from("audit_answers").upsert(
        {
          audit_id: auditId,
          question_id: questionId,
          answer: value,
          score: currentQuestionData.noted ? currentQuestionData.options.indexOf(value) : null,
        },
        { onConflict: "audit_id,question_id" },
      );

      if (error) setAuditError("La réponse n'a pas pu être enregistrée. Réessayez.");
    }

    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  }

  async function startAudit() {
    setAuditError(null);
    if (auditId) {
      setAuditStarted(true);
      return;
    }

    if (!userId) return;
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (!company) {
      setAuditError("Votre entreprise n'est pas encore configurée.");
      return;
    }

    const { data: audit, error } = await supabase
      .from("audits")
      .insert({ company_id: company.id, owner_id: userId })
      .select("id")
      .single();

    if (error || !audit) {
      console.error("startAudit error:", error);
      setAuditError(
        `Impossible de démarrer l'audit. Vérifiez que la base de données est à jour. (${error?.message ?? "erreur inconnue"})`,
      );
      return;
    }

    setAuditId(audit.id);
    setAuditStarted(true);
  }

  function resetAudit() {
    setAuditStarted(false);
    setCurrentQuestion(0);
    setAnswers({});
    setReportGenerated(false);
    setActiveTab("audit");
  }

  async function generateReport() {
    if (auditId) {
      await supabase
        .from("audits")
        .update({
          status: "submitted",
          score: scorePercent,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", auditId);
    }
    setReportGenerated(true);
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

  if (role === "auditor") {
    return <AuditorSpace email={email} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-5 lg:px-6">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[280px] border-r border-slate-200 bg-white p-5 shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  PME
                </p>
                <p className="text-sm font-semibold">CyberAudit</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="rounded-lg border border-slate-200 p-2 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-primary/10 bg-primary-soft p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Entreprise</p>
                <p className="text-xs text-slate-500">ABY SAS</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{email ?? "Compte connecté"}</p>
            <div className="mt-3 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              Sécurité active
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                <ChevronRight className="h-4 w-4 opacity-70" />
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Bell className="h-4 w-4 text-primary" />
              Alertes
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">3</p>
            <p className="text-xs text-slate-500">Nouveaux points à traiter cette semaine</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary/20 hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="rounded-xl border border-slate-200 p-2 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Espace PME
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Tableau de bord
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                17 août 2026
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:-translate-y-0.5"
              >
                <Sparkles className="h-4 w-4" />
                Démarrer un audit
              </button>
            </div>
          </header>

          <main className="space-y-6">
            {activeTab === "overview" && (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {overviewStats.map(({ label, value, delta, color, icon: Icon }) => (
                    <div
                      key={label}
                      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color} text-white`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                          {delta}
                        </span>
                      </div>
                      <p className="mt-5 text-sm text-slate-500">{label}</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {value}
                      </p>
                    </div>
                  ))}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Maturité
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-slate-900">
                          Score par domaine
                        </h2>
                      </div>
                      <div className="rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
                        82/100
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {domains.map((domain) => (
                        <div key={domain.name}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">{domain.name}</span>
                            <span className="text-slate-500">{domain.score}%</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-slate-100">
                            <div
                              className="h-2.5 rounded-full bg-gradient-to-r from-primary to-cyan-500"
                              style={{ width: `${domain.score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Synthèse
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Priorités</h2>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center gap-2 text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-semibold">Priorité 1</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          Renforcer les accès privilégiés et la politique MFA.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Clock3 className="h-4 w-4" />
                          <span className="font-semibold">Priorité 2</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          Créer des sauvegardes et tests de restauration trimestriels.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-semibold">Priorité 3</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          Le programme de sensibilisation est bien avancé et à consolider.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Audits
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-900">
                        Tableau des évaluations
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("audit")}
                      className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary-soft px-3 py-2 text-sm font-medium text-primary"
                    >
                      Nouveau diagnostic
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-sm text-slate-500">
                          <th className="pb-3 pr-4 font-medium">Audit</th>
                          <th className="pb-3 pr-4 font-medium">Date</th>
                          <th className="pb-3 pr-4 font-medium">Périmètre</th>
                          <th className="pb-3 pr-4 font-medium">Score</th>
                          <th className="pb-3 font-medium">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditHistory.map((audit) => (
                          <tr key={audit.id} className="border-b border-slate-100 text-sm">
                            <td className="py-4 pr-4 font-medium text-slate-800">{audit.name}</td>
                            <td className="py-4 pr-4 text-slate-600">{audit.date}</td>
                            <td className="py-4 pr-4 text-slate-600">{audit.scope}</td>
                            <td className="py-4 pr-4">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                                {audit.score}%
                              </span>
                            </td>
                            <td className="py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  audit.status === "Validé"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : audit.status === "En cours"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {audit.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {activeTab === "profile" && (
              <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Profil
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    Informations de l’entreprise
                  </h2>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Raison sociale</p>
                      <p className="mt-2 text-lg font-semibold">ABY SAS</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Secteur</p>
                      <p className="mt-2 text-lg font-semibold">Services numériques</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Effectif</p>
                      <p className="mt-2 text-lg font-semibold">42 collaborateurs</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Contact</p>
                      <p className="mt-2 text-lg font-semibold">
                        {email ?? "contact@entreprise.ma"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Progression
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Complétude du profil
                  </h3>

                  <div className="mt-6 rounded-2xl bg-primary-soft p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Profil complet</span>
                      <span className="text-sm font-semibold text-primary">92%</span>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-white">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-primary to-cyan-500"
                        style={{ width: "92%" }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                      <span>Documentation sécurité</span>
                      <span className="font-semibold text-emerald-600">OK</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                      <span>Autorisations / rôles</span>
                      <span className="font-semibold text-emerald-600">OK</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                      <span>Plan d’action</span>
                      <span className="font-semibold text-amber-600">En cours</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === "settings" && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Paramètres
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Gestion de votre espace</h2>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Nom de l’entreprise
                      </span>
                      <input
                        defaultValue="ABY SAS"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none ring-0 transition focus:border-primary"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Adresse e-mail
                      </span>
                      <input
                        defaultValue={email ?? "contact@entreprise.ma"}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none ring-0 transition focus:border-primary"
                      />
                    </label>
                  </div>

                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Fréquence des alertes
                      </span>
                      <select
                        defaultValue="hebdomadaire"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-primary"
                      >
                        <option value="hebdomadaire">Hebdomadaire</option>
                        <option value="mensuelle">Mensuelle</option>
                        <option value="quotidienne">Quotidienne</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Zone de sécurité
                      </span>
                      <select
                        defaultValue="maroc"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-primary"
                      >
                        <option value="maroc">Maroc / Europe</option>
                        <option value="afrique">Afrique</option>
                        <option value="monde">Monde entier</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                  >
                    Réinitialiser
                  </button>
                </div>
              </section>
            )}

            {activeTab === "history" && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Historique
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      Suivi des évaluations
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    <Download className="h-4 w-4" />
                    Exporter
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {auditHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{item.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.date} • {item.scope}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                            {item.score}%
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.status === "Validé"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.status === "En cours"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "audit" && (
              <section className="space-y-6">
                {auditError && (
                  <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {auditError}
                  </p>
                )}
                {!auditStarted ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Audit
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-slate-900">
                          Diagnostic cybersécurité PME
                        </h2>
                        <p className="mt-3 max-w-2xl text-slate-600">
                          Évaluez votre niveau de maturité sur 5 axes, précédés d’un contexte
                          d’entreprise non noté : gouvernance, accès, sensibilisation, sauvegarde,
                          incidents et conformité.
                        </p>
                      </div>
                      <div className="rounded-2xl bg-primary-soft p-4 text-right">
                        <p className="text-sm text-slate-500">Durée estimée</p>
                        <p className="text-2xl font-bold text-primary">10 min</p>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <Gauge className="h-5 w-5 text-primary" />
                        <p className="mt-3 text-lg font-semibold text-slate-900">5 axes notés</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Une vision claire de votre posture.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <BriefcaseBusiness className="h-5 w-5 text-primary" />
                        <p className="mt-3 text-lg font-semibold text-slate-900">Adapté PME</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Questions simples et orientées décision.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <FileText className="h-5 w-5 text-primary" />
                        <p className="mt-3 text-lg font-semibold text-slate-900">
                          Rapport exportable
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Un plan d’action prêt à partager.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void startAudit()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
                      >
                        Commencer l’audit
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("overview")}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700"
                      >
                        Retour au dashboard
                      </button>
                    </div>
                  </div>
                ) : !reportGenerated ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Question {currentQuestion + 1}/{totalQuestions}
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                          {currentQuestionData.category}
                        </h2>
                        {!currentQuestionData.noted && (
                          <p className="mt-2 text-sm font-medium text-primary">
                            Questions de contexte, non prises en compte dans le score
                          </p>
                        )}
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                        {answeredCount}/{totalQuestions} répondues
                      </div>
                    </div>

                    <div className="mt-6 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-cyan-500"
                        style={{
                          width: `${((answeredCount + (currentQuestion > 0 ? 1 : 0)) / totalQuestions) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="mt-8 rounded-3xl bg-slate-50 p-5">
                      <p className="text-xl font-semibold leading-relaxed text-slate-900">
                        {currentQuestionData.question}
                      </p>
                    </div>

                    <div className="mt-6 grid gap-3">
                      {currentQuestionData.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleAnswer(option)}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-primary/30 hover:bg-primary-soft"
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentQuestion((prev) => Math.max(prev - 1, 0))}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                        disabled={currentQuestion === 0}
                      >
                        Précédent
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (answeredCount === totalQuestions) {
                            generateReport();
                          } else {
                            setCurrentQuestion((prev) => Math.min(prev + 1, totalQuestions - 1));
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                      >
                        {answeredCount === totalQuestions ? "Voir les résultats" : "Suivant"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Résultats
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-slate-900">
                          Votre niveau de maturité
                        </h2>
                      </div>
                      <div className="rounded-3xl bg-primary-soft px-4 py-3 text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-primary">Score</p>
                        <p className="text-3xl font-black text-primary">{scorePercent}%</p>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Évaluation globale
                          </h3>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {scorePercent >= 80
                              ? "Mature"
                              : scorePercent >= 60
                                ? "En progression"
                                : "À renforcer"}
                          </span>
                        </div>

                        <div className="mt-6 h-3 rounded-full bg-slate-200">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-primary to-cyan-500"
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>

                        <div className="mt-6 space-y-3 text-sm text-slate-600">
                          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                            <span>Gouvernance</span>
                            <span className="font-semibold text-slate-800">90%</span>
                          </div>
                          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                            <span>Accès et identité</span>
                            <span className="font-semibold text-slate-800">84%</span>
                          </div>
                          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                            <span>Réponse et continuité</span>
                            <span className="font-semibold text-slate-800">72%</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-3xl border border-primary/10 bg-primary-soft p-5">
                          <div className="flex items-center gap-2 text-primary">
                            <Target className="h-5 w-5" />
                            <span className="font-semibold">Recommandation clé</span>
                          </div>
                          <p className="mt-3 text-sm text-slate-700">
                            Mettre en place une politique MFA obligatoire et tester les sauvegardes
                            au moins une fois par trimestre.
                          </p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5">
                          <p className="text-sm font-semibold text-slate-800">Options de rapport</p>
                          <div className="mt-4 space-y-3">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                            >
                              <span>Générer le rapport PDF</span>
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                            >
                              <span>Envoyer à la direction</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={resetAudit}
                              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                            >
                              <span>Refaire un audit</span>
                              <Zap className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
