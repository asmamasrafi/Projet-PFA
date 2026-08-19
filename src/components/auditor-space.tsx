import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
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

type AuditorTab = "overview" | "missions" | "companies" | "reports" | "profile";
type MissionStatus = "À planifier" | "En cours" | "À valider" | "Clôturée";

type Mission = {
  id: string;
  company: string;
  sector: string;
  status: MissionStatus;
  progress: number;
  due: string;
  score: number | null;
  risk: "Faible" | "Modéré" | "Élevé";
  contact: string;
  updated: string;
};

const missions: Mission[] = [
  {
    id: "CA-2048",
    company: "Atlas Industrie",
    sector: "Industrie",
    status: "En cours",
    progress: 68,
    due: "22 août 2026",
    score: null,
    risk: "Élevé",
    contact: "Nadia El Mansouri",
    updated: "Mis à jour il y a 2 h",
  },
  {
    id: "CA-2044",
    company: "Noria Services",
    sector: "Services",
    status: "À valider",
    progress: 100,
    due: "19 août 2026",
    score: 74,
    risk: "Modéré",
    contact: "Youssef Amrani",
    updated: "Mis à jour hier",
  },
  {
    id: "CA-2039",
    company: "Medina Retail",
    sector: "Commerce",
    status: "À planifier",
    progress: 0,
    due: "28 août 2026",
    score: null,
    risk: "Modéré",
    contact: "Sara Bennani",
    updated: "Reçue il y a 3 j",
  },
  {
    id: "CA-2028",
    company: "OxyTech",
    sector: "Technologie",
    status: "Clôturée",
    progress: 100,
    due: "12 août 2026",
    score: 86,
    risk: "Faible",
    contact: "Amine Tazi",
    updated: "Clôturée le 12 août",
  },
];

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
  const [selected, setSelected] = useState<Mission | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const filteredMissions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return missions.filter((mission) => {
      const matchesQuery =
        !normalized ||
        `${mission.company} ${mission.id} ${mission.sector}`.toLowerCase().includes(normalized);
      return matchesQuery && (statusFilter === "Toutes" || mission.status === statusFilter);
    });
  }, [query, statusFilter]);

  function selectTab(tab: AuditorTab) {
    setActiveTab(tab);
    setMobileOpen(false);
    setSelected(null);
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
                <p className="truncate text-sm font-semibold">Cabinet auditeur</p>
                <p className="truncate text-xs text-slate-500">CMRPI · Vérifié</p>
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
            <p className="mt-3 text-3xl font-semibold">07</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              2 validations et 5 actions de suivi
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
                    ? "Bonjour, auditeur"
                    : navItems.find((item) => item.id === activeTab)?.label}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
                <CalendarDays className="size-4" />
                19 août 2026
              </div>
              <button
                type="button"
                aria-label="Notifications"
                className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600"
              >
                <Bell className="size-4" />
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-rose-500" />
              </button>
              <span className="hidden size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary sm:flex">
                AM
              </span>
            </div>
          </header>

          <main className="py-7">
            {activeTab === "overview" && <Overview onNavigate={selectTab} onSelect={setSelected} />}
            {activeTab === "missions" && (
              <MissionList
                missions={filteredMissions}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onSelect={setSelected}
              />
            )}
            {activeTab === "companies" && (
              <CompanyList missions={missions} onSelect={setSelected} />
            )}
            {activeTab === "reports" && <Reports />}
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
          onSave={() => setSaved(true)}
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
  onNavigate,
  onSelect,
}: {
  onNavigate: (tab: AuditorTab) => void;
  onSelect: (mission: Mission) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Missions actives"
          value="04"
          detail="+1 cette semaine"
          icon={ClipboardCheck}
          tone="lime"
        />
        <Stat
          label="Dossiers suivis"
          value="12"
          detail="3 nouveaux clients"
          icon={Users}
          tone="teal"
        />
        <Stat
          label="À valider"
          value="02"
          detail="Échéance aujourd'hui"
          icon={BookOpenCheck}
          tone="amber"
        />
        <Stat
          label="Score moyen"
          value="78%"
          detail="Sur 8 audits clôturés"
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
            {missions.slice(0, 3).map((mission) => (
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
                  <span className="mt-1 block text-xs text-slate-400">Risque</span>
                </span>
                <ChevronRight className="size-4 text-slate-300 transition group-hover:text-primary" />
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-soft">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/80">
            Qualité d'audit
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Votre activité est à jour.</h2>
          <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
            4 missions suivies, 92% des livrables déposés dans les délais.
          </p>
          <div className="mt-7 h-2 rounded-full bg-primary-foreground/20">
            <div className="h-2 w-[92%] rounded-full bg-primary-foreground" />
          </div>
          <div className="mt-3 flex justify-between text-xs text-primary-foreground/70">
            <span>Progression du mois</span>
            <span className="font-semibold text-white">92%</span>
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
          <Deadline date="Aujourd'hui" title="Valider le rapport Noria Services" urgent />
          <Deadline date="22 août" title="Point d'avancement Atlas Industrie" />
          <Deadline date="28 août" title="Démarrage Medina Retail" />
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
        <span className="text-xs text-slate-400">Août 2026</span>
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
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <ClipboardCheck className="size-4" />
          Nouvelle mission
        </button>
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
              {mission.sector} · {mission.contact}
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

function Reports() {
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
        {[
          {
            name: "Rapport de maturité cybersécurité",
            company: "OxyTech",
            date: "12 août 2026",
            score: "86%",
          },
          {
            name: "Synthèse de diagnostic",
            company: "Noria Services",
            date: "18 août 2026",
            score: "74%",
          },
        ].map((report) => (
          <div
            key={report.name}
            className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 sm:grid sm:grid-cols-[1.5fr_1fr_0.7fr_0.5fr]"
          >
            <span className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <FileText className="size-4" />
              </span>
              <span className="text-sm font-semibold">{report.name}</span>
            </span>
            <span className="text-sm text-slate-600">{report.company}</span>
            <span className="text-sm text-slate-500">{report.date}</span>
            <button
              type="button"
              aria-label={`Télécharger ${report.name}`}
              className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary"
            >
              <Download className="size-4" />
            </button>
            <span className="w-full text-xs text-primary sm:hidden">
              Score final : {report.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Profile({ email }: { email: string | null }) {
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
            AM
          </span>
          <div>
            <h3 className="text-lg font-semibold">Auditeur CyberAudit</h3>
            <p className="text-sm text-slate-500">{email ?? "Compte auditeur"}</p>
          </div>
          <span className="sm:ml-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-3.5" /> Profil vérifié
          </span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ProfileField label="Prénom et nom" value="Auditeur CyberAudit" />
          <ProfileField label="Organisme" value="CMRPI" />
          <ProfileField label="Fonction" value="Auditeur cybersécurité" />
          <ProfileField label="Email professionnel" value={email ?? "Non renseigné"} />
        </div>
        <button
          type="button"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          <Settings className="size-4" />
          Modifier mes informations
        </button>
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
  onSave,
  onClose,
}: {
  mission: Mission;
  notes: string;
  setNotes: (value: string) => void;
  saved: boolean;
  onSave: () => void;
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
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Dossier {mission.id}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{mission.company}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {mission.sector} · {mission.contact}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer le dossier"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Statut</p>
            <p className="mt-1 text-sm font-semibold">{mission.status}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Échéance</p>
            <p className="mt-1 text-sm font-semibold">{mission.due}</p>
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
            Vérifier les accès privilégiés et la présence d'une procédure de sauvegarde testée.
          </p>
        </div>
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
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          {saved ? <CheckCircle2 className="size-4" /> : <Archive className="size-4" />}
          {saved ? "Note enregistrée" : "Enregistrer la note"}
        </button>
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
