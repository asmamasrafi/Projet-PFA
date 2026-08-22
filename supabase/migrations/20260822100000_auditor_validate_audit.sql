-- Empêche un auditeur de modifier autre chose que le statut / la date de clôture
CREATE OR REPLACE FUNCTION public.protect_audit_columns_for_auditor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'auditor') AND NOT public.has_role(auth.uid(), 'pme') THEN
    IF NEW.company_id <> OLD.company_id
       OR NEW.owner_id <> OLD.owner_id
       OR NEW.score IS DISTINCT FROM OLD.score
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'Un auditeur ne peut modifier que le statut et la date de clôture de l''audit.';
    END IF;
    IF NEW.status NOT IN ('in_review', 'completed') THEN
      RAISE EXCEPTION 'Statut non autorisé pour un auditeur.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_audit_columns_for_auditor
BEFORE UPDATE ON public.audits
FOR EACH ROW
EXECUTE FUNCTION public.protect_audit_columns_for_auditor();

CREATE POLICY "audits_update_status_auditor" ON public.audits FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'auditor'))
  WITH CHECK (public.has_role(auth.uid(), 'auditor'));