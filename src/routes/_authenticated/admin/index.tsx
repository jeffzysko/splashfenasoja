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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Flame, Calendar, TrendingUp, ArrowRight, Loader2,
  Clock, CalendarDays, BarChart2,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { TEMP_BADGE, STATUS_BADGE, type Temperatura, type LeadStatus } from "@/lib/leads";
import { formatDistanceToNow, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { subscribeLeads } from "@/lib/leadsRealtime";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts";

type Status = LeadStatus;
type Lead = { id: string; nome: string; whatsapp: string; temperatura: Temperatura; status: Status; created_at: string; score: number; feira_id: string | null };
type Feira = { id: string; nome: string; slug: string; ativo: boolean };
type Stats = { total: number; quentes: number; mornos?: number; frios?: number; hoje: number; novo: number; contatado: number; qualificado: number; vendido: number; perdido: number; descartado: number };
const ZERO_STATS: Stats = { total: 0, quentes: 0, mornos: 0, frios: 0, hoje: 0, novo: 0, contatado: 0, qualificado: 0, vendido: 0, perdido: 0, descartado: 0 };

const TEMP_COLORS: Record<string, string> = {
  quente: "#ef4444",
  morno: "#f97316",
  frio: "#3b82f6",
};
const STATUS_COLORS: Record<string, string> = {
  novo: "#6366f1",
  contatado: "#f59e0b",
  qualificado: "#10b981",
  vendido: "#22c55e",
  perdido: "#ef4444",
  descartado: "#9ca3af",
};

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

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
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Verifica se é master e carrega feiras disponíveis
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

  // Carrega timeline dos últimos 30 dias
  const loadTimeline = useCallback(async (feiraId?: string) => {
    setLoadingCharts(true);
    const from = subDays(new Date(), 29).toISOString();
    let q = supabase
      .from("leads")
      .select("created_at")
      .gte("created_at", from)
      .order("created_at", { ascending: true });
    if (feiraId && feiraId !== "all") q = q.eq("feira_id", feiraId);
    const { data } = await q;
    // Agrupa por dia
    const counts: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "dd/MM");
      counts[d] = 0;
    }
    (data || []).forEach((r) => {
      const d = format(new Date(r.created_at), "dd/MM");
      if (d in counts) counts[d]++;
    });
    setTimeline(Object.entries(counts).map(([dia, leads]) => ({ dia, leads })));
    setLoadingCharts(false);
  }, []);

  const loadStats = useCallback(async (feiraId?: string) => {
    const { data } = await supabase.rpc("leads_dashboard_stats", feiraId && feiraId !== "all" ? { p_feira_id: feiraId } : {});
    if (data) setGlobalStats({ ...ZERO_STATS, ...data });
  }, []);

  const loadLeads = useCallback(async (feiraId?: string) => {
    let q = supabase
      .from("leads")
      .select("id, nome, whatsapp, temperatura, status, created_at, score, feira_id")
      .order("created_at", { ascending: false })
      .limit(10);
    if (feiraId && feiraId !== "all") q = q.eq("feira_id", feiraId);
    const { data } = await q;
    if (data) setLeads(data as Lead[]);
    setLoading(false);
  }, []);

  const refresh = useCallback((feiraId: string) => {
    const fid = feiraId === "all" ? undefined : feiraId;
    loadStats(fid);
    loadLeads(fid);
    loadTimeline(feiraId);
  }, [loadStats, loadLeads, loadTimeline]);

  // Carrega ao mudar feira selecionada
  useEffect(() => {
    refresh(selectedFeira);
  }, [selectedFeira, refresh]);

  // Realtime: atualiza leads recentes ao receber evento
  useEffect(() => {
    const unsub = subscribeLeads(() => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => refresh(selectedFeira), 800);
    });
    return () => { unsub(); if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [selectedFeira, refresh]);

  const recentLeads = useMemo(() => leads?.slice(0, 8) ?? [], [leads]);

  // Dados para gráficos
  const tempChartData = useMemo(() => [
    { name: "Quente", value: globalStats.quentes || 0 },
    { name: "Morno", value: globalStats.mornos || 0 },
    { name: "Frio", value: globalStats.frios || 0 },
  ].filter((d) => d.value > 0), [globalStats]);

  const statusChartData = useMemo(() => [
    { name: "Novo", value: globalStats.novo || 0, color: STATUS_COLORS.novo },
    { name: "Contatado", value: globalStats.contatado || 0, color: STATUS_COLORS.contatado },
    { name: "Qualificado", value: globalStats.qualificado || 0, color: STATUS_COLORS.qualificado },
    { name: "Vendido", value: globalStats.vendido || 0, color: STATUS_COLORS.vendido },
    { name: "Perdido", value: globalStats.perdido || 0, color: STATUS_COLORS.perdido },
    { name: "Descartado", value: globalStats.descartado || 0, color: STATUS_COLORS.descartado },
  ].filter((d) => d.value > 0), [globalStats]);

  return (
    <div className="space-y-4">
      {/* Seletor de feira */}
      {(isMaster || feiras.length > 1) && (
        <Select value={selectedFeira} onValueChange={setSelectedFeira}>
          <SelectTrigger className="w-full h-11 rounded-xl font-semibold">
            <SelectValue placeholder="Selecione uma feira" />
          </SelectTrigger>
          <SelectContent>
            {isMaster && <SelectItem value="all">Todas as feiras</SelectItem>}
            {feiras.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
                {!f.ativo && " (inativa)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Tabs defaultValue="resumo">
        <TabsList className="w-full rounded-xl h-10">
          <TabsTrigger value="resumo" className="flex-1 gap-1.5 text-sm font-bold">
            <Clock className="w-3.5 h-3.5" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="graficos" className="flex-1 gap-1.5 text-sm font-bold">
            <BarChart2 className="w-3.5 h-3.5" /> Gráficos
          </TabsTrigger>
        </TabsList>

        {/* ── ABA RESUMO ── */}
        <TabsContent value="resumo" className="space-y-4 mt-4">
          {/* Cards de stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="Total de leads"
              value={loading ? "…" : globalStats.total.toLocaleString("pt-BR")}
              icon={<Users className="w-4 h-4" />}
            />
            <StatCard
              title="Leads hoje"
              value={loading ? "…" : globalStats.hoje.toLocaleString("pt-BR")}
              icon={<Calendar className="w-4 h-4" />}
            />
            <StatCard
              title="Quentes 🔥"
              value={loading ? "…" : globalStats.quentes.toLocaleString("pt-BR")}
              icon={<Flame className="w-4 h-4" />}
              variant="hot"
            />
            <StatCard
              title="Qualificados"
              value={loading ? "…" : (globalStats.qualificado || 0).toLocaleString("pt-BR")}
              icon={<TrendingUp className="w-4 h-4" />}
            />
          </div>

          {/* Leads recentes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-secondary flex items-center gap-2">
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
              {recentLeads.length === 0 && !loading && (
                <div className="text-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    {feiras.length === 0
                      ? "Nenhuma feira vinculada à sua conta. Fale com o master."
                      : "Nenhum lead ainda. Aguardando..."}
                  </p>
                </div>
              )}
              {loading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Atalhos */}
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
        </TabsContent>

        {/* ── ABA GRÁFICOS ── */}
        <TabsContent value="graficos" className="space-y-6 mt-4">
          {loadingCharts ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Leads por dia — últimos 30 dias */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Leads / dia — últimos 30 dias
                </h3>
                {timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={timeline} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="dia"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--secondary))" }}
                        labelStyle={{ fontWeight: 700 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="leads"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período.</p>
                )}
              </div>

              {/* Temperatura */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Distribuição por temperatura
                </h3>
                {tempChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={tempChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {tempChartData.map((entry, index) => (
                          <Cell key={index} fill={TEMP_COLORS[entry.name.toLowerCase()] || "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--secondary))" }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem leads cadastrados.</p>
                )}
              </div>

              {/* Funil de status */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Funil de status
                </h3>
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(160, statusChartData.length * 40)}>
                    <BarChart
                      data={statusChartData}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--secondary))", fontWeight: 600 }}
                        tickLine={false}
                        width={72}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--secondary))" }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                        {statusChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem leads cadastrados.</p>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
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
