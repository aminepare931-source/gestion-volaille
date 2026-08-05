-- Migration additive : prépare le schéma au multi-espèces.
-- Non-destructive : ajoute des colonnes, ne touche à rien d'existant.
-- Sécurisée à réexécuter (IF NOT EXISTS).

ALTER TABLE public.lots
  ADD COLUMN IF NOT EXISTS species TEXT NOT NULL DEFAULT 'volaille';

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS species TEXT;
  -- NULL = polyvalent / non spécialisé. Une valeur = bâtiment dédié à une espèce
  -- (ex: 'volaille', 'bovin', 'ovin', 'caprin', 'porcin', 'aquaculture'...).

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS building_type TEXT;
  -- Ex: 'poulailler', 'étable', 'bergerie', 'chèvrerie', 'porcherie', 'bassin'...
  -- Libre (texte), pas une enum stricte : on laisse l'IA et l'utilisateur le nommer.

COMMENT ON COLUMN public.lots.species IS 'Espèce du lot : volaille, bovin, ovin, caprin, porcin, aquaculture, etc. Texte libre, non contraint, pour rester extensible.';
COMMENT ON COLUMN public.buildings.species IS 'Espèce pour laquelle le bâtiment est équipé. NULL = polyvalent.';
