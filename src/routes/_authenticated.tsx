import { createFileRoute, redirect, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LogOut, LayoutDashboard, Users, Shield, SlidersHorizontal, CalendarDays, UserCog, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AdminPWAInstall } from "@/components/pwa/AdminPWAInstall";

type AuthCache = { userId: string; hasAccess: boolean; expiresAt: number };
const CACHE_KEY = "admin_auth_cache_v1";
const FRESH_TTL_MS = 5 * 60_000;
const STALE_TTL_MS = 30 * 60_000;
const ROLE_QUERY_TIMEOUT_MS = 3_000;

let authCache: AuthCache | null = null;
let revalidating = false;

function loadCache(): AuthCache | null {
  if (authCache) return authCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    authCache = JSON.parse(raw) as AuthCache;
    return authCache;
  } catch { return null; }
}

function saveCache(c: AuthCache | null) {
  authCache = c;
  if (typeof window === "undefined") return;
  try {
    if (c) sessionStorage.setItem(CACHE_KEY, JSON.stringify(c));
    else sessionStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") saveCache(null);
  });
}

async function fetchRoleWithTimeout(userId: string): Promise<{ hasAccess: boolean } | null> {
  try {
    const result = await Promise.race([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ROLE_QUERY_TIMEOUT_MS)),
    ]);
    if (!result) return null;
    const { data, error } = result as { data: Array<{ role: string }> | null; error: unknown };
    if (error) return null;
    return { hasAccess: !!data?.some(r => ["master", "admin", "user"].includes(r.role)) };
  } catch { return null; }
}

function revalidateInBackground(userId: string) {
  if (revalidating) return;
  revalidating = true;
  fetchRoleWithTimeout(userId).then((res) => {
    if (res) saveCache({ userId, hasAccess: res.hasAccess, expiresAt: Date.now() + FRESH_TTL_MS });
  }).finally(() => { revalidating = false; });
}

export const Route = createFileRoute("/_authenticated")({
  // Manifest do admin injetado em todas as rotas autenticadas
  head: () => ({
    meta: [
      { name: "apple-mobile-web-app-title", content: "Splash Admin" },
      { name: "application-name", content: "Splash Admin" },
    ],
    links: [
      { rel: "manifest", href: "/admin-manifest.webmanifest" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      saveCache(null);
      const currentPath = location.pathname + (location.searchStr || "");
      throw redirect({ to: "/login", search: { redirect: currentPath.includes("/login") ? undefined : currentPath } });
    }

    const cached = loadCache();
    if (cached && cached.userId === session.user.id && cached.expiresAt > now) {
      if (!cached.hasAccess) throw redirect({ to: "/login" });
      return;
    }
    if (cached && cached.userId === session.user.id && cached.expiresAt + STALE_TTL_MS > now && cached.hasAccess) {
      revalidateInBackground(cached.userId);
      return;
    }

    const res = await fetchRoleWithTimeout(session.user.id);
    if (!res) {
      if (cached?.userId === session.user.id && cached.hasAccess) { revalidateInBackground(session.user.id); return; }
      revalidateInBackground(session.user.id);
      saveCache({ userId: session.user.id, hasAccess: true, expiresAt: now + 30_000 });
      return;
    }

    saveCache({ userId: session.user.id, hasAccess: res.hasAccess, expiresAt: now + FRESH_TTL_MS });
    if (!res.hasAccess) throw redirect({ to: "/login" });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMaster, setIsMaster] = useState(false);

  // Registra o Service Worker do admin (assets estáticos + offline fallback).
  // Feito aqui para garantir que o SW só ative em rotas autenticadas.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => { /* registro opcional — falha silenciosa */ });
  }, []);

  useEffect(() => {
    if (!user?.id) { setIsMaster(false); return; }
    let cancelled = false;
    const key = `is_master_${user.id}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached === "1") setIsMaster(true);
      else if (cached === "0") setIsMaster(false);
    } catch { /* ignore */ }

    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      if (cancelled) return;
      const isM = !!data?.some((r) => r.role === "master");
      setIsMaster(isM);
      try { sessionStorage.setItem(key, isM ? "1" : "0"); } catch { /* ignore */ }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu.");
    window.location.replace("/login");
  };

  return (
    <div className="min-h-dvh bg-muted/20 pb-nav-safe sm:pb-0">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/50 pt-safe">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/admin" className="flex items-center gap-1.5 min-w-0 shrink">
            <Logo height={36} />
            <span className="bg-secondary text-secondary-foreground text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter shrink-0">
              Admin
            </span>
          </Link>

          <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
            <NotificationBell />
            <NotificationSettings />
            <Link
              to="/admin/settings/notifications"
              className="p-2 text-muted-foreground hover:text-primary transition-colors hidden sm:inline-flex"
              aria-label="Configurações de notificação"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </Link>
            {isMaster && (
              <>
                <Link
                  to="/admin/feiras"
                  className="p-2 text-muted-foreground hover:text-primary transition-colors hidden sm:inline-flex"
                  aria-label="Feiras"
                  title="Feiras"
                >
                  <CalendarDays className="w-5 h-5" />
                </Link>
                <Link
                  to="/admin/usuarios"
                  className="p-2 text-muted-foreground hover:text-primary transition-colors hidden sm:inline-flex"
                  aria-label="Usuários"
                  title="Usuários"
                >
                  <UserCog className="w-5 h-5" />
                </Link>
              </>
            )}
            <div className="h-6 w-[1px] bg-border/60 mx-0.5 hidden sm:block" />
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive transition-colors rounded-full h-10 w-10"
              aria-label="Sair"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 sm:py-6">
        <Outlet />
      </main>

      {/* Banner de instalação do PWA admin */}
      <AdminPWAInstall />

      {/* Bottom nav mobile */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-stretch justify-around shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]"
        aria-label="Navegação principal"
      >
        <NavButton to="/admin" icon={<LayoutDashboard className="w-6 h-6" />} label="Dashboard" active={location.pathname === "/admin" || location.pathname === "/admin/"} />
        <NavButton to="/admin/leads" icon={<Users className="w-6 h-6" />} label="Leads" active={location.pathname.startsWith("/admin/leads")} />
        {isMaster && (
          <NavButton to="/admin/feiras" icon={<CalendarDays className="w-6 h-6" />} label="Feiras" active={location.pathname.startsWith("/admin/feiras")} />
        )}
        {isMaster && (
          <NavButton to="/admin/usuarios" icon={<UserCog className="w-6 h-6" />} label="Usuários" active={location.pathname.startsWith("/admin/usuarios")} />
        )}
      </nav>
    </div>
  );
}

function NavButton({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all min-h-[52px]",
        active ? "text-primary" : "text-muted-foreground active:bg-muted/60"
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className={cn("transition-transform", active && "scale-110")}>{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      {active && <div className="w-1 h-1 rounded-full bg-primary -mt-0.5" />}
    </Link>
  );
}
