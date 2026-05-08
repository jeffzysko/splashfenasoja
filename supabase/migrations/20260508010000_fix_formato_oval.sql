-- Corrige formato: Tradicional e Farol da Barra também são oval
-- Execute no SQL Editor do Supabase

UPDATE produtos
SET formato = 'oval'
WHERE nome IN ('Splash Tradicional', 'Splash Farol da Barra');
