import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
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
import { COMPANY_SIZES, REGIONS, SECTORS } from "@/lib/auth-options";

const title = "Mon espace — CyberAudit PME";
const description = "Votre espace personnel CyberAudit PME.";

type TabId = "overview" | "profile" | "settings" | "history" | "audit";
type AuditStatus = "Validé" | "En cours" | "À revoir";

type AuditRecord = {
  id: string;
  name: string;
  date: string;
  score: number | null;
  status: AuditStatus;
  scope: string;
};

type DomainRecord = {
  name: string;
  score: number;
};

const scoredQuestionCount = 18;
const maxScore = scoredQuestionCount * 3;

const recommendations: Record<number, string> = {
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

function getMaturityLevel(score: number, scoreMax = maxScore) {
  const ratio = scoreMax ? score / scoreMax : 0;
  if (ratio <= 0.25) return "Niveau 1 - Initial";
  if (ratio <= 0.5) return "Niveau 2 - Basique";
  if (ratio <= 0.75) return "Niveau 3 - Intermédiaire";
  return "Niveau 4 - Avancé";
}

function getScorePercent(score: number) {
  return Math.round((score / maxScore) * 100);
}

function getRecommendations(questions: AuditQuestion[], answers: Record<number, string>) {
  const candidates = questions.flatMap((question, index) => {
    if (!question.noted) return [];
    const answer = answers[index];
    if (!answer) return [];
    const level = question.options.indexOf(answer);
    const recommendation = recommendations[index];
    return level >= 0 && recommendation
      ? [{ category: question.category, question: question.question, recommendation, level }]
      : [];
  });

  candidates.sort((left, right) => left.level - right.level);
  const priorityCandidates = candidates.filter((candidate) => candidate.level < 3);
  const selected = priorityCandidates.slice(0, 5);

  if (selected.length < 3) {
    selected.push(
      ...candidates
        .filter((candidate) => !selected.includes(candidate))
        .slice(0, 3 - selected.length),
    );
  }

  return selected.slice(0, 5);
}

function getCategoryScores(questions: AuditQuestion[], answers: Record<number, string>) {
  const scoresByCategory = new Map<string, number[]>();

  questions.forEach((question, index) => {
    if (!question.noted) return;
    const answer = answers[index];
    const score = answer ? question.options.indexOf(answer) : -1;
    if (score < 0) return;
    const scores = scoresByCategory.get(question.category) ?? [];
    scores.push(score);
    scoresByCategory.set(question.category, scores);
  });

  return Array.from(scoresByCategory.entries()).map(([name, scores]) => ({
    name,
    score: Math.round(
      (scores.reduce((total, score) => total + score, 0) / (scores.length * 3)) * 100,
    ),
  }));
}

const navItems: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profil", icon: UserCircle2 },
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "history", label: "Historique", icon: History },
  { id: "audit", label: "Audit", icon: ShieldCheck },
];

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

