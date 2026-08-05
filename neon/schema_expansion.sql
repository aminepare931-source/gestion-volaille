-- ============================================
-- EXPANSION DU SCHÉMA - ÉCOSYSTÈME IA COMPLET
-- Phase 1 : Fondations
-- ============================================
--
-- STATUT : PAS ENCORE EXÉCUTÉ SUR LA BASE. Conservé comme brouillon/référence
-- pour la suite du plan (voir PLAN_ECOSYSTEME_IA.md à la racine). Structure
-- cohérente avec neon/schema.sql (RLS via auth.uid()), mais à revoir table par
-- table et à implémenter progressivement (hooks + UI + outils IA correspondants)
-- plutôt qu'en un seul bloc, pour rester testable à chaque étape.
--
-- ============================================
-- 1. GESTION DES BÂTIMENTS INTELLIGENTS
-- ============================================

-- Équipements par bâtiment
CREATE TABLE public.building_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  building_id UUID NOT NULL REFERENCES public.buildings ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'heating', -- heating, ventilation, lighting, feeding, watering, other
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  warranty_end_date DATE,
  status TEXT NOT NULL DEFAULT 'operational', -- operational, maintenance, broken, replaced
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_equipment TO authenticated;
ALTER TABLE public.building_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own building_equipment" ON public.building_equipment FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Données environnementales en temps réel (pour IoT)
CREATE TABLE public.environmental_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  building_id UUID NOT NULL REFERENCES public.buildings ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots ON DELETE SET NULL,
  temperature NUMERIC,
  humidity NUMERIC,
  co2_level NUMERIC,
  ammonia_level NUMERIC,
  light_intensity NUMERIC,
  noise_level NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.environmental_data TO authenticated;
ALTER TABLE public.environmental_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own environmental_data" ON public.environmental_data FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index pour les requêtes temporelles
CREATE INDEX idx_environmental_data_building_time ON public.environmental_data(building_id, recorded_at DESC);
CREATE INDEX idx_environmental_data_lot_time ON public.environmental_data(lot_id, recorded_at DESC);

-- ============================================
-- 2. GESTION AVANCÉE DE L'ALIMENTATION
-- ============================================

-- Catalogue d'aliments avec valeurs nutritionnelles
CREATE TABLE public.feed_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'feed', -- feed, supplement, vitamin, mineral
  description TEXT,
  protein_percentage NUMERIC,
  energy_kcal_per_kg NUMERIC,
  calcium_percentage NUMERIC,
  phosphorus_percentage NUMERIC,
  lysine_percentage NUMERIC,
  methionine_percentage NUMERIC,
  suitable_for TEXT[], -- ['broiler', 'layer', 'chick', 'adult']
  age_range_start INTEGER, -- en jours
  age_range_end INTEGER, -- en jours
  supplier TEXT,
  unit_cost NUMERIC,
  unit TEXT NOT NULL DEFAULT 'kg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_types TO authenticated;
ALTER TABLE public.feed_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feed_types" ON public.feed_types FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Inventaire alimentaire détaillé
CREATE TABLE public.feed_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feed_type_id UUID REFERENCES public.feed_types ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  alert_threshold NUMERIC NOT NULL DEFAULT 0,
  location TEXT, -- bâtiment, silo, magasin
  batch_number TEXT,
  manufacture_date DATE,
  expiry_date DATE,
  supplier TEXT,
  purchase_price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_inventory TO authenticated;
ALTER TABLE public.feed_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feed_inventory" ON public.feed_inventory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. GESTION SANITAIRE AVANCÉE
-- ============================================

