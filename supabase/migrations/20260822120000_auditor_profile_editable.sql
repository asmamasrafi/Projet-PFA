GRANT UPDATE ON public.auditor_profiles TO authenticated;

CREATE POLICY "auditor_profiles_update_own" ON public.auditor_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);