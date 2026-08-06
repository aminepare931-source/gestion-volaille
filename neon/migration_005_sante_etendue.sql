CREATE TABLE public.diseases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT[] NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  prevention TEXT,
  contagious BOOLEAN NOT NULL DEFAULT false,
  severity TEXT NOT NULL DEFAULT 'moderate'
);
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lecture publique des maladies" ON public.diseases FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.diseases TO authenticated;
INSERT INTO public.diseases (name, species, category, symptoms, prevention, contagious, severity) VALUES
('Maladie de Newcastle', ARRAY['volaille'], 'viral', ARRAY['toux','diarrhée verte','torticolis','baisse de ponte','mortalité rapide'], 'Vaccination (Lasota, HB1) selon calendrier', true, 'critical'),
('Gumboro (Bursite infectieuse)', ARRAY['volaille'], 'viral', ARRAY['prostration','diarrhée blanchâtre','picage de la zone cloacale'], 'Vaccination à J14 et rappel', true, 'severe'),
('Maladie de Marek', ARRAY['volaille'], 'viral', ARRAY['paralysie des pattes/ailes','tumeurs','amaigrissement'], 'Vaccination au couvoir (J1)', true, 'severe'),
('Coccidiose', ARRAY['volaille'], 'parasitic', ARRAY['diarrhée sanguinolente','abattement','baisse de croissance'], 'Litière sèche, anticoccidiens dans l''aliment', true, 'moderate'),
('Choléra aviaire', ARRAY['volaille'], 'bacterial', ARRAY['mortalité soudaine','crête bleuie','diarrhée verdâtre'], 'Biosécurité, vaccination si zone à risque', true, 'critical'),
('Peste porcine africaine', ARRAY['porcin'], 'viral', ARRAY['forte fièvre','mortalité élevée','taches cutanées'], 'Aucun vaccin : biosécurité stricte, pas de contact avec porcs sauvages', true, 'critical'),
('Fièvre aphteuse', ARRAY['bovin','ovin','caprin','porcin'], 'viral', ARRAY['vésicules bouche/pieds','boiterie','hypersalivation','baisse de lait'], 'Vaccination selon zone, contrôle des mouvements d''animaux', true, 'severe'),
('Peste des petits ruminants (PPR)', ARRAY['ovin','caprin'], 'viral', ARRAY['fièvre','écoulement nasal','diarrhée','mortalité chez les jeunes'], 'Vaccination annuelle', true, 'critical'),
('Clavelée (variole ovine/caprine)', ARRAY['ovin','caprin'], 'viral', ARRAY['pustules cutanées','fièvre','lésions buccales'], 'Vaccination', true, 'severe'),
('Fièvre de la vallée du Rift', ARRAY['bovin','ovin','caprin'], 'viral', ARRAY['avortements','fièvre','mortalité des jeunes'], 'Vaccination, lutte anti-moustique', true, 'critical'),
('Trypanosomose animale', ARRAY['bovin','ovin','caprin'], 'parasitic', ARRAY['anémie','amaigrissement progressif','fièvre intermittente'], 'Lutte anti-glossines, trypanocides préventifs en zone à risque', false, 'severe'),
('Dermatose nodulaire contagieuse', ARRAY['bovin'], 'viral', ARRAY['nodules cutanés','fièvre','baisse de lait'], 'Vaccination, lutte anti-insectes piqueurs', true, 'moderate'),
('Rage', ARRAY['bovin','ovin','caprin','porcin'], 'viral', ARRAY['changement de comportement','hypersalivation','paralysie'], 'Vaccination du cheptel et des chiens de ferme, éviter contact avec animaux sauvages', true, 'critical'),
('Parasitisme gastro-intestinal', ARRAY['bovin','ovin','caprin'], 'parasitic', ARRAY['diarrhée','amaigrissement','poil terne','anémie'], 'Vermifugation régulière, rotation des pâturages', false, 'moderate');
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unité',
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own medications" ON public.medications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER t_medications BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