-- Encyclopédie des maladies
CREATE TABLE public.diseases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_local TEXT,
  category TEXT NOT NULL DEFAULT 'viral', -- viral, bacterial, parasitic, fungal, nutritional, other
  species_affected TEXT[], -- ['poultry', 'cattle', 'sheep', 'pig', 'all']
  symptoms TEXT[],
  transmission_mode TEXT[],
  incubation_period_days INTEGER,
  mortality_rate_percentage NUMERIC,
  treatment_description TEXT,
  prevention_measures TEXT[],
  vaccines_available BOOLEAN DEFAULT false,
  vaccine_names TEXT[],
  severity TEXT DEFAULT 'moderate', -- mild, moderate, severe, critical
  contagious BOOLEAN DEFAULT false,
  reportable_to_authorities BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diseases TO authenticated;
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own diseases" ON public.diseases FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Protocoles de vaccination
CREATE TABLE public.vaccination_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'poultry',
  breed TEXT,
  age_group TEXT, -- chick, grower, adult, all
  region TEXT, -- pour adapter aux maladies locales
  steps JSONB NOT NULL, -- [{day: 1, vaccine: "Newcastle", dose: "1ml", route: "ocular"}, ...]
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccination_protocols TO authenticated;
ALTER TABLE public.vaccination_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vaccination_protocols" ON public.vaccination_protocols FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Calendrier de vaccination par lot
CREATE TABLE public.vaccination_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.vaccination_protocols ON DELETE SET NULL,
  step_day INTEGER NOT NULL,
  vaccine_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, skipped, overdue
  completed_date DATE,
  administered_by TEXT,
  batch_number TEXT,
  dose NUMERIC,
  route TEXT, -- oral, ocular, subcutaneous, intramuscular
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaccination_schedules TO authenticated;
ALTER TABLE public.vaccination_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vaccination_schedules" ON public.vaccination_schedules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Catalogue des médicaments
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'antibiotic', -- antibiotic, antiparasitic, vitamin, supplement, other
  active_ingredient TEXT,
  dosage_form TEXT, -- tablet, injection, powder, liquid
  species TEXT[], -- ['poultry', 'cattle', 'sheep', 'pig', 'all']
  dosage_per_kg NUMERIC,
  dosage_unit TEXT DEFAULT 'mg',
  route TEXT, -- oral, injection, water, feed
  withdrawal_period_days INTEGER, -- délai d'attente
  contraindications TEXT,
  side_effects TEXT,
  storage_conditions TEXT,
  supplier TEXT,
  unit_cost NUMERIC,
  unit TEXT NOT NULL DEFAULT 'unit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own medications" ON public.medications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Stocks de médicaments
CREATE TABLE public.medication_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  medication_id UUID REFERENCES public.medications ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unit',
  alert_threshold NUMERIC NOT NULL DEFAULT 0,
  batch_number TEXT,
  manufacture_date DATE,
  expiry_date DATE,
  location TEXT,
  supplier TEXT,
  purchase_price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medication_stock TO authenticated;
ALTER TABLE public.medication_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own medication_stock" ON public.medication_stock FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Traitements administrés
CREATE TABLE public.treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID NOT NULL REFERENCES public.lots ON DELETE CASCADE,
  medication_id UUID REFERENCES public.medications ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage NUMERIC NOT NULL,
  dosage_unit TEXT NOT NULL,
  route TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  duration_days INTEGER,
  administered_by TEXT,
  reason TEXT,
  notes TEXT,
  effectiveness_rating INTEGER, -- 1-5
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatments TO authenticated;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own treatments" ON public.treatments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. GESTION DES VENTES AVANCÉE
-- ============================================

-- Clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'individual', -- individual, business, wholesale
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'CI',
  tax_id TEXT,
  company_name TEXT,
  contact_person TEXT,
  notes TEXT,
  total_purchases NUMERIC DEFAULT 0,
  last_purchase_date DATE,
  rating INTEGER DEFAULT 0, -- 0-5 étoiles
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clients" ON public.clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Produits pour la vente
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'meat', -- meat, eggs, live_animals, other
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'kg', -- kg, unit, dozen, etc.
  unit_price NUMERIC NOT NULL,
  cost_price NUMERIC,
  stock_quantity NUMERIC DEFAULT 0,
  min_stock_quantity NUMERIC DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Commandes de vente
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  delivery_address TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending', -- pending, partial, paid, overdue
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders" ON public.orders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Détails des commandes
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders ON DELETE CASCADE,
  product_id UUID REFERENCES public.products ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order_items" ON public.order_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. GESTION DES TÂCHES ET PLANNING
-- ============================================

