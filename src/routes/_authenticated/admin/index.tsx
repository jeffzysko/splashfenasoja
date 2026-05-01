import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, memo } from "react";
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
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { TEMP_BADGE, STATUS_BADGE, type Temperatura, type LeadStatus } from "@/lib/leads";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { subscribeLeads } from "@/lib/leadsRealtime";

type Status = LeadStatus;

type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  temperatura: Temperatura;
  status: Status;
  created_at: string;
  score: number;
};

type Stats = {
  total: number;
  quentes: number;
  hoje: number;
  novo: number;
  contatado: number;
  qualificado: number;
  vendido: number;
  perdido: number;
  descartado: number;
};

const ZERO_STATS: Stats = {
  total: 0,
  quentes: 0,
  hoje: 0,
  novo: 0,
  contatado: 0,
  qualificado: 0,
  vendido: 0,
  perdido: 0,
  descartado: 0,
};

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<Stats>(ZERO_STATS);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Uma única RPC traz todas as 9 contagens de uma vez.
  const refreshGlobalStats = async () => {
    const { data, error } = await supabase.rpc("leads_dashboard_stats");
    if (!error && data) {
      setGlobalStats({ ...ZERO_STATS, ...(data as Stats) });
    }
  };

  // Debounce: rajadas de eventos realtime resultam em 1 RPC, não N.
  const scheduleRefresh = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refreshGlobalStats, 400);
  };

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, whatsapp, temperatura, status, created_at, score")
        .order("created_at", { ascending: false })
        .limit(10); // dashboard só mostra 10 — não precisa de 100

      if (!error && data) setLeads(data as Lead[]);
      setLoading(false);
    };

    fetchLeads();
    refreshGlobalStats();

    const unsub = subscribeLeads((event, payload) => {
      if (event === "INSERT") {
        const newLead = payload.new as Lead;
        setLeads((current) => (current ? [newLead, ...current].slice(0, 10) : [newLead]));
      } else if (event === "UPDATE") {
        const updated = payload.new as Lead;
        setLeads((current) =>
          current ? current.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)) : current
        );
      } else if (event === "DELETE") {
        const oldLead = payload.old as Lead;
        setLeads((current) => (current ? current.filter((l) => l.id !== oldLead.id) : current));
      }
      scheduleRefresh();
    });

    return () => {
      unsub();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  const stats = useMemo(() => {
    const { total, quentes, hoje, vendido } = globalStats;
    const convRate = total > 0 ? Math.round((vendido / total) * 100) : 0;
    return { total, quentes, hoje, convRate };
  }, [globalStats]);

  const statusList = useMemo<{ key: LeadStatus; count: number }[]>(
    () => [
      { key: "novo", count: globalStats.novo },
      { key: "contatado", count: globalStats.contatado },
      { key: "qualificado", count: globalStats.qualificado },
      { key: "vendido", count: globalStats.vendido },
      { key: "perdido", count: globalStats.perdido },
      { key: "descartado", count: globalStats.descartado },
    ],
    [globalStats]
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const recentLeads = leads || [];

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

      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Por status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {statusList.map(({ key, count }) => {
            const badge = STATUS_BADGE[key];
            return (
              <div
                key={key}
                className={`rounded-2xl border p-3 flex items-center justify-between ${badge.className}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`} />
                  <span className="text-xs font-extrabold uppercase tracking-wider">
                    {badge.label}
                  </span>
                </div>
                <span className="text-lg font-black tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Leads Recentes
            {recentLeads.length > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold tabular-nums border border-primary/20"
                aria-label={`${recentLeads.length} leads recentes`}
              >
                {recentLeads.length}
              </span>
            )}
          </h3>
          <Button variant="ghost" size="sm" asChild className="text-accent text-xs font-bold">
            <Link to="/admin/leads">
              Ver todos <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-3">
          {recentLeads.map((l) => (
            <RecentLeadRow key={l.id} lead={l} />
          ))}
          {recentLeads.length === 0 && (
            <div className="text-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
              <p className="text-sm text-muted-foreground">Nenhum lead ainda. Aguardando...</p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-2xl shadow-lg">
          <Link to="/admin/leads">Gerenciar todos os leads</Link>
        </Button>
      </div>
    </div>
  );
}

const RecentLeadRow = memo(function RecentLeadRow({ lead: l }: { lead: Lead }) {
  // memoiza string relativa para não recalcular a cada render do pai
  const relative = useMemo(
    () => formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR }),
    [l.created_at]
  );
  return (
    <Link
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
          <div className="text-xs text-muted-foreground">{relative}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`hidden sm:inline-flex text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${STATUS_BADGE[l.status].className}`}>
          {STATUS_BADGE[l.status].label}
        </span>
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
  );
});

const StatCard = memo(function StatCard({ title, value, icon, variant = "default" }: { title: string; value: string | number; icon: React.ReactNode; variant?: "default" | "hot" }) {
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
});
