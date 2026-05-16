// ─────────────────────────────────────────────────────────────────────────────
// Splash Admin — Service Worker
// Estratégia: network-first para JS/CSS (garante assets frescos após deploy),
//             cache-first para imagens/fontes, network-first para navegação.
// Não armazena em cache rotas públicas do formulário de lead (/$slug).
// ─────────────────────────────────────────────────────────────────────────────

// IMPORTANTE: incrementar CACHE_VERSION a cada deploy para invalidar caches antigos.
// O timestamp de build é injetado pelo servidor mas como fallback usamos uma string fixa
// que deve ser alterada manualmente quando necessário.
const CACHE_VERSION = "splash-v4-" + (self.__BUILD_TS__ || "20260516");
const CACHE_NAME = CACHE_VERSION;

// Assets pré-cacheados no install (app shell essencial — apenas imagens estáticas)
const PRECACHE_ASSETS = [
  "/admin-manifest.webmanifest",
  "/logo_splash.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32.png",
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => {
        /* falha silenciosa — assets opcionais */
      })
  );
});

// ── Activate: limpa TODOS os caches antigos ───────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME) // remove tudo que não é a versão atual
            .map((k) => {
              console.log("[SW] Removendo cache antigo:", k);
              return caches.delete(k);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== "GET") return;

  // Cross-origin: apenas Supabase Storage recebe cache; tudo mais passa direto
  if (url.origin !== self.location.origin) {
    const isSupabaseStorage =
      url.hostname === "ezehjzvbztsgqpnhmsvg.supabase.co" &&
      url.pathname.startsWith("/storage/v1/object/public/");
    if (!isSupabaseStorage) return;

    // Cache-first para imagens do catálogo no Supabase Storage
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request).catch(() => null);
        if (res?.ok) cache.put(request, res.clone());
        return res ?? Response.error();
      })
    );
    return;
  }

  // Same-origin: ignorar Supabase API, Auth e Edge Functions
  if (
    url.pathname.startsWith("/rest/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/functions/") ||
    url.pathname.startsWith("/storage/")
  )
    return;

  const pathname = url.pathname;

  // Rotas do formulário público (/$slug) → passa pela rede sem cache
  const isStaticAsset = /\.(js|css|png|svg|jpg|jpeg|webp|woff2?|ico|webmanifest|mp3|wav)$/.test(pathname);
  const isPublicForm =
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/reset-password") &&
    pathname !== "/" &&
    !isStaticAsset;

  if (isPublicForm) return; // network-only para formulário público

  // ── JS e CSS: NETWORK-FIRST (garante assets frescos após deploy) ──────────
  // Se a rede falhar, usa cache. Isso evita servir JS/CSS desatualizados.
  if (/\.(js|css)$/.test(pathname) || url.search.includes("?v=")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? Response.error();
        })
    );
    return;
  }

  // ── Imagens e fontes: cache-first (raramente mudam) ───────────────────────
  if (/\.(png|svg|jpg|jpeg|webp|woff2?|ico|webmanifest|mp3|wav)$/.test(pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request).catch(() => null);
        if (res?.ok) cache.put(request, res.clone());
        return res ?? Response.error();
      })
    );
    return;
  }

  // ── Navegação (HTML): network-first com fallback para cache ───────────────
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, res.clone()));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return (await caches.match("/login")) ?? Response.error();
        })
    );
    return;
  }
});

// ── Mensagem para forçar update ───────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