-- Catégories de tâches
CREATE TABLE public.task_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_categories TO authenticated;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own task_categories" ON public.task_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tâches
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.task_categories ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  assigned_to TEXT,
  lot_id UUID REFERENCES public.lots ON DELETE CASCADE,
  building_id UUID REFERENCES public.buildings ON DELETE CASCADE,
  due_date DATE,
  due_time TIME,
  completed_at TIMESTAMPTZ,
  recurrence TEXT, -- daily, weekly, monthly, none
  parent_task_id UUID REFERENCES public.tasks ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. IA ET RECOMMANDATIONS
-- ============================================

-- Recommandations générées par l'IA
CREATE TABLE public.ai_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- alert, suggestion, action, prediction
  category TEXT NOT NULL, -- health, finance, nutrition, management, etc.
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  context JSONB, -- données contextuelles
  action_data JSONB, -- données pour l'action si applicable
  status TEXT NOT NULL DEFAULT 'new', -- new, read, accepted, dismissed, completed
  related_lot_id UUID REFERENCES public.lots ON DELETE CASCADE,
  related_building_id UUID REFERENCES public.buildings ON DELETE CASCADE,
  related_task_id UUID REFERENCES public.tasks ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recommendations TO authenticated;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai_recommendations" ON public.ai_recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Historique des décisions IA
CREATE TABLE public.ai_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  decision_type TEXT NOT NULL,
  context JSONB NOT NULL,
  decision JSONB NOT NULL,
  reasoning TEXT,
  confidence_score NUMERIC, -- 0-100
  was_accepted BOOLEAN,
  user_feedback TEXT,
  outcome JSONB, -- résultat après exécution
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_decisions TO authenticated;
ALTER TABLE public.ai_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai_decisions" ON public.ai_decisions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. NOTIFICATIONS
-- ============================================

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- alert, reminder, info, warning, success
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  is_important BOOLEAN DEFAULT false,
  action_url TEXT,
  expires_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index pour les notifications
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================
-- 8. FOURNISSEURS ET ACHATS
-- ============================================

-- Fournisseurs
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general', -- feed, medication, equipment, general
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'CI',
  tax_id TEXT,
  payment_terms TEXT, -- net_30, net_60, etc.
  rating INTEGER DEFAULT 0, -- 0-5
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own suppliers" ON public.suppliers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Commandes d'achat
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplier_id UUID REFERENCES public.suppliers ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, confirmed, received, cancelled
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchase_orders" ON public.purchase_orders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Détails des commandes d'achat
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  received_quantity NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchase_order_items" ON public.purchase_order_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 9. MAINTENANCE ET ÉQUIPEMENTS
-- ============================================

-- Inventaire des équipements
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- heating, ventilation, feeding, watering, cleaning, other
  building_id UUID REFERENCES public.buildings ON DELETE SET NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_price NUMERIC,
  warranty_end_date DATE,
  status TEXT DEFAULT 'operational', -- operational, maintenance, broken, retired
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own equipment" ON public.equipment FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Interventions de maintenance
CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  equipment_id UUID REFERENCES public.equipment ON DELETE CASCADE,
  building_id UUID REFERENCES public.buildings ON DELETE CASCADE,
  type TEXT NOT NULL, -- preventive, corrective, emergency
  description TEXT NOT NULL,
  performed_by TEXT,
  cost NUMERIC DEFAULT 0,
  parts_replaced TEXT,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own maintenance_records" ON public.maintenance_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 10. RESSOURCES HUMAINES
-- ============================================

-- Employés
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  position TEXT NOT NULL,
  department TEXT, -- management, care, maintenance, administration
  hire_date DATE,
  contract_type TEXT, -- cdi, cdd, seasonal, intern
  salary NUMERIC,
  emergency_contact TEXT,
  emergency_phone TEXT,
  skills TEXT[],
  certifications TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own employees" ON public.employees FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Planning des équipes
CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration INTEGER DEFAULT 0, -- en minutes
  task_description TEXT,
  lot_id UUID REFERENCES public.lots ON DELETE CASCADE,
  building_id UUID REFERENCES public.buildings ON DELETE CASCADE,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled, absent
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedules TO authenticated;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own work_schedules" ON public.work_schedules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 11. QUALITÉ ET CONFORMITÉ
-- ============================================

