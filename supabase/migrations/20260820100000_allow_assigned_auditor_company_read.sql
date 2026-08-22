CREATE POLICY "companies_select_assigned_auditor" ON public.companies
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.audits
    JOIN public.auditor_requests
      ON auditor_requests.audit_id = audits.id
    WHERE audits.company_id = companies.id
      AND auditor_requests.auditor_id = auth.uid()
      AND auditor_requests.status IN ('accepted', 'completed')
  )
);
