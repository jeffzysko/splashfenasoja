-- Remove imagens de diagrama (cores-modelos-*, modelos-*) dos arrays de fotos
-- Execute no SQL Editor do Supabase

UPDATE produtos SET fotos = $f1$[
  "https://cdn.splashpiscinas.com/assets/img/splash-tradicional-8m-SPA-e-pastilha-porcelana-azul.png",
  "https://cdn.splashpiscinas.com/assets/img/tradicional/splash-tradicional-semipastilhada-6m.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tradicional/detalhe-splash-tradicional-semipastilhada-6m.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tradicional/tradicional-modelo-8m.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tradicional/tradicional-modelo-6m.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tradicional/br_splash_tradicional_fn01.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tradicional/br_splash_tradicional-prainha_fn02.jpg"
]$f1$::jsonb WHERE nome = 'Splash Tradicional';

UPDATE produtos SET fotos = $f2$[
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-azul.png",
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia01.jpg",
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia02.jpg",
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-noite01.jpg",
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia04.jpg",
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia05.jpg",
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-detalhe.jpg",
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia06.jpg",
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-noite02.jpg",
  "https://cdn.splashpiscinas.com/assets/img/cancun/cancun-dia08.jpg"
]$f2$::jsonb WHERE nome = 'Splash Cancun';

UPDATE produtos SET fotos = $f3$[
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-branca.png",
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia01.png",
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia02.png",
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia03.png",
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia04.png",
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia05.png",
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia06.png",
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia07.png",
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia08.png",
  "https://cdn.splashpiscinas.com/assets/img/bonaire/bonaire-dia09.png"
]$f3$::jsonb WHERE nome = 'Splash Bonaire';

UPDATE produtos SET fotos = $f4$[
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-azul.png",
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga_dia01.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortura-dia02.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-noite03.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-detalhes.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-noite01.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortura-dia04.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortura-dia05.png",
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-noite02.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tortuga/tortuga-detalhes02.jpg"
]$f4$::jsonb WHERE nome = 'Splash Tortuga';

UPDATE produtos SET fotos = $f5$[
  "https://cdn.splashpiscinas.com/assets/img/nassau/nassau-azul-4.png",
  "https://cdn.splashpiscinas.com/assets/img/nassau/nassau-dia01.png",
  "https://cdn.splashpiscinas.com/assets/img/nassau/nassau-dia02.png"
]$f5$::jsonb WHERE nome = 'Splash Nassau';

UPDATE produtos SET fotos = $f6$[
  "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia-azul.png",
  "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia01_dia.png",
  "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia01_noite.png",
  "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia03_dia.png",
  "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia_detalhe.png",
  "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia02_dia.png",
  "https://cdn.splashpiscinas.com/assets/img/atalaia/atalaia02_noite.png"
]$f6$::jsonb WHERE nome = 'Splash Atalaia';

UPDATE produtos SET fotos = $f7$[
  "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/farol-7m-azul.png",
  "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-04a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-05a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-06a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-07a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-08a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-09a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/farol-da-barra/br_splash-farol-da-barra-10a.jpg"
]$f7$::jsonb WHERE nome = 'Splash Farol da Barra';

UPDATE produtos SET fotos = $f8$[
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical-7m-branca.png",
  "https://cdn.splashpiscinas.com/assets/img/tropical/br_splash_tropical_fn01.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical17a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical02a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical05a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical06a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical08a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical09a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical13a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical14a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/tropical/tropical15a.jpg"
]$f8$::jsonb WHERE nome = 'Splash Tropical';

UPDATE produtos SET fotos = $f9$[
  "https://cdn.splashpiscinas.com/assets/img/italiana/italiana-8m-branca.png",
  "https://cdn.splashpiscinas.com/assets/img/italiana/br_splash_italiana_fn01.jpg",
  "https://cdn.splashpiscinas.com/assets/img/italiana/br_splash_italiana_fn02.jpg",
  "https://cdn.splashpiscinas.com/assets/img/italiana/italiana15a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/italiana/italiana08a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/italiana/italiana11a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/italiana/italiana07a.jpg",
  "https://cdn.splashpiscinas.com/assets/img/italiana/italiana02a.jpg"
]$f9$::jsonb WHERE nome = 'Splash Italiana';

-- Navagio: mantém apenas fotos de galeria real (remove navagio-features-* que são diagramas)
UPDATE produtos SET fotos = $f10$[
  "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/splash-navagio-azul.webp",
  "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-splash-piscina-1.webp",
  "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-splash-piscina-2.webp",
  "https://cdn.splashpiscinas.com/assets/img/navagio/galeria/navagio-splash-piscina-3.webp"
]$f10$::jsonb WHERE nome = 'Splash Navagio';
