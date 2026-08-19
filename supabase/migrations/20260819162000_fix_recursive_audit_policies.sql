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

DROP POLICY IF EXISTS "audits_select_assigned_auditor" ON public.audits;
CREATE POLICY "audits_select_assigned_auditor" ON public.audits FOR SELECT TO authenticated
  USING (public.has_assigned_audit(id, auth.uid()));

DROP POLICY IF EXISTS "audit_answers_select_assigned_auditor" ON public.audit_answers;
CREATE POLICY "audit_answers_select_assigned_auditor" ON public.audit_answers FOR SELECT TO authenticated
  USING (public.has_assigned_audit(audit_id, auth.uid()));