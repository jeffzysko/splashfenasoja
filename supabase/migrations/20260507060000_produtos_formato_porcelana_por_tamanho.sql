-- Adiciona campo formato (retangular/oval) e porcelana_atlas por tamanho
-- Execute no SQL Editor do Supabase

-- 1. Nova coluna formato
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS formato text NOT NULL DEFAULT 'retangular';

-- 2. Italiana é oval; todos os outros são retangulares
UPDATE produtos SET formato = 'oval' WHERE nome = 'Splash Italiana';

-- ─────────────────────────────────────────────────────────────────
-- 3. Tamanhos com porcelana_atlas: true/false por modelo
-- Fonte: splashpiscinas.com/piscinas/<modelo>
-- ─────────────────────────────────────────────────────────────────

-- TRADICIONAL — todos os 20 tamanhos aceitam Porcelana Atlas
UPDATE produtos SET tamanhos = $t1$[
  {"comprimento":"3,50m","largura":"1,80m","profundidade":"1,00m","label":"","porcelana_atlas":true},
  {"comprimento":"4,00m","largura":"2,00m","profundidade":"1,00m","label":"","porcelana_atlas":true},
  {"comprimento":"4,00m","largura":"2,00m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"4,50m","largura":"2,15m","profundidade":"1,00m","label":"","porcelana_atlas":true},
  {"comprimento":"5,00m","largura":"2,25m","profundidade":"1,20m","label":"","porcelana_atlas":true},
  {"comprimento":"5,00m","largura":"2,25m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"5,50m","largura":"2,40m","profundidade":"1,20m","label":"","porcelana_atlas":true},
  {"comprimento":"6,00m","largura":"2,50m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"6,00m","largura":"2,50m","profundidade":"1,40m","label":"com Prainha","porcelana_atlas":true},
  {"comprimento":"6,00m","largura":"2,50m","profundidade":"1,40m","label":"com SPA","porcelana_atlas":true},
  {"comprimento":"6,50m","largura":"2,70m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"7,00m","largura":"2,75m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"7,00m","largura":"2,90m","profundidade":"1,40m","label":"com Prainha","porcelana_atlas":true},
  {"comprimento":"7,00m","largura":"2,90m","profundidade":"1,40m","label":"com SPA","porcelana_atlas":true},
  {"comprimento":"7,50m","largura":"2,90m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"8,00m","largura":"3,00m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"8,00m","largura":"3,00m","profundidade":"1,40m","label":"com Prainha","porcelana_atlas":true},
  {"comprimento":"8,00m","largura":"3,00m","profundidade":"1,40m","label":"com SPA","porcelana_atlas":true},
  {"comprimento":"8,50m","largura":"3,50m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"9,00m","largura":"4,00m","profundidade":"1,40m","label":"","porcelana_atlas":true}
]$t1$::jsonb WHERE nome = 'Splash Tradicional';

-- CANCUN — nenhum tamanho aceita Porcelana Atlas
UPDATE produtos SET tamanhos = $t2$[
  {"comprimento":"3,00m","largura":"1,80m","profundidade":"0,80m","label":"","porcelana_atlas":false},
  {"comprimento":"4,00m","largura":"2,00m","profundidade":"1,20m","label":"","porcelana_atlas":false},
  {"comprimento":"5,00m","largura":"2,50m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"6,00m","largura":"3,00m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"7,00m","largura":"3,50m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"8,00m","largura":"4,00m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"10,00m","largura":"4,30m","profundidade":"1,40m","label":"","porcelana_atlas":false}
]$t2$::jsonb WHERE nome = 'Splash Cancun';

-- BONAIRE — todos os 6 tamanhos aceitam Porcelana Atlas
UPDATE produtos SET tamanhos = $t3$[
  {"comprimento":"3,00m","largura":"2,00m","profundidade":"0,90m","label":"sem banco","porcelana_atlas":true},
  {"comprimento":"4,00m","largura":"2,00m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"5,00m","largura":"2,50m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"6,00m","largura":"3,00m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"7,00m","largura":"3,50m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"8,00m","largura":"4,00m","profundidade":"1,40m","label":"","porcelana_atlas":true}
]$t3$::jsonb WHERE nome = 'Splash Bonaire';

-- TORTUGA — 9m com banco NÃO aceita Porcelana Atlas (ausente na lista do site)
UPDATE produtos SET tamanhos = $t4$[
  {"comprimento":"5,00m","largura":"2,30m","profundidade":"1,40m","label":"sem banco","porcelana_atlas":true},
  {"comprimento":"7,00m","largura":"3,30m","profundidade":"1,40m","label":"sem banco","porcelana_atlas":true},
  {"comprimento":"9,00m","largura":"3,50m","profundidade":"1,40m","label":"com banco","porcelana_atlas":false},
  {"comprimento":"10,00m","largura":"4,30m","profundidade":"1,40m","label":"com banco","porcelana_atlas":true}
]$t4$::jsonb WHERE nome = 'Splash Tortuga';

-- NASSAU — único tamanho aceita Porcelana Atlas
UPDATE produtos SET tamanhos = $t5$[
  {"comprimento":"4,00m","largura":"3,00m","profundidade":"1,00m","label":"","porcelana_atlas":true}
]$t5$::jsonb WHERE nome = 'Splash Nassau';

-- ATALAIA — 7m NÃO aceita Porcelana Atlas; apenas 9m aceita
UPDATE produtos SET tamanhos = $t6$[
  {"comprimento":"7,00m","largura":"3,30m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"9,00m","largura":"4,00m","profundidade":"1,40m","label":"","porcelana_atlas":true}
]$t6$::jsonb WHERE nome = 'Splash Atalaia';

-- FAROL DA BARRA — nenhum tamanho aceita Porcelana Atlas
UPDATE produtos SET tamanhos = $t7$[
  {"comprimento":"4,00m","largura":"2,00m","profundidade":"1,20m","label":"","porcelana_atlas":false},
  {"comprimento":"5,00m","largura":"2,50m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"6,00m","largura":"3,00m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"7,00m","largura":"3,50m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"8,00m","largura":"4,00m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"9,00m","largura":"4,25m","profundidade":"1,40m","label":"","porcelana_atlas":false}
]$t7$::jsonb WHERE nome = 'Splash Farol da Barra';

-- TROPICAL — nenhum tamanho aceita Porcelana Atlas
UPDATE produtos SET tamanhos = $t8$[
  {"comprimento":"3,50m","largura":"1,80m","profundidade":"0,80m","label":"","porcelana_atlas":false},
  {"comprimento":"4,00m","largura":"2,00m","profundidade":"1,00m","label":"","porcelana_atlas":false},
  {"comprimento":"4,00m","largura":"2,00m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"5,00m","largura":"2,40m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"6,00m","largura":"2,60m","profundidade":"1,30m","label":"","porcelana_atlas":false},
  {"comprimento":"6,00m","largura":"2,60m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"7,00m","largura":"2,80m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"8,00m","largura":"3,00m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"9,00m","largura":"3,50m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"10,00m","largura":"4,00m","profundidade":"1,40m","label":"","porcelana_atlas":false}
]$t8$::jsonb WHERE nome = 'Splash Tropical';

-- ITALIANA — nenhum tamanho aceita Porcelana Atlas (modelo oval)
UPDATE produtos SET tamanhos = $t9$[
  {"comprimento":"2,50m","largura":"1,50m","profundidade":"0,30m","label":"sem banco*","porcelana_atlas":false},
  {"comprimento":"3,00m","largura":"2,00m","profundidade":"0,60m","label":"sem banco","porcelana_atlas":false},
  {"comprimento":"3,20m","largura":"2,00m","profundidade":"1,30m","label":"sem banco","porcelana_atlas":false},
  {"comprimento":"3,50m","largura":"2,00m","profundidade":"0,80m","label":"sem banco","porcelana_atlas":false},
  {"comprimento":"4,00m","largura":"2,40m","profundidade":"1,30m","label":"","porcelana_atlas":false},
  {"comprimento":"5,00m","largura":"2,80m","profundidade":"1,30m","label":"","porcelana_atlas":false},
  {"comprimento":"6,00m","largura":"3,00m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"7,00m","largura":"3,50m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"8,00m","largura":"4,00m","profundidade":"1,40m","label":"","porcelana_atlas":false}
]$t9$::jsonb WHERE nome = 'Splash Italiana';

-- NAVAGIO — todos os tamanhos incluem Porcelana Atlas (é padrão no modelo)
UPDATE produtos SET tamanhos = $t10$[
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"0,86m","label":"Banco Direito","porcelana_atlas":true},
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"0,86m","label":"Banco Direito - Acrílico RETO","porcelana_atlas":true},
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"0,86m","label":"Banco Direito - Acrílico L","porcelana_atlas":true},
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"0,86m","label":"Banco Esquerdo","porcelana_atlas":true},
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"0,86m","label":"Banco Esquerdo - Acrílico RETO","porcelana_atlas":true},
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"0,86m","label":"Banco Esquerdo - Acrílico L","porcelana_atlas":true},
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"1,40m","label":"Banco Direito","porcelana_atlas":true},
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"1,40m","label":"Banco Direito - Acrílico RETO","porcelana_atlas":true},
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"1,40m","label":"Banco Esquerdo","porcelana_atlas":true},
  {"comprimento":"3,25m","largura":"2,25m","profundidade":"1,40m","label":"Banco Esquerdo - Acrílico RETO","porcelana_atlas":true}
]$t10$::jsonb WHERE nome = 'Splash Navagio';
