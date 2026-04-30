import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const currentPath = location.pathname + location.search;
      const redirectPath = currentPath.includes("/login") ? undefined : currentPath;

      throw redirect({ 
        to: "/login", 
        search: { 
          redirect: redirectPath
        } 
      });
    }

    // Role verification with retry/fallback logic
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    // If profile doesn't exist but user is authenticated, handle it
    if (!profile && !profileError) {
      console.warn("Perfil não encontrado. Tentando criar perfil padrão...");
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert([{ id: session.user.id, role: "admin", full_name: session.user.email?.split("@")[0] || "Usuário" }])
        .select("role")
        .single();
      
      if (!createError) {
        profile = newProfile;
      }
    }

    if (!profile || (profile.role !== "master" && profile.role !== "admin")) {
      console.error("Acesso negado: Usuário sem permissões administrativas.", profileError);
      // Only sign out if we're sure they shouldn't have access
      if (profile && profile.role !== "master" && profile.role !== "admin") {
        await supabase.auth.signOut();
        throw redirect({ to: "/login" });
      }
      // If profile error or missing, don't trap them in a loop if they might be valid
      // But for security, if we can't confirm role, we must redirect
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu.");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3">
            <Logo height={28} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-l border-border pl-3">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[220px]">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-secondary hover:text-secondary"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
