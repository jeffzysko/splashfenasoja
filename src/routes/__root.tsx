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