-- Normes et certifications
CREATE TABLE public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  category TEXT NOT NULL, -- quality, organic, export, other
  issue_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'pending', -- pending, active, expired, suspended
  certificate_number TEXT,
  audit_date DATE,
  next_audit_date DATE,
  requirements JSONB,
  documents JSONB, -- URLs des documents
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications TO authenticated;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own certifications" ON public.certifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Contrôles qualité
CREATE TABLE public.quality_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lot_id UUID REFERENCES public.lots ON DELETE CASCADE,
  check_type TEXT NOT NULL, -- weight, health, feed, environment, other
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  parameters JSONB NOT NULL, -- {weight: 2.5, temperature: 25, ...}
  result TEXT NOT NULL, -- pass, fail, warning
  notes TEXT,
  corrective_actions TEXT,
  performed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_checks TO authenticated;
ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quality_checks" ON public.quality_checks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 12. MULTI-ÉLEVAGE
-- ============================================

-- Types d'élevage
CREATE TABLE public.livestock_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL, -- poultry, cattle, sheep, pig, rabbit, fish, etc.
  name_local TEXT,
  category TEXT NOT NULL, -- bird, mammal, fish, other
  characteristics JSONB, -- {gestation_period, lifespan, avg_weight, ...}
  breeds JSONB, -- liste des races avec caractéristiques
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.livestock_types TO authenticated;
ALTER TABLE public.livestock_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own livestock_types" ON public.livestock_types FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Races
CREATE TABLE public.breeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  livestock_type_id UUID REFERENCES public.livestock_types ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin TEXT,
  characteristics JSONB, -- {avg_weight, growth_rate, egg_production, ...}
  suitable_for TEXT[], -- meat, eggs, breeding, show
  climate_adaptation TEXT[], -- tropical, temperate, etc.
  feed_requirements JSONB,
  health_considerations TEXT[],
  market_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.breeds TO authenticated;
ALTER TABLE public.breeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own breeds" ON public.breeds FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS POUR updated_at
-- ============================================

CREATE TRIGGER t_building_equipment BEFORE UPDATE ON public.building_equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_feed_types BEFORE UPDATE ON public.feed_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_feed_inventory BEFORE UPDATE ON public.feed_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_diseases BEFORE UPDATE ON public.diseases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_vaccination_protocols BEFORE UPDATE ON public.vaccination_protocols FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_vaccination_schedules BEFORE UPDATE ON public.vaccination_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_medications BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_medication_stock BEFORE UPDATE ON public.medication_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_treatments BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_task_categories BEFORE UPDATE ON public.task_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_ai_recommendations BEFORE UPDATE ON public.ai_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_notifications BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_suppliers BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_purchase_orders BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_equipment BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_maintenance_records BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_employees BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_work_schedules BEFORE UPDATE ON public.work_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_certifications BEFORE UPDATE ON public.certifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_quality_checks BEFORE UPDATE ON public.quality_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_livestock_types BEFORE UPDATE ON public.livestock_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_breeds BEFORE UPDATE ON public.breeds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Insérer les types d'élevage de base
INSERT INTO public.livestock_types (user_id, name, name_local, category, characteristics, breeds) VALUES
  ('00000000-0000-0000-0000-000000000000', 'poultry', 'Volailles', 'bird', 
   '{"gestation_period": 0, "lifespan_years": 5, "avg_weight_kg": 2.5, "sexual_maturity_days": 120}',
   '[{"name": "Broiler", "origin": "Various", "suitable_for": ["meat"]}, {"name": "Layer", "origin": "Various", "suitable_for": ["eggs"]}]'),
  ('00000000-0000-0000-0000-000000000000', 'cattle', 'Bovins', 'mammal',
   '{"gestation_period": 280, "lifespan_years": 15, "avg_weight_kg": 500, "sexual_maturity_days": 365}',
   '[{"name": "Holstein", "origin": "Netherlands", "suitable_for": ["milk"]}, {"name": "Angus", "origin": "Scotland", "suitable_for": ["meat"]}]'),
  ('00000000-0000-0000-0000-000000000000', 'sheep', 'Ovins', 'mammal',
   '{"gestation_period": 150, "lifespan_years": 10, "avg_weight_kg": 70, "sexual_maturity_days": 180}',
   '[{"name": "Merino", "origin": "Spain", "suitable_for": ["wool", "meat"]}]'),
  ('00000000-0000-0000-0000-000000000000', 'pig', 'Porcins', 'mammal',
   '{"gestation_period": 114, "lifespan_years": 10, "avg_weight_kg": 100, "sexual_maturity_days": 150}',
   '[{"name": "Large White", "origin": "England", "suitable_for": ["meat"]}]'),
  ('00000000-0000-0000-0000-000000000000', 'rabbit', 'Lapins', 'mammal',
   '{"gestation_period": 31, "lifespan_years": 8, "avg_weight_kg": 3, "sexual_maturity_days": 120}',
   '[{"name": "New Zealand", "origin": "USA", "suitable_for": ["meat"]}]');

