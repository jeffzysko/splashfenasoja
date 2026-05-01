import { createFileRoute, redirect, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LogOut, Volume2, VolumeX, LayoutDashboard, Users, Bell } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Cache em memória (client-side) para evitar refazer getSession + query user_roles
// em toda navegação dentro de /admin/*. Cada checagem custava ~2 round-trips ao
// servidor, deixando a navegação visivelmente lenta.
let authCache: { userId: string; hasAccess: boolean; expiresAt: number } | null = null;
const AUTH_CACHE_TTL_MS = 60_000; // 1 minuto

// Invalida o cache quando a sessão muda (signOut, troca de usuário, refresh expirado)
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
      authCache = null;
    }
  });
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // Só roda no cliente — no SSR não há localStorage e cai em loop pro /login.
    if (typeof window === "undefined") return;

    const now = Date.now();
    if (authCache && authCache.expiresAt > now) {
      if (!authCache.hasAccess) {
        throw redirect({ to: "/login" });
      }
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      authCache = null;
      const currentPath = location.pathname + (location.searchStr || "");
      throw redirect({
        to: "/login",
        search: { redirect: currentPath.includes("/login") ? undefined : currentPath },
      });
    }

    const { data: roles, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (roleErr) console.error("Erro ao verificar papel:", roleErr);

    const hasAccess = !!roles?.some(r => ["master", "admin"].includes(r.role));
    authCache = { userId: session.user.id, hasAccess, expiresAt: now + AUTH_CACHE_TTL_MS };

    if (!hasAccess) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("notifSound") === "on");

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem("notifSound", newVal ? "on" : "off");
    toast.info(newVal ? "Som de notificação ativado 🔔" : "Som desativado");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu.");
    window.location.replace("/login");
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-20 sm:pb-0">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/admin">
              <Logo height={42} />
            </Link>
            <span className="bg-secondary text-secondary-foreground text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
              Admin
            </span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-3">
            <button 
              onClick={toggleSound}
              className="p-2 text-muted-foreground hover:text-primary transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            <div className="h-6 w-[1px] bg-border/60 mx-1 hidden sm:block" />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive transition-colors rounded-full"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 h-16 px-6 flex items-center justify-around shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
        <NavButton to="/admin" icon={<LayoutDashboard className="w-6 h-6" />} label="Dashboard" active={location.pathname === "/admin" || location.pathname === "/admin/"} />
        <NavButton to="/admin/leads" icon={<Users className="w-6 h-6" />} label="Leads" active={location.pathname.startsWith("/admin/leads")} />
        <button className="flex flex-col items-center gap-1 text-muted-foreground opacity-40">
          <Bell className="w-6 h-6" />
          <span className="text-[9px] font-bold uppercase">Alertas</span>
        </button>
      </nav>
    </div>
  );
}

function NavButton({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link to={to} className={cn(
      "flex flex-col items-center gap-1 transition-all",
      active ? "text-primary scale-110" : "text-muted-foreground"
    )}>
      {icon}
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      {active && <div className="w-1 h-1 rounded-full bg-primary mt-0.5 animate-in zoom-in" />}
    </Link>
  );
}
