import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Splash Lead — FENASOJA 2026" },
      { name: "description", content: "Cadastro rápido de leads — Splash Piscinas no stand da FENASOJA 2026." },
      { property: "og:title", content: "Splash Lead — FENASOJA 2026" },
      { name: "twitter:title", content: "Splash Lead — FENASOJA 2026" },
      { property: "og:description", content: "Cadastro rápido de leads — Splash Piscinas no stand da FENASOJA 2026." },
      { name: "twitter:description", content: "Cadastro rápido de leads — Splash Piscinas no stand da FENASOJA 2026." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8bad8e01-bb60-4acc-885e-91be03aee6d2/id-preview-9ffe5c7d--52e087bf-61f3-45b9-a54e-4e1c01e4ec5c.lovable.app-1777513805331.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8bad8e01-bb60-4acc-885e-91be03aee6d2/id-preview-9ffe5c7d--52e087bf-61f3-45b9-a54e-4e1c01e4ec5c.lovable.app-1777513805331.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: () => (
    <>
      <Outlet />
      <Toaster richColors position="top-center" />
    </>
  ),
});
