-- Module Tâches & Rappels. Non-destructif, à exécuter dans le SQL Editor Neon.
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, cancelled
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  lot_id UUID REFERENCES public.lots ON DELETE CASCADE,
  building_id UUID REFERENCES public.buildings ON DELETE CASCADE,
  due_date DATE,
  created_by TEXT NOT NULL DEFAULT 'user', -- 'user' ou 'ia' (pour distinguer les suggestions IA)
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER t_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
