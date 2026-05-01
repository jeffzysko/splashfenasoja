// Este arquivo não é usado pelo TanStack Start em modo SSR.
// O ponto de entrada SSR é gerenciado por src/router.tsx + src/routes/__root.tsx.
// Mantido vazio para evitar interferência com hidratação.

// Desregistra qualquer Service Worker antigo (caso exista no navegador do usuário)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}
