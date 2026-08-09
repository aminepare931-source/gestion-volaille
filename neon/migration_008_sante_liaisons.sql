ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS medication_id UUID REFERENCES public.medications ON DELETE SET NULL;

ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS disease_id UUID REFERENCES public.diseases ON DELETE SET NULL;

ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS quantity_used NUMERIC;
