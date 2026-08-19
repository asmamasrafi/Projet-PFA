CREATE TABLE public.audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Diagnostic cybersécurité PME',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_review', 'completed')),
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audits_owner_id_idx ON public.audits(owner_id);
CREATE INDEX audits_company_id_idx ON public.audits(company_id);
GRANT SELECT, INSERT, UPDATE ON public.audits TO authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audits_select_owner" ON public.audits FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);
CREATE POLICY "audits_insert_owner" ON public.audits FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND public.has_role(auth.uid(), 'pme')
    AND EXISTS (SELECT 1 FROM public.companies WHERE companies.id = company_id AND companies.owner_id = auth.uid())
  );
CREATE POLICY "audits_update_owner" ON public.audits FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.audit_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  noted BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX audit_questions_sort_order_key ON public.audit_questions(sort_order);
GRANT SELECT ON public.audit_questions TO authenticated;
GRANT ALL ON public.audit_questions TO service_role;
ALTER TABLE public.audit_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_questions_select_active" ON public.audit_questions FOR SELECT TO authenticated
  USING (active = true);

CREATE TABLE public.audit_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.audit_questions(id) ON DELETE RESTRICT,
  answer TEXT NOT NULL,
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 3)),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audit_id, question_id)
);
CREATE INDEX audit_answers_audit_id_idx ON public.audit_answers(audit_id);
GRANT SELECT, INSERT, UPDATE ON public.audit_answers TO authenticated;
GRANT ALL ON public.audit_answers TO service_role;
ALTER TABLE public.audit_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_answers_select_owner" ON public.audit_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_id AND audits.owner_id = auth.uid()));
CREATE POLICY "audit_answers_insert_owner" ON public.audit_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_id AND audits.owner_id = auth.uid()));
CREATE POLICY "audit_answers_update_owner" ON public.audit_answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_id AND audits.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_id AND audits.owner_id = auth.uid()));

CREATE TABLE public.auditor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  auditor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (audit_id, auditor_id)
);
CREATE INDEX auditor_requests_auditor_id_idx ON public.auditor_requests(auditor_id);
CREATE INDEX auditor_requests_status_idx ON public.auditor_requests(status);
GRANT SELECT, INSERT, UPDATE ON public.auditor_requests TO authenticated;
GRANT ALL ON public.auditor_requests TO service_role;
ALTER TABLE public.auditor_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auditor_requests_select_pme_or_auditor" ON public.auditor_requests FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_id AND audits.owner_id = auth.uid())
    OR (public.has_role(auth.uid(), 'auditor') AND (auditor_id IS NULL OR auditor_id = auth.uid()))
  );
CREATE POLICY "auditor_requests_insert_pme" ON public.auditor_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'pme')
    AND auditor_id IS NULL
    AND EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_id AND audits.owner_id = auth.uid())
  );
CREATE POLICY "auditor_requests_update_auditor" ON public.auditor_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'auditor') AND (auditor_id IS NULL OR auditor_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'auditor') AND auditor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_assigned_audit(_audit_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.auditor_requests
    WHERE audit_id = _audit_id
      AND auditor_id = _user_id
      AND status IN ('accepted', 'completed')
  );
