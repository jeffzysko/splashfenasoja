// Service Worker desativado — ele estava interferindo com a hidratação
// SSR do TanStack Start ao servir HTML em cache sem os scripts atualizados.
// Este SW se auto-desinstala em qualquer navegador que o tenha registrado.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Limpa todos os caches antigos
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      // Auto-desregistra
      await self.registration.unregister();
      // Recarrega clientes para sair do controle do SW
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
