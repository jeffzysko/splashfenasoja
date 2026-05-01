import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Flame,
  Calendar,
  TrendingUp,
  ArrowRight,
  Loader2,
  Clock,
  Phone,
} from "lucide-react";
import { TEMP_BADGE, type Temperatura } from "@/lib/leads";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Status = "novo" | "contatado" | "qualificado" | "descartado";

type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  temperatura: Temperatura;
  status: Status;
  created_at: string;
  score: number;
};

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({ total: 0, quentes: 0, hoje: 0, qualificados: 0 });

  // Recalcula contagens globais via count exato (não limitado aos 100 últimos)
  const refreshGlobalStats = async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayIso = startOfToday.toISOString();

    const [totalR, quentesR, hojeR, qualifR] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("temperatura", "quente"),
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "qualificado"),
    ]);

    setGlobalStats({
      total: totalR.count || 0,
      quentes: quentesR.count || 0,
      hoje: hojeR.count || 0,
      qualificados: qualifR.count || 0,
    });
  };

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, whatsapp, temperatura, status, created_at, score")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setLeads(data as Lead[]);
      }
      setLoading(false);
    };

    fetchLeads();
    refreshGlobalStats();

    // Realtime subscription
    const channel = supabase
      .channel("dashboard-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads((current) => (current ? [newLead, ...current].slice(0, 100) : [newLead]));
          refreshGlobalStats();

          if (newLead.temperatura === "quente") {
            try {
              const audio = new Audio("https://cdn.gpteng.co/ding.mp3");
              if (localStorage.getItem("notifSound") === "on") {
                audio.play().catch(() => {});
              }
            } catch (e) {}
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        () => refreshGlobalStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const { total, quentes, hoje, qualificados } = globalStats;
    const convRate = total > 0 ? Math.round((qualificados / total) * 100) : 0;
    return { total, quentes, hoje, convRate };
  }, [globalStats]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const recentLeads = leads?.slice(0, 10) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-secondary tracking-tight">Dashboard</h2>
        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
          Ao vivo
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value={stats.total} icon={<Users className="w-4 h-4" />} />
        <StatCard title="Quentes" value={stats.quentes} icon={<Flame className="w-4 h-4" />} variant="hot" />
        <StatCard title="Hoje" value={stats.hoje} icon={<Calendar className="w-4 h-4" />} />
        <StatCard title="Conversão" value={`${stats.convRate}%`} icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Últimos Chegados
          </h3>
          <Button variant="ghost" size="sm" asChild className="text-accent text-xs font-bold">
            <Link to="/admin/leads">
              Ver todos <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-3">
          {recentLeads.map((l) => (
            <Link
              key={l.id}
              to="/admin/leads/$id"
              params={{ id: l.id }}
              className="text-left bg-card border border-border rounded-2xl p-4 flex items-center justify-between hover:border-primary/40 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    TEMP_BADGE[l.temperatura].className.split(" ")[0]
                  }`}
                >
                  {l.nome.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-secondary">{l.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${TEMP_BADGE[l.temperatura].className}`}>
                  {l.temperatura.toUpperCase()}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`, "_blank", "noreferrer");
                  }}
                  className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 hover:bg-green-500/20 transition-colors cursor-pointer"
                  aria-label="Abrir WhatsApp"
                >
                  <Phone className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
          {recentLeads.length === 0 && (
            <div className="text-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
              <p className="text-sm text-muted-foreground">Nenhum lead ainda. Aguardando...</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="pt-4">
        <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 rounded-2xl shadow-lg">
          <Link to="/admin/leads">Gerenciar todos os leads</Link>
        </Button>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, variant = "default" }: { title: string; value: string | number; icon: React.ReactNode; variant?: "default" | "hot" }) {
  return (
    <Card className={`border-none shadow-sm ${variant === "hot" ? "bg-primary/5 text-primary" : "bg-card"}`}>
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest opacity-60">
          {title}
        </CardTitle>
        <div className="opacity-40">{icon}</div>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <div className="text-2xl font-black tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}