-- ============================================================
-- MIGRAÇÃO: Vincula cada feira a uma franquia do Quintal Ideal
-- ============================================================
-- quintal_franquia_id: UUID da franquia no banco do quintalideal
-- que organizou esta feira e receberá os leads capturados.
-- Quando null, leads chegam sem franquia (redistribuição por cidade apenas).

ALTER TABLE public.feiras
  ADD COLUMN IF NOT EXISTS quintal_franquia_id UUID;

COMMENT ON COLUMN public.feiras.quintal_franquia_id IS
  'UUID da franquia no projeto quintalideal responsável por esta feira. '
  'Usado como origin_franchise_id na integração de leads.';
