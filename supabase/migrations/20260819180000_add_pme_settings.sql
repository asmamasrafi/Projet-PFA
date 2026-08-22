ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alert_frequency TEXT NOT NULL DEFAULT 'hebdomadaire'
    CHECK (alert_frequency IN ('quotidienne', 'hebdomadaire', 'mensuelle')),
  ADD COLUMN 
IF NOT EXISTS security_zone TEXT NOT NULL DEFAULT 'maroc'
    CHECK (security_zone IN ('maroc', 'afrique', 'monde'));

UPDATE public.profiles
SET alert_frequency = 'hebdomadaire'
WHERE alert_frequency IS NULL;

UPDATE public.profiles
SET security_zone = 'maroc'
WHERE security_zone IS NULL;