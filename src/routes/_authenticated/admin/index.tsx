import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users, Flame, Calendar, TrendingUp, ArrowRight, Loader2,
  Clock, CalendarDays, ChevronDown, ChevronUp,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { TEMP_BADGE, STATUS_BADGE, type Temperatura, type LeadStatus } from "@/lib/leads";
import { formatDistanceToNow, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { subscribeLeads } from "@/lib/leadsRealtime";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type Status = LeadStatus;
type Lead = { id: string; nome: string; whatsapp: string; temperatura: Temperatura; status: Status; created_at: string; score: number; feira_id: string | null };
type Feira = { id: string; nome: string; slug: string; ativo: boolean };
type Stats = {
  total: number; quentes: number; mornos: number; frios: number;
  hoje: number; novo: number; contatado: number; qualificado: number;
  vendido: number; perdido: number; descartado: number;
};
const ZERO_STATS: Stats = { total: 0, quentes: 0, mornos: 0, frios: 0, hoje: 0, novo: 0, contatado: 0, qualificado: 0, vendido: 0, perdido: 0, descartado: 0 };

const TEMP_PIE_COLORS = ["#ef4444", "#f97316", "#3b82f6"];

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

// ── Tooltip customizado para o AreaChart ──────────────────────────────────────
function CustomAreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-bold text-secondary mb-0.5">{label}</p>
      <p className="text-primary font-extrabold">{payload[0].value} lead{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ── Tooltip customizado para o PieChart ──────────────────────────────────────
function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-bold text-secondary">{payload[0].name}: <span className="text-primary font-extrabold">{payload[0].value}</span></p>
    </div>
  );
}

