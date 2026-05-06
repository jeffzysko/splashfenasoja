-- ============================================================
-- Migration: WhatsApp por feira + sons de notificação self-hosted
-- ============================================================

-- 1. Adiciona campo whatsapp na tabela feiras
ALTER TABLE public.feiras
  ADD COLUMN IF NOT EXISTS whatsapp text;

-- 2. Atualiza os sons padrão para versão self-hosted (relativo ao domínio)
--    Apenas onde o usuário ainda tem os valores padrão do Google CDN ou valores nulos
UPDATE public.user_notif_prefs
SET
  sound_quente = CASE
    WHEN sound_quente IS NULL OR sound_quente LIKE '%google%' OR sound_quente LIKE '%actions%'
    THEN '/sounds/quente.mp3'
    ELSE sound_quente
  END,
  sound_morno = CASE
    WHEN sound_morno IS NULL OR sound_morno LIKE '%google%' OR sound_morno LIKE '%actions%'
    THEN '/sounds/morno.mp3'
    ELSE sound_morno
  END,
  sound_frio = CASE
    WHEN sound_frio IS NULL OR sound_frio LIKE '%google%' OR sound_frio LIKE '%actions%'
    THEN '/sounds/frio.mp3'
    ELSE sound_frio
  END;
