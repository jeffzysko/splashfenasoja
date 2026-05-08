-- Adiciona variantes com SPA e com Prainha para Atalaia e Tortuga
-- Execute no SQL Editor do Supabase

-- ATALAIA — adiciona variantes com SPA e com Prainha no tamanho 9m
UPDATE produtos SET tamanhos = $t1$[
  {"comprimento":"7,00m","largura":"3,30m","profundidade":"1,40m","label":"","porcelana_atlas":false},
  {"comprimento":"9,00m","largura":"4,00m","profundidade":"1,40m","label":"","porcelana_atlas":true},
  {"comprimento":"9,00m","largura":"4,00m","profundidade":"1,40m","label":"com SPA","porcelana_atlas":true},
  {"comprimento":"9,00m","largura":"4,00m","profundidade":"1,40m","label":"com Prainha","porcelana_atlas":true}
]$t1$::jsonb WHERE nome = 'Splash Atalaia';

-- TORTUGA — adiciona variante com Prainha no tamanho 10m
UPDATE produtos SET tamanhos = $t2$[
  {"comprimento":"5,00m","largura":"2,30m","profundidade":"1,40m","label":"sem banco","porcelana_atlas":true},
  {"comprimento":"7,00m","largura":"3,30m","profundidade":"1,40m","label":"sem banco","porcelana_atlas":true},
  {"comprimento":"9,00m","largura":"3,50m","profundidade":"1,40m","label":"com banco","porcelana_atlas":false},
  {"comprimento":"10,00m","largura":"4,30m","profundidade":"1,40m","label":"com banco","porcelana_atlas":true},
  {"comprimento":"10,00m","largura":"4,30m","profundidade":"1,40m","label":"com Prainha","porcelana_atlas":true}
]$t2$::jsonb WHERE nome = 'Splash Tortuga';
