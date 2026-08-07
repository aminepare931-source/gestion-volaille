CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  building_id UUID REFERENCES public.buildings ON DELETE SET NULL,
  brand TEXT,
  model TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'operational',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own equipment" ON public.equipment FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_equipment BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  equipment_id UUID NOT NULL REFERENCES public.equipment ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'repair',
  description TEXT,
  cost NUMERIC NOT NULL DEFAULT 0,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own maintenance" ON public.maintenance_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