$$;
REVOKE ALL ON FUNCTION public.has_assigned_audit(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_assigned_audit(UUID, UUID) TO authenticated, service_role;

CREATE POLICY "audits_select_assigned_auditor" ON public.audits FOR SELECT TO authenticated
  USING (public.has_assigned_audit(id, auth.uid()));

CREATE POLICY "audit_answers_select_assigned_auditor" ON public.audit_answers FOR SELECT TO authenticated
  USING (public.has_assigned_audit(audit_id, auth.uid()));

CREATE TABLE public.audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL UNIQUE REFERENCES public.audits(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  summary TEXT,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_reports_auditor_id_idx ON public.audit_reports(auditor_id);
GRANT SELECT, INSERT, UPDATE ON public.audit_reports TO authenticated;
GRANT ALL ON public.audit_reports TO service_role;
ALTER TABLE public.audit_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_reports_select_pme_or_auditor" ON public.audit_reports FOR SELECT TO authenticated
  USING (
    auditor_id = auth.uid()
    OR (status = 'published' AND EXISTS (SELECT 1 FROM public.audits WHERE audits.id = audit_id AND audits.owner_id = auth.uid()))
  );
CREATE POLICY "audit_reports_insert_auditor" ON public.audit_reports FOR INSERT TO authenticated
  WITH CHECK (
    auditor_id = auth.uid()
    AND public.has_role(auth.uid(), 'auditor')
    AND EXISTS (
      SELECT 1 FROM public.auditor_requests
      WHERE auditor_requests.audit_id = audit_reports.audit_id
        AND auditor_requests.auditor_id = auth.uid()
        AND auditor_requests.status IN ('accepted', 'completed')
    )
  );
CREATE POLICY "audit_reports_update_auditor" ON public.audit_reports FOR UPDATE TO authenticated
  USING (auditor_id = auth.uid()) WITH CHECK (auditor_id = auth.uid());

CREATE TABLE public.action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.audit_reports(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auditor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX action_plans_owner_id_idx ON public.action_plans(owner_id);
CREATE INDEX action_plans_auditor_id_idx ON public.action_plans(auditor_id);
GRANT SELECT, INSERT, UPDATE ON public.action_plans TO authenticated;
GRANT ALL ON public.action_plans TO service_role;
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "action_plans_select_pme_or_auditor" ON public.action_plans FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR auditor_id = auth.uid());
CREATE POLICY "action_plans_insert_auditor" ON public.action_plans FOR INSERT TO authenticated
  WITH CHECK (auditor_id = auth.uid() AND public.has_role(auth.uid(), 'auditor'));
CREATE POLICY "action_plans_update_pme_or_auditor" ON public.action_plans FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR auditor_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() OR auditor_id = auth.uid());

CREATE TRIGGER audits_set_updated_at BEFORE UPDATE ON public.audits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER audit_reports_set_updated_at BEFORE UPDATE ON public.audit_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER action_plans_set_updated_at BEFORE UPDATE ON public.action_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.audit_questions (axis, question, options, noted, sort_order)
VALUES
  ('Contexte de l''entreprise', 'Le système informatique est-il indispensable au fonctionnement quotidien de l''entreprise ?', '["Non", "Oui"]'::jsonb, false, 1),
  ('Contexte de l''entreprise', 'Une panne informatique de plusieurs jours aurait-elle un impact important sur l''activité ?', '["Non", "Oui"]'::jsonb, false, 2),
  ('Contexte de l''entreprise', 'La perte ou la modification accidentelle de données aurait-elle des conséquences importantes ?', '["Non", "Oui"]'::jsonb, false, 3),
  ('Contexte de l''entreprise', 'Une fuite d''informations sensibles (clients, finances) nuirait-elle gravement à l''entreprise ?', '["Non", "Oui"]'::jsonb, false, 4),
  ('Contexte de l''entreprise', 'L''entreprise évolue-t-elle dans un secteur très concurrentiel où l''information a de la valeur ?', '["Non", "Oui"]'::jsonb, false, 5),
  ('Contexte de l''entreprise', 'Le système informatique est-il connecté à internet ou à des partenaires externes ?', '["Non", "Oui"]'::jsonb, false, 6),
  ('Gouvernance et organisation', 'Avez-vous mis en place des règles de sécurité informatique dans votre entreprise ?', '["Aucune règle définie", "Quelques règles orales", "Des règles suivies mais non écrites", "Document écrit distribué"]'::jsonb, true, 7),
  ('Gouvernance et organisation', 'Une personne est-elle chargée de s''occuper de la sécurité informatique de l''entreprise ?', '["Personne", "De temps en temps sans rôle officiel", "Régulièrement sans rôle écrit", "Responsable officiellement désigné"]'::jsonb, true, 8),
  ('Gouvernance et organisation', 'Savez-vous exactement quels ordinateurs et logiciels sont utilisés dans votre entreprise ?', '["Aucune liste", "Liste incomplète", "Liste mise à jour parfois", "Liste complète et à jour"]'::jsonb, true, 9),
  ('Gouvernance et organisation', 'Réfléchissez-vous régulièrement aux risques informatiques qui menacent votre entreprise ?', '["Jamais", "De temps en temps sans suivi", "Régulièrement une fois par an", "Organisée et structurée au moins une fois par an"]'::jsonb, true, 10),
  ('Accès, mots de passe et réseau', 'Chaque employé possède-t-il son propre compte pour se connecter aux ordinateurs et aux logiciels ?', '["Comptes partagés", "Une partie des employés", "Tous les employés", "Tous avec contrôle des accès"]'::jsonb, true, 11),
  ('Accès, mots de passe et réseau', 'Comment sont gérés les mots de passe dans votre entreprise ?', '["Aucune règle", "Règles de base rarement changées", "Corrects et changés parfois", "Complexes et changés régulièrement"]'::jsonb, true, 12),
  ('Accès, mots de passe et réseau', 'Quand un employé quitte l''entreprise, ses accès informatiques sont-ils supprimés ?', '["Jamais", "Avec retard", "La plupart du temps", "Systématiquement le jour du départ"]'::jsonb, true, 13),
  ('Accès, mots de passe et réseau', 'Le réseau Wi-Fi de votre entreprise est-il protégé ?', '["Sans mot de passe", "Même réseau employés et visiteurs", "Mot de passe largement partagé", "Réseaux séparés et protégés"]'::jsonb, true, 14),
  ('Accès, mots de passe et réseau', 'Les ordinateurs de votre entreprise sont-ils protégés par un antivirus ?', '["Aucun antivirus", "Sur certains ordinateurs", "Partout mais pas toujours à jour", "Partout et à jour"]'::jsonb, true, 15),
  ('Sensibilisation et sécurité humaine', 'Vos employés sont-ils informés des risques liés à internet et aux emails ?', '["Aucune information", "Conseils informels", "Information irrégulière", "Formation au moins une fois par an"]'::jsonb, true, 16),
  ('Sensibilisation et sécurité humaine', 'Vos employés savent-ils reconnaître un email suspect ou une tentative d''arnaque ?', '["Non informés", "Quelques employés", "La plupart", "Tous et savent quoi faire"]'::jsonb, true, 17),
  ('Sensibilisation et sécurité humaine', 'L''accès aux locaux où se trouvent les ordinateurs et serveurs importants est-il protégé ?', '["Accès libre", "Précautions informelles", "Certaines zones limitées", "Accès strictement contrôlé"]'::jsonb, true, 18),
  ('Sensibilisation et sécurité humaine', 'Les informations confidentielles sont-elles protégées ?', '["Aucune protection", "Limité informellement", "Restreint mais non écrit", "Restreint et protégé"]'::jsonb, true, 19),
  ('Sauvegarde, incidents et conformité', 'Les données importantes de votre entreprise sont-elles sauvegardées ?', '["Aucune sauvegarde", "De temps en temps", "Régulièrement sans vérification", "Régulièrement et vérifiée"]'::jsonb, true, 20),
  ('Sauvegarde, incidents et conformité', 'Où sont conservées les sauvegardes de vos données ?', '["Au même endroit", "Ailleurs parfois", "Ailleurs régulièrement", "Toujours ailleurs"]'::jsonb, true, 21),
  ('Sauvegarde, incidents et conformité', 'En cas de problème informatique, vos employés savent-ils quoi faire ?', '["Aucune consigne", "Au cas par cas", "Consignes connues de quelques personnes", "Procédure écrite connue de tous"]'::jsonb, true, 22),
  ('Sauvegarde, incidents et conformité', 'Si le système tombait en panne plusieurs jours, l''entreprise pourrait-elle continuer ?', '["Aucun plan", "Solutions ponctuelles", "Plan incomplet et non testé", "Plan complet testé"]'::jsonb, true, 23),
  ('Sauvegarde, incidents et conformité', 'L''entreprise respecte-t-elle les règles marocaines sur la protection des données personnelles (loi 09-08) ?', '["Non", "De façon isolée", "Généralement", "Oui avec vérification régulière"]'::jsonb, true, 24);