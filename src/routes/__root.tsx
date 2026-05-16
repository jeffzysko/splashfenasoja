import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { APP_VERSION } from "@/lib/appVersion";
import appCss from "../styles.css?url";

const v = `?v=${APP_VERSION}`;

// Splash screens iOS — combinações de tamanho/orientação/density.
// O navegador escolhe a que casa com o dispositivo via media query.
const APPLE_SPLASHES: Array<{
  width: number;
  height: number;
  ratio: number;
}> = [
  { width: 640, height: 1136, ratio: 2 },
  { width: 750, height: 1334, ratio: 2 },
  { width: 828, height: 1792, ratio: 2 },
  { width: 1125, height: 2436, ratio: 3 },
  { width: 1170, height: 2532, ratio: 3 },
  { width: 1179, height: 2556, ratio: 3 },
  { width: 1242, height: 2208, ratio: 3 },
  { width: 1242, height: 2688, ratio: 3 },
  { width: 1284, height: 2778, ratio: 3 },
  { width: 1290, height: 2796, ratio: 3 },
  { width: 1536, height: 2048, ratio: 2 },
  { width: 1668, height: 2388, ratio: 2 },
  { width: 2048, height: 2732, ratio: 2 },
];

const splashLinks = APPLE_SPLASHES.flatMap(({ width, height, ratio }) => {
  const cssW = Math.round(width / ratio);
  const cssH = Math.round(height / ratio);
  const href = `/apple-splash-${width}-${height}.png${v}`;
  return [
    {
      rel: "apple-touch-startup-image",
      href,
      media: `(device-width: ${cssW}px) and (device-height: ${cssH}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
    },
  ];
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5",
      },
      { name: "theme-color", content: "#002A4E" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Splash Lead" },
      { name: "application-name", content: "Splash Lead" },
      { name: "app-version", content: APP_VERSION },
      { title: "Splash Lead — Splash Piscinas" },
      {
        name: "description",
        content:
          "Cadastro rápido de leads para eventos e feiras da Splash Piscinas.",
      },
      { property: "og:title", content: "Splash Lead — Splash Piscinas" },
      {
        property: "og:description",
        content:
          "Cadastro rápido de leads para eventos e feiras da Splash Piscinas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: `/favicon-quintalideal.svg${v}` },
      { rel: "icon", type: "image/png", sizes: "32x32", href: `/favicon-32.png${v}` },
      { rel: "icon", type: "image/png", sizes: "192x192", href: `/icon-192.png${v}` },
      { rel: "apple-touch-icon", sizes: "180x180", href: `/apple-touch-icon.png${v}` },
      // Manifest NÃO injetado aqui — é injetado condicionalmente por rota:
      // • login.tsx + _authenticated.tsx → /admin-manifest.webmanifest
      // • $slug.tsx (formulário público) → sem manifest, sem PWA
      ...splashLinks,
      // Supabase Storage — antecipa conexão DNS+TLS para imagens do catálogo
      { rel: "preconnect", href: "https://ezehjzvbztsgqpnhmsvg.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://ezehjzvbztsgqpnhmsvg.supabase.co" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument() {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <UpdatePrompt />
        <Toaster richColors position="top-center" />
        <Scripts />
        {/* Safety net: Chrome 88 pode deixar elementos com animate-in presos em opacity:0.
            Após 1.5s da carga, força visibilidade em qualquer elemento ainda invisível. */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  function fixStuckAnimations(){
    var els = document.querySelectorAll('.animate-in');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      var s=window.getComputedStyle(el);
      if(parseFloat(s.opacity)<0.05){
        el.style.cssText+=";opacity:1!important;transform:none!important;animation:none!important";
      }
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(fixStuckAnimations,1500);});
  } else {
    setTimeout(fixStuckAnimations,1500);
  }
})();
` }} />
      </body>
    </html>
  );
}
