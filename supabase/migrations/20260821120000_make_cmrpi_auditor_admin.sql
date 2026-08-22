INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role
FROM public.auditor_profiles
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles
WHERE role = 'pme'
  AND user_id IN (SELECT user_id FROM public.auditor_profiles);

UPDATE public.profiles
SET account_type = 'auditor',
    job_title = COALESCE(job_title, 'Auditeur')
WHERE id IN (SELECT user_id FROM public.auditor_profiles);