const auditAxes = [
  {
    name: "Contexte et exposition aux risques",
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
        "Réfléchissez-vous régulièrement aux risques informatiques qui menacent votre entreprise (virus, panne, vol de matériel) ?",
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
  const [profileName, setProfileName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySector, setCompanySector] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyRegion, setCompanyRegion] = useState("");
  const [alertFrequency, setAlertFrequency] = useState("hebdomadaire");
  const [securityZone, setSecurityZone] = useState("maroc");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<"pme" | "auditor" | "admin" | "unknown">("unknown");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [auditStarted, setAuditStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questions, setQuestions] = useState<AuditQuestion[]>(fallbackQuestions);
  const [auditHistory, setAuditHistory] = useState<AuditRecord[]>([]);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
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
          supabase
            .from("profiles")
            .select("account_type, first_name, last_name, email, alert_frequency, security_zone")
            .eq("id", session.user.id)
            .maybeSingle(),
        ]);

        setProfileName(`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim());
        setEmail(profile?.email ?? session.user.email ?? null);
        setAlertFrequency(profile?.alert_frequency ?? "hebdomadaire");
        setSecurityZone(profile?.security_zone ?? "maroc");

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
            supabase
              .from("companies")
              .select("id, name, sector, size, region")
              .eq("owner_id", session.user.id)
              .maybeSingle(),
            supabase
              .from("audit_questions")
              .select("id, axis, question, options, noted, sort_order")
              .eq("active", true)
              .order("sort_order", { ascending: true }),
          ]);

          setCompanyName(company?.name ?? "");
          setCompanySector(company?.sector ?? "");
          setCompanySize(company?.size ?? "");
          setCompanyRegion(company?.region ?? "");

          if (questionRows?.length) {
            setQuestions(
              questionRows.map((question) => ({
                id: question.id,
                category: normalizeCategory(question.axis),
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
            const { data: auditRows } = await supabase
              .from("audits")
              .select("id, title, status, score, created_at, submitted_at")
              .eq("owner_id", session.user.id)
              .eq("company_id", company.id)
              .order("created_at", { ascending: false });

            if (auditRows?.length) {
              setAuditHistory(
                auditRows.map((audit) => ({
                  id: audit.id,
                  name: audit.title,
                  date: new Intl.DateTimeFormat("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(audit.created_at)),
                  score: audit.score,
                  status:
                    audit.status === "submitted" || audit.status === "completed"
                      ? "Validé"
                      : audit.status === "in_review"
                        ? "À revoir"
                        : "En cours",
                  scope: "Diagnostic cybersécurité",
                })),
              );

              const { data: answerRows } = await supabase
                .from("audit_answers")
                .select("audit_id, question_id, score")
                .in(
                  "audit_id",
                  auditRows.map((audit) => audit.id),
                );
              const questionById = new Map(
                (questionRows ?? []).map((question) => [question.id, question]),
              );
              const latestAuditId = auditRows.find(() => true)?.id;
              const latestAnswers = (answerRows ?? []).filter(
                (answer) => answer.audit_id === latestAuditId && answer.score !== null,
              );
              const categoryScores = new Map<string, number[]>();

              latestAnswers.forEach((answer) => {
                const question = questionById.get(answer.question_id);
                if (!question || answer.score === null || !question.noted) return;
                const scores = categoryScores.get(normalizeCategory(question.axis)) ?? [];
                scores.push(answer.score);
                categoryScores.set(normalizeCategory(question.axis), scores);
              });

              setDomains(
                Array.from(categoryScores.entries()).map(([name, scores]) => ({
                  name,
                  score: Math.round(
                    (scores.reduce((total, score) => total + score, 0) / (scores.length * 3)) * 100,
                  ),
                })),
              );
            }

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

  const scorePoints = useMemo(() => {
    const scoredAnswers = Object.entries(answers).filter(
      ([questionIndex]) => questions[Number(questionIndex)]?.noted,
    );

    if (scoredAnswers.length === 0) return 0;

    return scoredAnswers.reduce(
      (sum, [questionIndex, value]) =>
        sum + (questions[Number(questionIndex)]?.options.indexOf(value) ?? 0),
      0,
    );
  }, [answers, questions]);

  const scorePercent = getScorePercent(scorePoints);
  const reportRecommendations = getRecommendations(questions, answers);
  const diagnosticDomains = getCategoryScores(questions, answers);

  const currentQuestionData = (questions[currentQuestion] ?? fallbackQuestions[0]) as AuditQuestion;
  const latestAudit = auditHistory[0];
  const completedAudits = auditHistory.filter((audit) => audit.status === "Validé").length;
  const criticalDomains = domains.filter((domain) => domain.score < 50).length;
  const inProgressAudits = auditHistory.filter((audit) => audit.status === "En cours").length;
  const alertCount = reportRecommendations.length + criticalDomains + inProgressAudits;
  const alertSummary = alertCount === 0
    ? "Aucun point critique à traiter"
    : `${reportRecommendations.length} recommandation${reportRecommendations.length > 1 ? "s" : ""}, ${criticalDomains} domaine${criticalDomains > 1 ? "s" : ""} faible${criticalDomains > 1 ? "s" : ""}`;
  const profileFields = [companyName, companySector, companySize, companyRegion, email];
  const profileCompletion = Math.round(
    (profileFields.filter((field) => Boolean(field?.trim())).length / profileFields.length) * 100,
  );
  const pmeStatus = latestAudit?.status ?? (profileCompletion === 100 ? "Prêt pour un audit" : "Profil à compléter");
  const pmeStatusIsReady =
    profileCompletion === 100 && (!latestAudit || latestAudit.status === "Validé");
  const weakestDomains = [...domains].sort((left, right) => left.score - right.score).slice(0, 3);
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const overviewStats = [
    {
      label: "Score global",
      value:
        latestAudit?.score !== null && latestAudit?.score !== undefined
          ? `${latestAudit.score}%`
          : "—",
      delta:
        latestAudit?.score !== null && latestAudit?.score !== undefined
          ? getMaturityLevel(Math.round((latestAudit.score * maxScore) / 100))
          : "Aucun audit",
      color: "bg-emerald-500",
      icon: Target,
    },
    {
      label: "Audits réalisés",
      value: String(completedAudits),
      delta: `${auditHistory.length} au total`,
      color: "bg-blue-500",
      icon: FileText,
    },
    {
      label: "Risques critiques",
      value: String(criticalDomains).padStart(2, "0"),
      delta: domains.length ? "Domaines sous 50%" : "En attente des réponses",
      color: "bg-amber-500",
      icon: AlertTriangle,
    },
    {
      label: "État du dernier audit",
      value:
        latestAudit?.score !== null && latestAudit?.score !== undefined
          ? getMaturityLevel(Math.round((latestAudit.score * maxScore) / 100))
          : "—",
      delta: latestAudit ? latestAudit.date : "Aucune donnée",
      color: "bg-violet-500",
      icon: TrendingUp,
    },
  ];
  const progressPercent = totalQuestions
    ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100))
    : 0;

  async function handleLogout() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  function handleAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: value }));

    const questionId = currentQuestionData.id;
    if (auditId && questionId) {
      void supabase
        .from("audit_answers")
        .upsert(
          {
            audit_id: auditId,
            question_id: questionId,
            answer: value,
            score: currentQuestionData.noted ? currentQuestionData.options.indexOf(value) : null,
          },
          { onConflict: "audit_id,question_id" },
        )
        .then(({ error }) => {
          if (error) setAuditError("La réponse n'a pas pu être enregistrée. Réessayez.");
        });
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
    const submittedAt = new Date().toISOString();
    if (auditId) {
      await supabase
        .from("audits")
        .update({
          status: "submitted",
          score: scorePercent,
          submitted_at: submittedAt,
        })
        .eq("id", auditId);

      setAuditHistory((previous) => {
        const existing = previous.some((audit) => audit.id === auditId);
        if (existing) {
          return previous.map((audit) =>
            audit.id === auditId ? { ...audit, score: scorePercent, status: "Validé" } : audit,
          );
        }
        return [
          {
            id: auditId,
            name: "Diagnostic cybersécurité PME",
            date: new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }).format(new Date(submittedAt)),
            score: scorePercent,
            status: "Validé",
            scope: "Diagnostic cybersécurité",
          },
          ...previous,
        ];
      });
      setDomains(getCategoryScores(questions, answers));
    }
    setReportGenerated(true);
  }

  async function saveSettings() {
    const trimmedCompanyName = companyName.trim();
    if (!userId || !trimmedCompanyName) {
      setSettingsMessage("Le nom de l'entreprise est obligatoire.");
      return;
    }
    if (
      !SECTORS.includes(companySector as (typeof SECTORS)[number]) ||
      !COMPANY_SIZES.includes(companySize as (typeof COMPANY_SIZES)[number]) ||
      !REGIONS.includes(companyRegion as (typeof REGIONS)[number]) ||
      !["quotidienne", "hebdomadaire", "mensuelle"].includes(alertFrequency) ||
      !["maroc", "afrique", "monde"].includes(securityZone)
    ) {
      setSettingsMessage("Sélectionnez une valeur valide pour le secteur, la taille et la région.");
      return;
    }

    setSettingsSaving(true);
    setSettingsMessage(null);
    const [{ error: profileError }, { error: companyError }] = await Promise.all([
      supabase
        .from("profiles")
        .update({ alert_frequency: alertFrequency, security_zone: securityZone })
        .eq("id", userId),
      supabase
        .from("companies")
        .update({
          name: trimmedCompanyName,
          sector: companySector,
          size: companySize,
          region: companyRegion,
        })
        .eq("owner_id", userId),
    ]);

    if (profileError || companyError) {
      setSettingsMessage("Les paramètres n'ont pas pu être enregistrés. Réessayez.");
    } else {
      setCompanyName(trimmedCompanyName);
      setSettingsMessage("Paramètres enregistrés avec succès.");
    }
    setSettingsSaving(false);
  }

  async function resetSettings() {
    if (!userId) return;
    setSettingsMessage(null);
    const [{ data: profile }, { data: company }] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name, email, alert_frequency, security_zone")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("companies")
        .select("name, sector, size, region")
        .eq("owner_id", userId)
        .maybeSingle(),
    ]);
    setProfileName(`${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim());
    setEmail(profile?.email ?? email);
    setAlertFrequency(profile?.alert_frequency ?? "hebdomadaire");
    setSecurityZone(profile?.security_zone ?? "maroc");
    setCompanyName(company?.name ?? "");
    setCompanySector(company?.sector ?? "");
    setCompanySize(company?.size ?? "");
    setCompanyRegion(company?.region ?? "");
    setSettingsMessage("Les valeurs enregistrées ont été rechargées.");
  }

  function generateDiagnosticReport() {
    const confirmed = window.confirm("Voulez-vous télécharger le rapport PDF de diagnostic ?");
    if (!confirmed) {
      return;
    }

    const document = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let cursorY = margin;

    const ensureSpace = (height: number) => {
      if (cursorY + height > pageHeight - margin) {
        document.addPage();
        cursorY = margin;
      }
    };

    const addText = (
      text: string,
      size: number,
      options?: { bold?: boolean; color?: [number, number, number] },
    ) => {
      if (options?.color) document.setTextColor(...options.color);
      else document.setTextColor(31, 41, 55);
      document.setFont("helvetica", options?.bold ? "bold" : "normal");
      document.setFontSize(size);
      const lines = document.splitTextToSize(text, contentWidth) as string[];
      const lineHeight = size * 0.45;

      ensureSpace(lines.length * lineHeight + 2);
      document.text(lines, margin, cursorY);
      cursorY += lines.length * lineHeight;
    };

    const addSectionTitle = (text: string) => {
      cursorY += 7;
      addText(text, 14, { bold: true, color: [15, 118, 110] });
      cursorY += 2;
    };

    const addRecommendationCard = (item: (typeof reportRecommendations)[number], index: number) => {
      const cardHeight = 23;
      ensureSpace(cardHeight + 4);
      document.setFillColor(245, 250, 248);
      document.roundedRect(margin, cursorY - 4, contentWidth, cardHeight, 3, 3, "F");
      document.setFillColor(15, 118, 110);
      document.circle(margin + 8, cursorY + 6, 4, "F");
      document.setTextColor(255, 255, 255);
      document.setFont("helvetica", "bold");
      document.setFontSize(9);
      document.text(String(index + 1), margin + 6.5, cursorY + 9);
      document.setTextColor(15, 94, 89);
      document.setFontSize(10);
      document.text(`${item.category} - niveau ${item.level}/3`, margin + 16, cursorY + 5);
      document.setTextColor(55, 65, 81);
      document.setFont("helvetica", "normal");
      document.setFontSize(9);
      const lines = document.splitTextToSize(item.recommendation, contentWidth - 24) as string[];
      document.text(lines.slice(0, 2), margin + 16, cursorY + 11);
      cursorY += cardHeight + 4;
    };

    document.setFillColor(15, 118, 110);
    document.rect(0, 0, pageWidth, 34, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("helvetica", "bold");
    document.setFontSize(20);
    document.text("CyberAudit PME", margin, 15);
    document.setFont("helvetica", "normal");
    document.setFontSize(9);
    document.text("Rapport de maturité cybersécurité", margin, 24);
    cursorY = 48;
    addText("Rapport de diagnostic cybersécurité", 20, {
      bold: true,
      color: [15, 118, 110],
    });
    addText("CMRPI - Espace Maroc Cyberconfiance", 10);
    addText(`Généré le ${todayLabel}`, 9, { color: [100, 116, 139] });
    cursorY += 5;
    ensureSpace(27);
    document.setFillColor(234, 247, 240);
    document.roundedRect(margin, cursorY - 5, contentWidth, 24, 4, 4, "F");
    document.setTextColor(15, 118, 110);
    document.setFont("helvetica", "bold");
    document.setFontSize(18);
    document.text(`${scorePercent}%`, margin + 10, cursorY + 10);
    document.setFontSize(10);
    document.text(`${scorePoints}/${maxScore} points`, margin + 42, cursorY + 5);
    document.setFont("helvetica", "normal");
    document.setTextColor(55, 65, 81);
    document.text(`Niveau : ${getMaturityLevel(scorePoints)}`, margin + 42, cursorY + 12);
    cursorY += 30;

    addSectionTitle("Diagnostic par catégorie");
    if (diagnosticDomains.length === 0) {
      addText("Les scores par catégorie ne sont pas disponibles.", 10);
    } else {
      diagnosticDomains.forEach((domain) => {
        addText(`${domain.name} : ${domain.score}%`, 11, { bold: true });
        ensureSpace(8);
        document.setFillColor(226, 232, 240);
        document.roundedRect(margin, cursorY - 4, contentWidth, 4, 2, 2, "F");
        document.setFillColor(15, 118, 110);
        document.roundedRect(
          margin,
          cursorY - 4,
          contentWidth * (domain.score / 100),
          4,
          2,
          2,
          "F",
        );
        cursorY += 9;
      });
    }

    addSectionTitle("Recommandations");
    if (reportRecommendations.length === 0) {
      addText(
        "Aucune recommandation prioritaire : les bonnes pratiques notées sont installées.",
        10,
      );
    } else {
      reportRecommendations.forEach((item, index) => addRecommendationCard(item, index));
    }

    document.save("rapport-diagnostic-cybersecurite.pdf");
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
                <p className="max-w-[180px] truncate text-xs text-slate-500">
                  {companyName || "Entreprise non renseignée"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">{email ?? "Compte connecté"}</p>
            <div
              className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                pmeStatusIsReady
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {pmeStatus}
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

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className="mt-8 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-primary/30 hover:bg-primary-soft"
            aria-label="Voir les alertes et recommandations de l'audit"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Bell className="h-4 w-4 text-primary" />
              Alertes
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{alertCount}</p>
            <p className="text-xs text-slate-500">{alertSummary}</p>
          </button>

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
                {todayLabel}
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
                      <p
                        className={`mt-2 font-bold tracking-tight text-slate-900 ${
                          label === "État du dernier audit"
                            ? "text-base font-semibold leading-tight sm:text-lg"
                            : "text-3xl"
                        }`}
                      >
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
                        {latestAudit?.score !== null && latestAudit?.score !== undefined
                          ? `${latestAudit.score}%`
                          : "—"}
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {domains.length === 0 ? (
                        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                          Les scores par domaine apparaîtront après votre premier audit.
                        </p>
                      ) : (
                        domains.map((domain) => (
                          <div key={domain.name}>
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-700">{domain.name}</span>
                              <span className="text-slate-500">{domain.score}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-100">
                              <div
                                className="h-2.5 rounded-full bg-gradient-to-r from-primary to-cyan-500"
                                style={{ width: `${Math.min(100, Math.max(0, domain.score))}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Synthèse
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">Priorités</h2>

                    <div className="mt-5 space-y-4">
                      {weakestDomains.length === 0 ? (
                        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                          Les priorités seront calculées après les réponses notées.
                        </p>
                      ) : (
                        weakestDomains.map((domain, index) => (
                          <div
                            key={domain.name}
                            className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                              domain.score < 50
                                ? "border-rose-200 bg-rose-50/70"
                                : "border-primary/15 bg-primary-soft/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 text-slate-800">
                              {domain.score < 50 ? (
                                <AlertTriangle className="h-4 w-4 text-rose-600" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Priorité {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className="ml-auto rounded-full bg-white/80 px-2.5 py-1 text-sm font-bold text-slate-700">
                                {domain.score}%
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-slate-800">
                              {domain.name}
                            </p>
                            <div className="mt-3 h-1.5 rounded-full bg-white/80">
                              <div
                                className={`h-1.5 rounded-full ${domain.score < 50 ? "bg-rose-500" : "bg-primary"}`}
                                style={{ width: `${Math.min(100, Math.max(0, domain.score))}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
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
                        {auditHistory.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                              Aucun audit enregistré pour le moment.
                            </td>
                          </tr>
                        ) : (
                          auditHistory.map((audit) => (
                            <tr key={audit.id} className="border-b border-slate-100 text-sm">
                              <td className="py-4 pr-4 font-medium text-slate-800">{audit.name}</td>
                              <td className="py-4 pr-4 text-slate-600">{audit.date}</td>
                              <td className="py-4 pr-4 text-slate-600">{audit.scope}</td>
                              <td className="py-4 pr-4">
                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                                  {audit.score === null ? "—" : `${audit.score}%`}
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
                          ))
                        )}
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
                      <p className="mt-2 text-lg font-semibold">{companyName || "Non renseigné"}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Secteur</p>
                      <p className="mt-2 text-lg font-semibold">
                        {companySector || "Non renseigné"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Effectif</p>
                      <p className="mt-2 text-lg font-semibold">{companySize || "Non renseigné"}</p>
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
                      <span className="text-sm font-semibold text-primary">{profileCompletion}%</span>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-white">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-primary to-cyan-500"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                      <span>Informations de l’entreprise</span>
                      <span className={`font-semibold ${profileCompletion === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                        {profileCompletion === 100 ? "OK" : "À compléter"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                      <span>Questionnaire d’audit</span>
                      <span className={`font-semibold ${answeredCount === totalQuestions ? "text-emerald-600" : "text-amber-600"}`}>
                        {answeredCount === totalQuestions ? "Terminé" : `${answeredCount}/${totalQuestions}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                      <span>Recommandations</span>
                      <span className={`font-semibold ${alertCount === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {alertCount === 0 ? "À jour" : `${alertCount} à traiter`}
                      </span>
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
                {settingsMessage && (
                  <p
                    role="status"
                    className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                      settingsMessage.includes("succès")
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {settingsMessage}
                  </p>
                )}

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Nom de l’entreprise
                      </span>
                      <input
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        maxLength={120}
                        autoComplete="organization"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none ring-0 transition focus:border-primary"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Adresse e-mail
                      </span>
                      <input
                        value={email ?? ""}
                        readOnly
                        aria-describedby="email-settings-help"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none ring-0 transition focus:border-primary"
                      />
                      <span id="email-settings-help" className="mt-1 block text-xs text-slate-500">
                        L’adresse de connexion se modifie depuis le parcours sécurisé du compte.
                      </span>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Secteur</span>
                      <select
                        value={companySector}
                        onChange={(event) => setCompanySector(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-primary"
                      >
                        <option value="" disabled>
                          Sélectionner un secteur
                        </option>
                        {SECTORS.map((sector) => (
                          <option key={sector} value={sector}>
                            {sector}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Taille de l’entreprise
                      </span>
                      <select
                        value={companySize}
                        onChange={(event) => setCompanySize(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-primary"
                      >
                        <option value="" disabled>
                          Sélectionner une taille
                        </option>
                        {COMPANY_SIZES.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Région</span>
                      <select
                        value={companyRegion}
                        onChange={(event) => setCompanyRegion(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-primary"
                      >
                        <option value="" disabled>
                          Sélectionner une région
                        </option>
                        {REGIONS.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Fréquence des alertes
                      </span>
                      <select
                        value={alertFrequency}
                        onChange={(event) => setAlertFrequency(event.target.value)}
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
                        value={securityZone}
                        onChange={(event) => setSecurityZone(event.target.value)}
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
                    onClick={() => void saveSettings()}
                    disabled={settingsSaving}
                    className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    {settingsSaving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetSettings()}
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
                  {auditHistory.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      Votre historique apparaîtra après le démarrage du premier audit.
                    </p>
                  ) : (
                    auditHistory.map((item) => (
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
                              {item.score === null ? "—" : `${item.score}%`}
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
                    ))
                  )}
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
                          width: `${progressPercent}%`,
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
                        <p className="text-3xl font-black text-primary">
                          {scorePoints}/{maxScore}
                        </p>
                        <p className="text-xs font-medium text-primary">{scorePercent}%</p>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Évaluation globale
                          </h3>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {getMaturityLevel(scorePoints)}
                          </span>
                        </div>

                        <div className="mt-6 h-3 rounded-full bg-slate-200">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-primary to-cyan-500"
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>

                        <div className="mt-6 space-y-3 text-sm text-slate-600">
                          {diagnosticDomains.map((domain) => (
                            <div
                              key={domain.name}
                              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3"
                            >
                              <span>{domain.name}</span>
                              <span className="font-semibold text-slate-800">{domain.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-3xl border border-primary/10 bg-primary-soft p-5">
                          <div className="flex items-center gap-2 text-primary">
                            <Target className="h-5 w-5" />
                            <span className="font-semibold">Recommandation clé</span>
                          </div>
                          <p className="mt-3 text-sm text-slate-700">
                            {weakestDomains[0]
                              ? `Renforcer en priorité le thème « ${weakestDomains[0].name} » (${weakestDomains[0].score}%).`
                              : "Les recommandations apparaîtront après l'enregistrement des réponses."}
                          </p>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-5">
                          <p className="text-sm font-semibold text-slate-800">Options de rapport</p>
                          <div className="mt-4 space-y-3">
                            <button
                              type="button"
                              onClick={generateDiagnosticReport}
                              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                            >
                              <span>Générer le rapport de diagnostic</span>
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

                        <div className="rounded-3xl border border-primary/15 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                Plan d’amélioration
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-900">
                                Recommandations prioritaires
                              </p>
                            </div>
                            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                              {reportRecommendations.length}
                            </span>
                          </div>
                          {reportRecommendations.length === 0 ? (
                            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                              Aucune recommandation prioritaire pour les réponses enregistrées.
                            </p>
                          ) : (
                            <ul className="mt-5 space-y-3 text-sm text-slate-600">
                              {reportRecommendations.map((item, index) => (
                                <li
                                  key={item.question}
                                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                                      {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <div>
                                      <p className="font-semibold text-slate-800">
                                        {item.category}
                                      </p>
                                      <p className="mt-1 text-xs font-medium text-primary">
                                        Niveau obtenu : {item.level}/3
                                      </p>
                                      <p className="mt-2 leading-6">{item.recommendation}</p>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
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
