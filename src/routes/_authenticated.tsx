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
      const currentPath = location.pathname + location.searchStr;
      const redirectPath = currentPath.includes("/login") ? undefined : currentPath;

      throw redirect({ 
        to: "/login", 
        search: { 
          redirect: redirectPath
        } 
      });
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["master", "admin"]);

    if (rolesError) {
      console.error("Erro ao buscar permissões:", rolesError);
      throw redirect({ to: "/login" });
    }

    if (!roles?.length) {
      console.error("Acesso negado: Usuário sem permissões administrativas.");
      await supabase.auth.signOut();
      throw redirect({ to: "/login" });
    }

    // Redirect to /admin if the user is at the root authenticated path
    if (location.pathname === "/") {
      throw redirect({ to: "/admin" });
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