-- Insérer des maladies courantes
INSERT INTO public.diseases (name, name_local, category, species_affected, symptoms, transmission_mode, incubation_period_days, mortality_rate_percentage, treatment_description, prevention_measures, vaccines_available, severity, contagious) VALUES
  ('Newcastle Disease', 'Maladie de Newcastle', 'viral', ['poultry'], 
   ['Respiratory distress', 'Diarrhea', 'Nervous symptoms', 'Drop in egg production'],
   ['Airborne', 'Contact with infected birds', 'Contaminated equipment'],
   3, 90, 'No specific treatment. Supportive care. Culling may be necessary.',
   ['Vaccination', 'Biosecurity', 'Quarantine new birds'], true, 'severe', true),
  ('Avian Influenza', 'Grippe aviaire', 'viral', ['poultry'],
   ['Respiratory distress', 'Drop in egg production', 'Swollen head', 'Diarrhea'],
   ['Airborne', 'Contact with wild birds', 'Contaminated water'],
   3, 100, 'No treatment. Culling required. Report to authorities.',
   ['Biosecurity', 'Avoid contact with wild birds', 'Vaccination where available'], true, 'critical', true),
  ('Coccidiosis', 'Coccidiose', 'parasitic', ['poultry', 'rabbit'],
   ['Bloody diarrhea', 'Weight loss', 'Lethargy', 'Poor growth'],
   ['Contaminated environment', 'Oocysts in feces'],
   4, 10, 'Anticoccidial drugs in water or feed. Sulfa drugs.',
   ['Clean environment', 'Medicated feed', 'Vaccination'], false, 'moderate', false),
  ('Salmonellosis', 'Salmonellose', 'bacterial', ['poultry', 'cattle', 'pig'],
   ['Diarrhea', 'Fever', 'Lethargy', 'Loss of appetite'],
   ['Fecal-oral', 'Contaminated food', 'Carrier animals'],
   2, 5, 'Antibiotics based on sensitivity test. Supportive care.',
   ['Vaccination', 'Hygiene', 'Test breeding stock'], true, 'moderate', true),
  ('Marek''s Disease', 'Maladie de Marek', 'viral', ['poultry'],
   ['Paralysis', 'Weight loss', 'Vision impairment', 'Skin tumors'],
   ['Airborne', 'Dander from infected birds'],
   10, 100, 'No treatment. Culling affected birds.',
   ['Vaccination at hatch', 'Biosecurity'], true, 'severe', false);

-- ============================================
-- INDEX POUR PERFORMANCES
-- ============================================

CREATE INDEX idx_lots_user_status ON public.lots(user_id, status);
CREATE INDEX idx_tasks_user_status ON public.tasks(user_id, status, due_date);
CREATE INDEX idx_ai_recommendations_user_status ON public.ai_recommendations(user_id, status, priority);
CREATE INDEX idx_vaccination_schedules_user_status ON public.vaccination_schedules(user_id, status, scheduled_date);
CREATE INDEX idx_orders_user_status ON public.orders(user_id, status, order_date);
CREATE INDEX idx_employees_user_active ON public.employees(user_id, is_active);

-- ============================================
-- VUES UTILES
-- ============================================

