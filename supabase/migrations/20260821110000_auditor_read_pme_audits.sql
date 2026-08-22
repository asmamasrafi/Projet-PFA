CREATE POLICY "companies_select_auditor" ON public.companies
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'auditor'));

CREATE POLICY "audits_select_auditor" ON public.audits
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'auditor'));

CREATE POLICY "audit_answers_select_auditor" ON public.audit_answers
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'auditor'));
