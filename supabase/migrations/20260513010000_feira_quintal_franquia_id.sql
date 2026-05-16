-- ============================================================
-- MIGRAÇÃO: Vincula cada feira a uma ou mais franquias do Quintal Ideal
-- ============================================================
-- quintal_franquia_ids: array de UUIDs das franquias no banco do quintalideal
-- que co-organizaram esta feira e receberão os leads capturados.
-- Quando vazio, leads chegam sem franquia (redistribuição por cidade apenas).

-- Remove coluna singular anterior (se existir de tentativa prévia)
ALTER TABLE public.feiras
  DROP COLUMN IF EXISTS quintal_franquia_id;

ALTER TABLE public.feiras
  ADD COLUMN IF NOT EXISTS quintal_franquia_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.feiras.quintal_franquia_ids IS
  'UUIDs das franquias no projeto quintalideal responsáveis por esta feira. '
  'Suporta múltiplas franquias co-organizadoras. '
  'Usado como origin_franquia_ids na integração de leads.';
