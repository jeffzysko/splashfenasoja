import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const isMaster = !!data?.some((r) => r.role === "master");
    if (!isMaster) throw redirect({ to: "/admin" });
  },
  component: () => <Outlet />,
});
