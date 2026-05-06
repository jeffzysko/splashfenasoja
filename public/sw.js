// ─────────────────────────────────────────────────────────────────────────────
// Splash Admin — Service Worker
// Estratégia: cache-first para assets estáticos, network-first para navegação.
// Não armazena em cache rotas públicas do formulário de lead (/$slug).
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = "splash-admin-v1";

// Assets pré-cacheados no install (app shell essencial)
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

// ── Activate: limpa caches antigos ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar: não-GET, cross-origin, Supabase API, Edge Functions
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/rest/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/functions/") ||
    url.pathname.startsWith("/storage/")
  )
    return;

  const pathname = url.pathname;

  // Rotas do formulário público (/$slug) → passa pela rede sem cache
  const isPublicForm =
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/reset-password") &&
    pathname !== "/" &&
    // assets estáticos de qualquer rota são cacheados (ver abaixo)
    !/\.(js|css|png|svg|jpg|jpeg|webp|woff2?|ico|json|webmanifest|mp3|wav)$/.test(
      pathname
    );

  if (isPublicForm) return; // network-only para formulário público

  // ── Assets estáticos: stale-while-revalidate ─────────────────────────────
  if (
    /\.(js|css|png|svg|jpg|jpeg|webp|woff2?|ico|json|webmanifest|mp3|wav)$/.test(
      pathname
    )
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        // Revalida em background
        const networkFetch = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        // Retorna cache imediatamente se existir; caso contrário aguarda rede
        return cached ?? (await networkFetch) ?? Response.error();
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
          // Fallback offline: tenta retornar a página de login cacheada
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
