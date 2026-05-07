-- Seed catálogo Splash Piscinas — use no SQL Editor do Supabase
-- Esta versão usa dollar-quoting para evitar conflitos de aspas

DELETE FROM produtos;

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Tradicional',
  'A Splash Tradicional tem formas retangulares elaboradas para maior aproveitamento de seu espaço. Com pastilhas de porcelana da Atlas nas bordas em todos os tamanhos, e opções com Prainha e SPA.',
  $t1$[{"comprimento": "3,50m", "largura": "1,80m", "profundidade": "1,00m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,00m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "4,50m", "largura": "2,15m", "profundidade": "1,00m", "label": ""}, {"comprimento": "5,00m", "largura": "2,25m", "profundidade": "1,20m", "label": ""}, {"comprimento": "5,00m", "largura": "2,25m", "profundidade": "1,40m", "label": ""}, {"comprimento": "5,50m", "largura": "2,40m", "profundidade": "1,20m", "label": ""}, {"comprimento": "6,00m", "largura": "2,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "2,50m", "profundidade": "1,40m", "label": "com Prainha"}, {"comprimento": "6,00m", "largura": "2,50m", "profundidade": "1,40m", "label": "com SPA"}, {"comprimento": "6,50m", "largura": "2,70m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "2,75m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "2,90m", "profundidade": "1,40m", "label": "com Prainha"}, {"comprimento": "7,00m", "largura": "2,90m", "profundidade": "1,40m", "label": "com SPA"}, {"comprimento": "7,50m", "largura": "2,90m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "3,00m", "profundidade": "1,40m", "label": "com Prainha"}, {"comprimento": "8,00m", "largura": "3,00m", "profundidade": "1,40m", "label": "com SPA"}, {"comprimento": "8,50m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "9,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}]$t1$::jsonb,
  $o1$["Pastilha de Porcelana Atlas"]$o1$::jsonb,
  $f1$["https://cdn.splashpiscinas.com/assets/img/splash-tradicional-8m-SPA-e-pastilha-porcelana-azul.png", "https://cdn.splashpiscinas.com/assets/img/tradicional/splash-tradicional-semipastilhada-6m.jpg", "https://cdn.splashpiscinas.com/assets/img/tradicional/detalhe-splash-tradicional-semipastilhada-6m.jpg", "https://cdn.splashpiscinas.com/assets/img/tradicional/tradicional-modelo-8m.jpg", "https://cdn.splashpiscinas.com/assets/img/tradicional/tradicional-modelo-6m.jpg", "https://cdn.splashpiscinas.com/assets/img/tradicional/br_splash_tradicional_fn01.jpg", "https://cdn.splashpiscinas.com/assets/img/tradicional/br_splash_tradicional-prainha_fn02.jpg", "https://cdn.splashpiscinas.com/assets/img/cores-modelos-tradicional-1a.png", "https://cdn.splashpiscinas.com/assets/img/cores-modelos-tradicional-2a.png", "https://cdn.splashpiscinas.com/assets/img/cores-modelos-tradicional-3a.png"]$f1$::jsonb,
  true, 1
);

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Cancun',
  'A Splash Cancun é o modelo perfeito para quem busca lazer completo. Com prainha integrada e design moderno, transforma qualquer espaço externo em um verdadeiro paraíso.',
  $t2$[{"comprimento": "3,00m", "largura": "1,80m", "profundidade": "0,80m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,20m", "label": ""}, {"comprimento": "5,00m", "largura": "2,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "10,00m", "largura": "4,30m", "profundidade": "1,40m", "label": ""}]$t2$::jsonb,
  $o2$[]$o2$::jsonb,
  $f2$["https://cdn.splashpiscinas.com/assets/img/cancun/cancun-azul.png", "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia01.jpg", "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia02.jpg", "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-noite01.jpg", "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia04.jpg", "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia05.jpg", "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-detalhe.jpg", "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia06.jpg", "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-noite02.jpg", "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia08.jpg", "https://cdn.splashpiscinas.com/assets/img/cancun/cores-modelos-cancun.jpg"]$f2$::jsonb,
  true, 2
);

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Bonaire',
  'A Splash Bonaire é ideal para famílias que desejam uma piscina espaçosa e elegante. Com área de lazer integrada e bordas com pastilhas de porcelana Atlas.',
  $t3$[{"comprimento": "3,00m", "largura": "2,00m", "profundidade": "0,90m", "label": "sem banco"}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "5,00m", "largura": "2,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}]$t3$::jsonb,
  $o3$["Pastilha de Porcelana Atlas"]$o3$::jsonb,
  $f3$["https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-branca.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia01.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia02.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia03.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia04.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia05.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia06.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia07.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia08.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia09.png", "https://cdn.splashpiscinas.com/assets/img/bonaire/cores-modelos-bonaire.jpg"]$f3$::jsonb,
  true, 3
);

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Tortuga',
  'A Splash Tortuga combina praticidade e estilo, com área rasa integrada para maior conforto. Disponível com banco e sem banco, com bordas de pastilha de porcelana Atlas.',
  $t4$[{"comprimento": "5,00m", "largura": "2,30m", "profundidade": "1,40m", "label": "sem banco"}, {"comprimento": "7,00m", "largura": "3,30m", "profundidade": "1,40m", "label": "sem banco"}, {"comprimento": "9,00m", "largura": "3,50m", "profundidade": "1,40m", "label": "com banco"}, {"comprimento": "10,00m", "largura": "4,30m", "profundidade": "1,40m", "label": "com banco"}]$t4$::jsonb,
  $o4$["Pastilha de Porcelana Atlas"]$o4$::jsonb,
  $f4$["https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-azul.png", "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga_dia01.jpg", "https://cdn.splashpiscinas.com/assets/img/tortuga/tortura-dia02.jpg", "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-noite03.jpg", "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-detalhes.jpg", "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-noite01.jpg", "https://cdn.splashpiscinas.com/assets/img/tortuga/tortura-dia04.jpg", "https://cdn.splashpiscinas.com/assets/img/tortuga/tortura-dia05.png", "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-noite02.jpg", "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-detalhes02.jpg", "https://cdn.splashpiscinas.com/assets/img/tortuga/cores-modelos-tortuga.jpg"]$f4$::jsonb,
  true, 4
);

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Nassau',
  'A Splash Nassau é a escolha perfeita para espaços menores, sem abrir mão do estilo e da qualidade Splash. Com pastilhas de porcelana Atlas nas bordas.',
  $t5$[{"comprimento": "4,00m", "largura": "3,00m", "profundidade": "1,00m", "label": ""}]$t5$::jsonb,
  $o5$["Pastilha de Porcelana Atlas"]$o5$::jsonb,
  $f5$["https://cdn.splashpiscinas.com/assets/img/nassau/nassau-azul-4.png", "https://cdn.splashpiscinas.com/assets/img/nassau/nassau-dia01.png", "https://cdn.splashpiscinas.com/assets/img/nassau/nassau-dia02.png", "https://cdn.splashpiscinas.com/assets/img/nassau/cores-modelos-nassau.jpg"]$f5$::jsonb,
  true, 5
);

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Atalaia',
  'A Splash Atalaia é o modelo mais completo, com SPA integrado e wet deck para grandes áreas de lazer. Design exclusivo com pastilhas de porcelana Atlas.',
  $t6$[{"comprimento": "7,00m", "largura": "3,30m", "profundidade": "1,40m", "label": ""}, {"comprimento": "9,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}]$t6$::jsonb,
  $o6$["Pastilha de Porcelana Atlas"]$o6$::jsonb,
  $f6$["https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia-azul.png", "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia01_dia.png", "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia01_noite.png", "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia03_dia.png", "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia_detalhe.png", "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia02_dia.png", "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia02_noite.png", "https://cdn.splashpiscinas.com/assets/img/atalaia/cores-modelos-atalaia.jpg", "https://cdn.splashpiscinas.com/assets/img/atalaia/modelos-atalaia.jpg"]$f6$::jsonb,
  true, 6
);

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Farol da Barra',
  'A Splash Farol da Barra tem design arrojado e imponente, ideal para grandes áreas externas. Modelo retangular de dimensões amplas para quem quer o melhor em lazer.',
  $t7$[{"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,20m", "label": ""}, {"comprimento": "5,00m", "largura": "2,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "9,00m", "largura": "4,25m", "profundidade": "1,40m", "label": ""}]$t7$::jsonb,
  $o7$[]$o7$::jsonb,
  $f7$["https://cdn.splashpiscinas.com/assets/img/farol-da-barra/farol-7m-azul.png", "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-04a.jpg", "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-05a.jpg", "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-06a.jpg", "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-07a.jpg", "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-08a.jpg", "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-09a.jpg", "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-10a.jpg", "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/cores-modelos-farol.png"]$f7$::jsonb,
  true, 7
);

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Tropical',
  'A Splash Tropical é o modelo com personalidade forte e área de lazer completa. Design que remete ao verão eterno, com espaço generoso e acabamento premium.',
  $t8$[{"comprimento": "3,50m", "largura": "1,80m", "profundidade": "0,80m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,00m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "5,00m", "largura": "2,40m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "2,60m", "profundidade": "1,30m", "label": ""}, {"comprimento": "6,00m", "largura": "2,60m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "2,80m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "9,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "10,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}]$t8$::jsonb,
  $o8$[]$o8$::jsonb,
  $f8$["https://cdn.splashpiscinas.com/assets/img/tropical/tropical-7m-branca.png", "https://cdn.splashpiscinas.com/assets/img/tropical/br_splash_tropical_fn01.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/tropical17a.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/tropical02a.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/tropical05a.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/tropical06a.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/tropical08a.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/tropical09a.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/tropical13a.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/tropical14a.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/tropical15a.jpg", "https://cdn.splashpiscinas.com/assets/img/tropical/cores-modelos-tropical.png"]$f8$::jsonb,
  true, 8
);

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Italiana',
  'A Splash Italiana é o modelo mais vendido do Brasil, com design sofisticado de cantos arredondados. Elegância e funcionalidade em perfeita harmonia para seu espaço externo.',
  $t9$[{"comprimento": "2,50m", "largura": "1,50m", "profundidade": "0,30m", "label": "sem banco*"}, {"comprimento": "3,00m", "largura": "2,00m", "profundidade": "0,60m", "label": "sem banco"}, {"comprimento": "3,20m", "largura": "2,00m", "profundidade": "1,30m", "label": "sem banco"}, {"comprimento": "3,50m", "largura": "2,00m", "profundidade": "0,80m", "label": "sem banco"}, {"comprimento": "4,00m", "largura": "2,40m", "profundidade": "1,30m", "label": ""}, {"comprimento": "5,00m", "largura": "2,80m", "profundidade": "1,30m", "label": ""}, {"comprimento": "6,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}]$t9$::jsonb,
  $o9$[]$o9$::jsonb,
  $f9$["https://cdn.splashpiscinas.com/assets/img/italiana/italiana-8m-branca.png", "https://cdn.splashpiscinas.com/assets/img/italiana/br_splash_italiana_fn01.jpg", "https://cdn.splashpiscinas.com/assets/img/italiana/br_splash_italiana_fn02.jpg", "https://cdn.splashpiscinas.com/assets/img/italiana/italiana15a.jpg", "https://cdn.splashpiscinas.com/assets/img/italiana/italiana08a.jpg", "https://cdn.splashpiscinas.com/assets/img/italiana/italiana11a.jpg", "https://cdn.splashpiscinas.com/assets/img/italiana/italiana07a.jpg", "https://cdn.splashpiscinas.com/assets/img/italiana/italiana02a.jpg", "https://cdn.splashpiscinas.com/assets/img/italiana/cores-modelos-italianas.png"]$f9$::jsonb,
  true, 9
);

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem) VALUES (
  'Splash Navagio',
  'A Splash Navagio é a combinação perfeita de sofisticação e diversão, ideal para reunir família e amigos. Com banco submerso, painel de acrílico opcional e pastilhas de porcelana Atlas.',
  $t10$[{"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Direito"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Direito - Acrílico RETO"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Direito - Acrílico L"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Esquerdo"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Esquerdo - Acrílico RETO"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Esquerdo - Acrílico L"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "1,40m", "label": "Banco Direito"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "1,40m", "label": "Banco Direito - Acrílico RETO"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "1,40m", "label": "Banco Esquerdo"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "1,40m", "label": "Banco Esquerdo - Acrílico RETO"}]$t10$::jsonb,
  $o10$["Pastilha de Porcelana Atlas", "Acrílico"]$o10$::jsonb,
  $f10$["https://cdn.splashpiscinas.com/assets/img/navagio/galeria/splash-navagio-azul.webp", "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-splash-piscina-1.webp", "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-splash-piscina-2.webp", "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-splash-piscina-3.webp", "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-1.webp", "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-2.webp", "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-3.webp", "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-4.webp", "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-5.webp"]$f10$::jsonb,
  true, 10
);