function DashboardPage() {
  const { user } = useSupabaseAuth();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<Stats>(ZERO_STATS);
  const [isMaster, setIsMaster] = useState(false);
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [selectedFeira, setSelectedFeira] = useState<string>("all");
  const [timeline, setTimeline] = useState<{ dia: string; leads: number }[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      const isM = !!data?.some((r) => r.role === "master");
      setIsMaster(isM);
      if (isM) {
        supabase.from("feiras").select("id, nome, slug, ativo").order("created_at", { ascending: false }).then(({ data: f }) => {
          if (f) setFeiras(f as Feira[]);
        });
      } else {
        supabase.from("feira_users").select("feira_id, feiras(id, nome, slug, ativo)").eq("user_id", user.id).then(({ data: fu }) => {
          const fs = (fu || []).map((r: any) => r.feiras).filter(Boolean) as Feira[];
          setFeiras(fs);
          const ativa = fs.find((f) => f.ativo);
          if (ativa) setSelectedFeira(ativa.id);
        });
      }
    });
  }, [user?.id]);

  const loadTimeline = useCallback(async (feiraId?: string) => {
    setLoadingCharts(true);
    const from = subDays(new Date(), 29).toISOString();
    let q = supabase.from("leads").select("created_at").gte("created_at", from).order("created_at", { ascending: true });
    if (feiraId && feiraId !== "all") q = q.eq("feira_id", feiraId);
    const { data } = await q;
    const counts: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) counts[format(subDays(new Date(), i), "dd/MM")] = 0;
    (data || []).forEach((r) => { const d = format(new Date(r.created_at), "dd/MM"); if (d in counts) counts[d]++; });
    setTimeline(Object.entries(counts).map(([dia, leads]) => ({ dia, leads })));
    setLoadingCharts(false);
  }, []);

  const refreshGlobalStats = useCallback(async (feiraId?: string) => {
    const params = feiraId && feiraId !== "all" ? { p_feira_id: feiraId } : {};
    const { data, error } = await supabase.rpc("leads_dashboard_stats", params);
    if (!error && data) setGlobalStats({ ...ZERO_STATS, ...(data as Stats) });
  }, []);

  const scheduleRefresh = useCallback((feiraId?: string) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => refreshGlobalStats(feiraId), 400);
  }, [refreshGlobalStats]);

  useEffect(() => {
    const fetchLeads = async () => {
      let q = supabase.from("leads")
        .select("id, nome, whatsapp, temperatura, status, created_at, score, feira_id")
        .order("created_at", { ascending: false }).limit(10);
      if (isMaster && selectedFeira !== "all") q = q.eq("feira_id", selectedFeira);
      const { data, error } = await q;
      if (!error && data) setLeads(data as Lead[]);
      setLoading(false);
    };
    fetchLeads();
    refreshGlobalStats(selectedFeira);
    if (showCharts) loadTimeline(selectedFeira);

    const unsub = subscribeLeads((event, payload) => {
      if (event === "INSERT") {
        const newLead = payload.new as Lead;
        if (isMaster && selectedFeira !== "all" && newLead.feira_id !== selectedFeira) return;
        setLeads((cur) => cur ? [newLead, ...cur].slice(0, 10) : [newLead]);
      } else if (event === "UPDATE") {
        const updated = payload.new as Lead;
        setLeads((cur) => cur ? cur.map((l) => l.id === updated.id ? { ...l, ...updated } : l) : cur);
      } else if (event === "DELETE") {
        const oldLead = payload.old as Lead;
        setLeads((cur) => cur ? cur.filter((l) => l.id !== oldLead.id) : cur);
      }
      scheduleRefresh(selectedFeira);
    });
    return () => { unsub(); if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [isMaster, selectedFeira, showCharts, refreshGlobalStats, loadTimeline, scheduleRefresh]);

  // Carrega timeline quando expande gráficos pela primeira vez
  const handleToggleCharts = useCallback(() => {
    setShowCharts((v) => {
      const next = !v;
      if (next) loadTimeline(selectedFeira);
      return next;
    });
  }, [loadTimeline, selectedFeira]);

  const stats = useMemo(() => {
    const { total, quentes, hoje, vendido } = globalStats;
    return { total, quentes, hoje, convRate: total > 0 ? Math.round((vendido / total) * 100) : 0 };
  }, [globalStats]);

  const statusList = useMemo<{ key: LeadStatus; count: number }[]>(() => [
    { key: "novo",        count: globalStats.novo },
    { key: "contatado",   count: globalStats.contatado },
    { key: "qualificado", count: globalStats.qualificado },
    { key: "vendido",     count: globalStats.vendido },
    { key: "perdido",     count: globalStats.perdido },
    { key: "descartado",  count: globalStats.descartado },
  ], [globalStats]);

  const tempPieData = useMemo(() => [
    { name: "Quente", value: globalStats.quentes },
    { name: "Morno",  value: globalStats.mornos },
    { name: "Frio",   value: globalStats.frios },
  ].filter((d) => d.value > 0), [globalStats]);

  const feiraAtual = useMemo(() => selectedFeira === "all" ? null : feiras.find((f) => f.id === selectedFeira) || null, [feiras, selectedFeira]);

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

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-extrabold text-secondary tracking-tight">Dashboard</h2>
          {feiraAtual && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> {feiraAtual.nome}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {feiras.length > 0 && (
            <Select value={selectedFeira} onValueChange={setSelectedFeira}>
              <SelectTrigger className="h-9 rounded-xl text-xs font-bold w-auto min-w-[140px] max-w-[200px]">
                <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Selecionar feira" />
              </SelectTrigger>
              <SelectContent>
                {isMaster && <SelectItem value="all">Todas as feiras</SelectItem>}
                {feiras.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            Ao vivo
          </span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Leads"  value={stats.total}            icon={<Users    className="w-4 h-4" />} />
        <StatCard title="Quentes"      value={stats.quentes}          icon={<Flame    className="w-4 h-4" />} variant="hot" />
        <StatCard title="Hoje"         value={stats.hoje}             icon={<Calendar className="w-4 h-4" />} />
        <StatCard title="Conversão"    value={`${stats.convRate}%`}   icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      {/* ── Status ── */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Por status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {statusList.map(({ key, count }) => {
            const badge = STATUS_BADGE[key];
            return (
              <div key={key} className={`rounded-2xl border p-3 flex items-center justify-between ${badge.className}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`} />
                  <span className="text-xs font-extrabold uppercase tracking-wider">{badge.label}</span>
                </div>
                <span className="text-lg font-black tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Análise (gráficos colapsáveis) ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          onClick={handleToggleCharts}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Análise dos últimos 30 dias</span>
          {showCharts
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showCharts && (
          <div className="px-4 pb-5 space-y-6 border-t border-border">
            {loadingCharts ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Area chart: leads por dia */}
                <div className="space-y-2 pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Leads / dia</p>
                  {timeline.some((t) => t.leads > 0) ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="dia" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={4} />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }} />
                        <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-8">Nenhum lead nos últimos 30 dias.</p>
                  )}
                </div>

                {/* Pie chart: temperatura */}
                {tempPieData.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Temperatura</p>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={140} height={140}>
                        <PieChart>
                          <Pie data={tempPieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={4} dataKey="value" strokeWidth={0}>
                            {tempPieData.map((_, i) => <Cell key={i} fill={TEMP_PIE_COLORS[i % TEMP_PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {[
                          { label: "Quente", value: globalStats.quentes, color: "bg-red-500" },
                          { label: "Morno",  value: globalStats.mornos,  color: "bg-orange-500" },
                          { label: "Frio",   value: globalStats.frios,   color: "bg-blue-500" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                              <span className="text-secondary font-semibold">{label}</span>
                            </div>
                            <span className="font-extrabold text-secondary tabular-nums">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Leads recentes ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Leads Recentes
            {recentLeads.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold tabular-nums border border-primary/20">
                {recentLeads.length}
              </span>
            )}
          </h3>
          <Button variant="ghost" size="sm" asChild className="text-accent text-xs font-bold">
            <Link to="/admin/leads">Ver todos <ArrowRight className="w-3 h-3 ml-1" /></Link>
          </Button>
        </div>

        <div className="grid gap-3">
          {recentLeads.map((l) => <RecentLeadRow key={l.id} lead={l} />)}
          {recentLeads.length === 0 && (
            <div className="text-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                {feiras.length === 0
                  ? "Nenhuma feira vinculada à sua conta. Fale com o master."
                  : "Nenhum lead ainda. Aguardando..."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Atalhos ── */}
      {isMaster ? (
        <div className="grid grid-cols-2 gap-3">
          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-2xl shadow-lg">
            <Link to="/admin/leads">Gerenciar leads</Link>
          </Button>
          <Button asChild variant="outline" className="w-full font-bold py-6 rounded-2xl border-2 gap-2">
            <Link to="/admin/feiras"><CalendarDays className="w-4 h-4" /> Gerenciar feiras</Link>
          </Button>
        </div>
      ) : (
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-2xl shadow-lg">
          <Link to="/admin/leads">Gerenciar todos os leads</Link>
        </Button>
      )}
    </div>
  );
}

const RecentLeadRow = memo(function RecentLeadRow({ lead: l }: { lead: Lead }) {
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
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${TEMP_BADGE[l.temperatura].className.split(" ")[0]}`}>
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
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`, "_blank", "noreferrer"); }}
          className="w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 hover:bg-green-500/20 active:bg-green-500/25 transition-colors cursor-pointer shrink-0"
          aria-label="Abrir WhatsApp"
        >
          <WhatsAppIcon className="w-5 h-5 sm:w-4 sm:h-4" />
        </span>
      </div>
    </Link>
  );
});

const StatCard = memo(function StatCard({ title, value, icon, variant = "default" }: { title: string; value: string | number; icon: React.ReactNode; variant?: "default" | "hot" }) {
  return (
    <Card className={`border-none shadow-sm ${variant === "hot" ? "bg-primary/5 text-primary" : "bg-card"}`}>
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest opacity-60">{title}</CardTitle>
        <div className="opacity-40">{icon}</div>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <div className="text-2xl font-black tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
});
