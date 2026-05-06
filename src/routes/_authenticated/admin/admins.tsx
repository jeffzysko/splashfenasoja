import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const isMaster = !!data?.some((r) => r.role === "master");
    if (!isMaster) {
      throw redirect({ to: "/admin" });
    }
  },
  component: AdminsPage,
  head: () => ({
    meta: [{ title: "Administradores — Splash" }],
  }),
});

type AdminRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  source: string;
};

function AdminsPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Usamos o log de auditoria — único registro com nome+email exposto a master.
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("user_id, email, full_name, role, created_at, source")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Deduplicar por user_id+role mantendo o registro mais recente.
      const seen = new Set<string>();
      const unique: AdminRow[] = [];
      for (const r of (data || []) as AdminRow[]) {
        const key = `${r.user_id}|${r.role}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(r);
      }
      setRows(unique);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0 -ml-2" asChild>
          <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h2 className="text-xl font-extrabold text-secondary tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Administradores
          </h2>
          <p className="text-sm text-muted-foreground">
            Lista visível apenas para usuários master.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : error ? (
          <div className="p-6 text-destructive text-sm font-semibold">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            Nenhum administrador encontrado.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={`${r.user_id}-${r.role}`} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-secondary truncate">
                    {r.full_name || "(sem nome)"}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {r.email || "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider">
                    Criado em {new Date(r.created_at).toLocaleDateString("pt-BR")} ·{" "}
                    {r.source === "migration_legacy" ? "registro retroativo" : r.source}
                  </div>
                </div>
                <span
                  className={
                    "text-[11px] font-extrabold px-2.5 py-1 rounded-full border " +
                    (r.role === "master"
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-secondary/15 text-secondary border-secondary/30")
                  }
                >
                  {r.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
