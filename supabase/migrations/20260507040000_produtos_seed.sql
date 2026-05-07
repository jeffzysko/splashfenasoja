-- ============================================================
-- Seed do catálogo de produtos Splash Piscinas
-- Execute no SQL Editor do Supabase
-- Atenção: rode apenas uma vez. Para re-popular, descomente o DELETE abaixo.
-- ============================================================

-- DELETE FROM produtos; -- descomente se quiser zerar antes de reinserir

INSERT INTO produtos (nome, descricao, tamanhos, opcionais, fotos, ativo, ordem)
VALUES
(
  'Splash Tradicional',
  'A Splash Tradicional tem formas retangulares elaboradas para maior aproveitamento de seu espaço. Com pastilhas de porcelana da Atlas nas bordas em todos os tamanhos, e opções com Prainha e SPA.',
  '[{"comprimento": "3,50m", "largura": "1,80m", "profundidade": "1,00m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,00m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "4,50m", "largura": "2,15m", "profundidade": "1,00m", "label": ""}, {"comprimento": "5,00m", "largura": "2,25m", "profundidade": "1,20m", "label": ""}, {"comprimento": "5,00m", "largura": "2,25m", "profundidade": "1,40m", "label": ""}, {"comprimento": "5,50m", "largura": "2,40m", "profundidade": "1,20m", "label": ""}, {"comprimento": "6,00m", "largura": "2,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "2,50m", "profundidade": "1,40m", "label": "com Prainha"}, {"comprimento": "6,00m", "largura": "2,50m", "profundidade": "1,40m", "label": "com SPA"}, {"comprimento": "6,50m", "largura": "2,70m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "2,75m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "2,90m", "profundidade": "1,40m", "label": "com Prainha"}, {"comprimento": "7,00m", "largura": "2,90m", "profundidade": "1,40m", "label": "com SPA"}, {"comprimento": "7,50m", "largura": "2,90m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "3,00m", "profundidade": "1,40m", "label": "com Prainha"}, {"comprimento": "8,00m", "largura": "3,00m", "profundidade": "1,40m", "label": "com SPA"}, {"comprimento": "8,50m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "9,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}]'::jsonb,
  '["Pastilha de Porcelana Atlas"]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/splash-tradicional-8m-SPA-e-pastilha-porcelana-azul.png", "https://www.splashpiscinas.com/assets/img/tradicional/splash-tradicional-semipastilhada-6m.jpg", "https://www.splashpiscinas.com/assets/img/tradicional/detalhe-splash-tradicional-semipastilhada-6m.jpg", "https://www.splashpiscinas.com/assets/img/tradicional/tradicional-modelo-8m.jpg", "https://www.splashpiscinas.com/assets/img/tradicional/tradicional-modelo-6m.jpg", "https://www.splashpiscinas.com/assets/img/tradicional/br_splash_tradicional_fn01.jpg", "https://www.splashpiscinas.com/assets/img/tradicional/br_splash_tradicional-prainha_fn02.jpg", "https://www.splashpiscinas.com/assets/img/cores-modelos-tradicional-1a.png", "https://www.splashpiscinas.com/assets/img/cores-modelos-tradicional-2a.png", "https://www.splashpiscinas.com/assets/img/cores-modelos-tradicional-3a.png"]'::jsonb,
  true,
  1
),
(
  'Splash Cancun',
  'A Splash Cancun é o modelo perfeito para quem busca lazer completo. Com prainha integrada e design moderno, transforma qualquer espaço externo em um verdadeiro paraíso.',
  '[{"comprimento": "3,00m", "largura": "1,80m", "profundidade": "0,80m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,20m", "label": ""}, {"comprimento": "5,00m", "largura": "2,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "10,00m", "largura": "4,30m", "profundidade": "1,40m", "label": ""}]'::jsonb,
  '[]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/cancun/cancun-azul.png", "https://www.splashpiscinas.com/assets/img/cancun/cancun-dia01.jpg", "https://www.splashpiscinas.com/assets/img/cancun/cancun-dia02.jpg", "https://www.splashpiscinas.com/assets/img/cancun/cancun-noite01.jpg", "https://www.splashpiscinas.com/assets/img/cancun/cancun-dia04.jpg", "https://www.splashpiscinas.com/assets/img/cancun/cancun-dia05.jpg", "https://www.splashpiscinas.com/assets/img/cancun/cancun-detalhe.jpg", "https://www.splashpiscinas.com/assets/img/cancun/cancun-dia06.jpg", "https://www.splashpiscinas.com/assets/img/cancun/cancun-noite02.jpg", "https://www.splashpiscinas.com/assets/img/cancun/cancun-dia08.jpg", "https://www.splashpiscinas.com/assets/img/cancun/cores-modelos-cancun.jpg"]'::jsonb,
  true,
  2
),
(
  'Splash Bonaire',
  'A Splash Bonaire é ideal para famílias que desejam uma piscina espaçosa e elegante. Com área de lazer integrada e bordas com pastilhas de porcelana Atlas.',
  '[{"comprimento": "3,00m", "largura": "2,00m", "profundidade": "0,90m", "label": "sem banco"}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "5,00m", "largura": "2,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}]'::jsonb,
  '["Pastilha de Porcelana Atlas"]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/bonaire/bonaire-branca.png", "https://www.splashpiscinas.com/assets/img/bonaire/bonaire-dia01.png", "https://www.splashpiscinas.com/assets/img/bonaire/bonaire-dia02.png", "https://www.splashpiscinas.com/assets/img/bonaire/bonaire-dia03.png", "https://www.splashpiscinas.com/assets/img/bonaire/bonaire-dia04.png", "https://www.splashpiscinas.com/assets/img/bonaire/bonaire-dia05.png", "https://www.splashpiscinas.com/assets/img/bonaire/bonaire-dia06.png", "https://www.splashpiscinas.com/assets/img/bonaire/bonaire-dia07.png", "https://www.splashpiscinas.com/assets/img/bonaire/bonaire-dia08.png", "https://www.splashpiscinas.com/assets/img/bonaire/bonaire-dia09.png", "https://www.splashpiscinas.com/assets/img/bonaire/cores-modelos-bonaire.jpg"]'::jsonb,
  true,
  3
),
(
  'Splash Tortuga',
  'A Splash Tortuga combina praticidade e estilo, com área rasa integrada para maior conforto. Disponível com banco e sem banco, com bordas de pastilha de porcelana Atlas.',
  '[{"comprimento": "5,00m", "largura": "2,30m", "profundidade": "1,40m", "label": "sem banco"}, {"comprimento": "7,00m", "largura": "3,30m", "profundidade": "1,40m", "label": "sem banco"}, {"comprimento": "9,00m", "largura": "3,50m", "profundidade": "1,40m", "label": "com banco"}, {"comprimento": "10,00m", "largura": "4,30m", "profundidade": "1,40m", "label": "com banco"}]'::jsonb,
  '["Pastilha de Porcelana Atlas"]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/tortuga/tortuga-azul.png", "https://www.splashpiscinas.com/assets/img/tortuga/tortuga_dia01.jpg", "https://www.splashpiscinas.com/assets/img/tortuga/tortura-dia02.jpg", "https://www.splashpiscinas.com/assets/img/tortuga/tortuga-noite03.jpg", "https://www.splashpiscinas.com/assets/img/tortuga/tortuga-detalhes.jpg", "https://www.splashpiscinas.com/assets/img/tortuga/tortuga-noite01.jpg", "https://www.splashpiscinas.com/assets/img/tortuga/tortura-dia04.jpg", "https://www.splashpiscinas.com/assets/img/tortuga/tortura-dia05.png", "https://www.splashpiscinas.com/assets/img/tortuga/tortuga-noite02.jpg", "https://www.splashpiscinas.com/assets/img/tortuga/tortuga-detalhes02.jpg", "https://www.splashpiscinas.com/assets/img/tortuga/cores-modelos-tortuga.jpg"]'::jsonb,
  true,
  4
),
(
  'Splash Nassau',
  'A Splash Nassau é a escolha perfeita para espaços menores, sem abrir mão do estilo e da qualidade Splash. Com pastilhas de porcelana Atlas nas bordas.',
  '[{"comprimento": "4,00m", "largura": "3,00m", "profundidade": "1,00m", "label": ""}]'::jsonb,
  '["Pastilha de Porcelana Atlas"]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/nassau/nassau-azul-4.png", "https://www.splashpiscinas.com/assets/img/nassau/nassau-dia01.png", "https://www.splashpiscinas.com/assets/img/nassau/nassau-dia02.png", "https://www.splashpiscinas.com/assets/img/nassau/cores-modelos-nassau.jpg"]'::jsonb,
  true,
  5
),
(
  'Splash Atalaia',
  'A Splash Atalaia é o modelo mais completo, com SPA integrado e wet deck para grandes áreas de lazer. Design exclusivo com pastilhas de porcelana Atlas.',
  '[{"comprimento": "7,00m", "largura": "3,30m", "profundidade": "1,40m", "label": ""}, {"comprimento": "9,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}]'::jsonb,
  '["Pastilha de Porcelana Atlas"]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/atalaia/atalaia-azul.png", "https://www.splashpiscinas.com/assets/img/atalaia/atalaia01_dia.png", "https://www.splashpiscinas.com/assets/img/atalaia/atalaia01_noite.png", "https://www.splashpiscinas.com/assets/img/atalaia/atalaia03_dia.png", "https://www.splashpiscinas.com/assets/img/atalaia/atalaia_detalhe.png", "https://www.splashpiscinas.com/assets/img/atalaia/atalaia02_dia.png", "https://www.splashpiscinas.com/assets/img/atalaia/atalaia02_noite.png", "https://www.splashpiscinas.com/assets/img/atalaia/cores-modelos-atalaia.jpg", "https://www.splashpiscinas.com/assets/img/atalaia/modelos-atalaia.jpg"]'::jsonb,
  true,
  6
),
(
  'Splash Farol da Barra',
  'A Splash Farol da Barra tem design arrojado e imponente, ideal para grandes áreas externas. Modelo retangular de dimensões amplas para quem quer o melhor em lazer.',
  '[{"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,20m", "label": ""}, {"comprimento": "5,00m", "largura": "2,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "9,00m", "largura": "4,25m", "profundidade": "1,40m", "label": ""}]'::jsonb,
  '[]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/farol-da-barra/farol-7m-azul.png", "https://www.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-04a.jpg", "https://www.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-05a.jpg", "https://www.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-06a.jpg", "https://www.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-07a.jpg", "https://www.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-08a.jpg", "https://www.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-09a.jpg", "https://www.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-10a.jpg", "https://www.splashpiscinas.com/assets/img/farol-da-barra/cores-modelos-farol.png"]'::jsonb,
  true,
  7
),
(
  'Splash Tropical',
  'A Splash Tropical é o modelo com personalidade forte e área de lazer completa. Design que remete ao verão eterno, com espaço generoso e acabamento premium.',
  '[{"comprimento": "3,50m", "largura": "1,80m", "profundidade": "0,80m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,00m", "label": ""}, {"comprimento": "4,00m", "largura": "2,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "5,00m", "largura": "2,40m", "profundidade": "1,40m", "label": ""}, {"comprimento": "6,00m", "largura": "2,60m", "profundidade": "1,30m", "label": ""}, {"comprimento": "6,00m", "largura": "2,60m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "2,80m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "9,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "10,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}]'::jsonb,
  '[]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/tropical/tropical-7m-branca.png", "https://www.splashpiscinas.com/assets/img/tropical/br_splash_tropical_fn01.jpg", "https://www.splashpiscinas.com/assets/img/tropical/tropical17a.jpg", "https://www.splashpiscinas.com/assets/img/tropical/tropical02a.jpg", "https://www.splashpiscinas.com/assets/img/tropical/tropical05a.jpg", "https://www.splashpiscinas.com/assets/img/tropical/tropical06a.jpg", "https://www.splashpiscinas.com/assets/img/tropical/tropical08a.jpg", "https://www.splashpiscinas.com/assets/img/tropical/tropical09a.jpg", "https://www.splashpiscinas.com/assets/img/tropical/tropical13a.jpg", "https://www.splashpiscinas.com/assets/img/tropical/tropical14a.jpg", "https://www.splashpiscinas.com/assets/img/tropical/tropical15a.jpg", "https://www.splashpiscinas.com/assets/img/tropical/cores-modelos-tropical.png"]'::jsonb,
  true,
  8
),
(
  'Splash Italiana',
  'A Splash Italiana é o modelo mais vendido do Brasil, com design sofisticado de cantos arredondados. Elegância e funcionalidade em perfeita harmonia para seu espaço externo.',
  '[{"comprimento": "2,50m", "largura": "1,50m", "profundidade": "0,30m", "label": "sem banco*"}, {"comprimento": "3,00m", "largura": "2,00m", "profundidade": "0,60m", "label": "sem banco"}, {"comprimento": "3,20m", "largura": "2,00m", "profundidade": "1,30m", "label": "sem banco"}, {"comprimento": "3,50m", "largura": "2,00m", "profundidade": "0,80m", "label": "sem banco"}, {"comprimento": "4,00m", "largura": "2,40m", "profundidade": "1,30m", "label": ""}, {"comprimento": "5,00m", "largura": "2,80m", "profundidade": "1,30m", "label": ""}, {"comprimento": "6,00m", "largura": "3,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "7,00m", "largura": "3,50m", "profundidade": "1,40m", "label": ""}, {"comprimento": "8,00m", "largura": "4,00m", "profundidade": "1,40m", "label": ""}, {"comprimento": "2,50m", "largura": "1,50m", "profundidade": "0,30m", "label": "sem banco não acompanha equipamento de filtragem. Os preços acima são completos: Piscina, Filtro, Kit Aspiração Total, Parte Hidráulica Completa, Mão de Obra de Instalação e Frete. Obs: Frete e Mão de Obra podem variar conforme condições locais. Os preços acima podem sofrer alterações sem aviso prévio. Equipamentos que acompanham a sua Splash Motobomba de 1/2 CV auto escorvante Volume de filtragem de"}]'::jsonb,
  '[]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/italiana/italiana-8m-branca.png", "https://www.splashpiscinas.com/assets/img/italiana/br_splash_italiana_fn01.jpg", "https://www.splashpiscinas.com/assets/img/italiana/br_splash_italiana_fn02.jpg", "https://www.splashpiscinas.com/assets/img/italiana/italiana15a.jpg", "https://www.splashpiscinas.com/assets/img/italiana/italiana08a.jpg", "https://www.splashpiscinas.com/assets/img/italiana/italiana11a.jpg", "https://www.splashpiscinas.com/assets/img/italiana/italiana07a.jpg", "https://www.splashpiscinas.com/assets/img/italiana/italiana02a.jpg", "https://www.splashpiscinas.com/assets/img/italiana/cores-modelos-italianas.png"]'::jsonb,
  true,
  9
),
(
  'Splash Navagio',
  'A Splash Navagio é a combinação perfeita de sofisticação e diversão, ideal para reunir família e amigos. Com banco submerso, painel de acrílico opcional e pastilhas de porcelana Atlas.',
  '[{"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Direito"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Direito – Acrílico RETO"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Direito – Acrílico L"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Esquerdo"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Esquerdo – Acrílico RETO"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "0,86m", "label": "Banco Esquerdo – Acrílico L"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "1,40m", "label": "Banco Direito"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "1,40m", "label": "Banco Direito – Acrílico RETO"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "1,40m", "label": "Banco Esquerdo"}, {"comprimento": "3,25m", "largura": "2,25m", "profundidade": "1,40m", "label": "Banco Esquerdo – Acrílico RETO"}]'::jsonb,
  '["Pastilha de Porcelana Atlas", "Acrílico"]'::jsonb,
  '["https://www.splashpiscinas.com/assets/img/navagio/galeria/splash-navagio-azul.webp", "https://www.splashpiscinas.com/assets/img/navagio/galeria/navagio-splash-piscina-1.webp", "https://www.splashpiscinas.com/assets/img/navagio/galeria/navagio-splash-piscina-2.webp", "https://www.splashpiscinas.com/assets/img/navagio/galeria/navagio-splash-piscina-3.webp", "https://www.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-1.webp", "https://www.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-2.webp", "https://www.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-3.webp", "https://www.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-4.webp", "https://www.splashpiscinas.com/assets/img/navagio/galeria/navagio-features-5.webp"]'::jsonb,
  true,
  10
);
