
-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- FARMS
CREATE TABLE public.farms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms TO authenticated;
GRANT ALL ON public.farms TO service_role;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own farms" ON public.farms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BUILDINGS
CREATE TABLE public.buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own buildings" ON public.buildings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LOTS
CREATE TABLE public.lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  breed TEXT,
  arrival_date DATE NOT NULL DEFAULT CURRENT_DATE,
  initial_count INTEGER NOT NULL DEFAULT 0,
  purchase_cost NUMERIC NOT NULL DEFAULT 0,
  avg_weight NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  building_id UUID REFERENCES public.buildings ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lots TO authenticated;
GRANT ALL ON public.lots TO service_role;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lots" ON public.lots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FEED RECORDS
CREATE TABLE public.feed_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  feed_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_records TO authenticated;
GRANT ALL ON public.feed_records TO service_role;
ALTER TABLE public.feed_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feed" ON public.feed_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- HEALTH RECORDS
CREATE TABLE public.health_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'vaccine',
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_records TO authenticated;
GRANT ALL ON public.health_records TO service_role;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health" ON public.health_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MORTALITY RECORDS
CREATE TABLE public.mortality_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  cause TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mortality_records TO authenticated;
GRANT ALL ON public.mortality_records TO service_role;
ALTER TABLE public.mortality_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mortality" ON public.mortality_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WEIGHT RECORDS
CREATE TABLE public.weight_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  avg_weight NUMERIC NOT NULL DEFAULT 0,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_records TO authenticated;
GRANT ALL ON public.weight_records TO service_role;
ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight" ON public.weight_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STOCK ITEMS
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'feed',
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  alert_threshold NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock" ON public.stock_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SALES
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  client TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sales" ON public.sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER t_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_farms BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_buildings BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_lots BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_stock BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + farm on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.farms (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'farm_name', 'Ma Ferme'));
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