-- Vue pour les statistiques de lots
CREATE OR REPLACE VIEW public.lot_statistics AS
SELECT 
  l.id,
  l.user_id,
  l.name,
  l.breed,
  l.status,
  l.initial_count,
  COUNT(DISTINCT mr.id) as mortality_count,
  COUNT(DISTINCT s.id) as sales_count,
  (l.initial_count - COALESCE(SUM(mr.count), 0) - COALESCE(SUM(s.quantity), 0)) as alive_count,
  COALESCE(SUM(mr.count), 0) as total_deaths,
  COALESCE(SUM(s.quantity), 0) as total_sold,
  CASE 
    WHEN l.initial_count > 0 THEN ROUND((COALESCE(SUM(mr.count), 0)::numeric / l.initial_count) * 100, 2)
    ELSE 0 
  END as mortality_rate,
  l.arrival_date,
  l.created_at
FROM public.lots l
LEFT JOIN public.mortality_records mr ON l.id = mr.lot_id
LEFT JOIN public.sales s ON l.id = s.lot_id
GROUP BY l.id, l.user_id, l.name, l.breed, l.status, l.initial_count, l.arrival_date, l.created_at;

-- Vue pour les alertes de stock bas
CREATE OR REPLACE VIEW public.low_stock_alerts AS
SELECT 
  fi.id,
  fi.user_id,
  fi.name,
  fi.quantity,
  fi.alert_threshold,
  fi.unit,
  'feed' as category,
  fi.expiry_date,
  (fi.alert_threshold - fi.quantity) as deficit
FROM public.feed_inventory fi
WHERE fi.quantity <= fi.alert_threshold AND fi.alert_threshold > 0
UNION ALL
SELECT 
  ms.id,
  ms.user_id,
  ms.name,
  ms.quantity,
  ms.alert_threshold,
  ms.unit,
  'medication' as category,
  ms.expiry_date,
  (ms.alert_threshold - ms.quantity) as deficit
FROM public.medication_stock ms
WHERE ms.quantity <= ms.alert_threshold AND ms.alert_threshold > 0;

-- Vue pour les vaccinations à venir
CREATE OR REPLACE VIEW public.upcoming_vaccinations AS
SELECT 
  vs.id,
  vs.user_id,
  vs.lot_id,
  l.name as lot_name,
  vs.vaccine_name,
  vs.scheduled_date,
  vs.status,
  (vs.scheduled_date - CURRENT_DATE) as days_until_due
FROM public.vaccination_schedules vs
JOIN public.lots l ON vs.lot_id = l.id
WHERE vs.status IN ('pending', 'overdue')
  AND vs.scheduled_date >= CURRENT_DATE
ORDER BY vs.scheduled_date ASC;

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour calculer le taux de mortalité d'un lot
CREATE OR REPLACE FUNCTION public.calculate_mortality_rate(p_lot_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  initial_count INTEGER;
  death_count INTEGER;
BEGIN
  SELECT initial_count INTO initial_count FROM public.lots WHERE id = p_lot_id;
  SELECT COALESCE(SUM(count), 0) INTO death_count FROM public.mortality_records WHERE lot_id = p_lot_id;
  
  IF initial_count > 0 THEN
    RETURN ROUND((death_count::numeric / initial_count) * 100, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le FCR (Feed Conversion Ratio)
CREATE OR REPLACE FUNCTION public.calculate_fcr(p_lot_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_feed NUMERIC;
  weight_gain NUMERIC;
  initial_weight NUMERIC;
  current_weight NUMERIC;
BEGIN
  SELECT COALESCE(SUM(quantity_kg), 0) INTO total_feed 
  FROM public.feed_records 
  WHERE lot_id = p_lot_id;
  
  SELECT COALESCE(initial_count * avg_weight, 0) INTO initial_weight 
  FROM public.lots WHERE id = p_lot_id;
  
  SELECT COALESCE(AVG(avg_weight), 0) INTO current_weight 
  FROM public.weight_records 
  WHERE lot_id = p_lot_id 
  ORDER BY record_date DESC 
  LIMIT 1;
  
  weight_gain := current_weight - initial_weight;
  
  IF weight_gain > 0 THEN
    RETURN ROUND(total_feed / weight_gain, 2);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FIN DU SCHÉMA
-- ============================================

COMMENT ON SCHEMA public IS 'Schéma principal pour l''écosystème de gestion d''élevage intelligent';