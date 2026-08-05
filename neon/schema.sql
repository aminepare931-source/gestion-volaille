-- Schéma Ma Volaille pour Neon.
-- À coller/exécuter dans le SQL Editor de la console Neon (onglet SQL Editor du projet).
--
-- Différences par rapport aux migrations Supabase d'origine :
--   - Plus de FK vers `auth.users` (ce schéma n'existe pas sur Neon). Les colonnes
--     user_id restent des UUID simples ; l'appartenance est garantie par la RLS,
--     pas par une contrainte de clé étrangère cross-schéma.
--   - Les policies RLS gardent `auth.uid()` : Neon fournit cette même fonction
--     (elle lit le claim `sub` du JWT Neon Auth et le caste en UUID), donc aucune
--     réécriture de la logique d'autorisation n'était nécessaire.
--   - Les GRANT ... TO service_role sont retirés (pas de rôle service_role sur Neon ;
--     le rôle propriétaire de la base a déjà tous les droits).
--   - Le trigger "on_auth_user_created" (qui créait profil + ferme à l'inscription)
--     est retiré : sur Neon, la table des utilisateurs est gérée par Neon Auth
--     (schéma neon_auth) et non par notre code applicatif — on préfère créer le
--     profil/la ferme depuis le code juste après une inscription réussie plutôt
--     que via un trigger sur une table gérée par un service externe.

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- FARMS
CREATE TABLE public.farms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms TO authenticated;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own farms" ON public.farms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BUILDINGS
CREATE TABLE public.buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own buildings" ON public.buildings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LOTS
CREATE TABLE public.lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lots" ON public.lots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FEED RECORDS
CREATE TABLE public.feed_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  feed_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_records TO authenticated;
ALTER TABLE public.feed_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feed" ON public.feed_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- HEALTH RECORDS
CREATE TABLE public.health_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'vaccine',
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_records TO authenticated;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own health" ON public.health_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MORTALITY RECORDS
CREATE TABLE public.mortality_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  cause TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mortality_records TO authenticated;
ALTER TABLE public.mortality_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mortality" ON public.mortality_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WEIGHT RECORDS
CREATE TABLE public.weight_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  avg_weight NUMERIC NOT NULL DEFAULT 0,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_records TO authenticated;
ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight" ON public.weight_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- STOCK ITEMS
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock" ON public.stock_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID REFERENCES public.lots ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SALES
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID REFERENCES public.lots ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  client TEXT,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sales" ON public.sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at (inchangé)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER t_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_farms BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_buildings BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_lots BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_stock BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- NOTE : contrairement à Supabase, il n'y a plus de trigger "on_auth_user_created".
-- La création du profil + de la ferme par défaut à l'inscription se fait maintenant
-- côté application (voir src/routes/auth.tsx), juste après un signUp réussi.
