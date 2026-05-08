-- Corrige formato: Tropical é oval, Tradicional é retangular
-- Execute no SQL Editor do Supabase

UPDATE produtos SET formato = 'oval'       WHERE nome = 'Splash Tropical';
UPDATE produtos SET formato = 'retangular' WHERE nome = 'Splash Tradicional';
