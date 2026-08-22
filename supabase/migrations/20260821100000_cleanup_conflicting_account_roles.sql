DELETE FROM public.user_roles
WHERE role = 'pme'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles auditor_role
    WHERE auditor_role.user_id = user_roles.user_id
      AND auditor_role.role IN ('auditor', 'admin')
  );

UPDATE public.profiles
SET account_type = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = profiles.id AND role = 'admin'
  ) THEN 'admin'
  WHEN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = profiles.id AND role = 'auditor'
  ) THEN 'auditor'
  ELSE 'pme'
END
WHERE id IS NOT NULL;
