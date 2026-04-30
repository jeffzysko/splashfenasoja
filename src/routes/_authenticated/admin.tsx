import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Download, Users, Loader2, MapPin, Phone, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";

type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  cidade: string;
  estado: string;
  tamanho_quintal: string;
  prazo_compra: string;
  orcamento: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  user_agent: string | null;
  created_at: string;
};

const LABELS = {
  tamanho_quintal: {
    pequeno: "Pequeno",
    medio: "Médio",
    grande: "Grande",
    nao_sei: "Não sei",
  } as Record<string, string>,
  prazo_compra: {
    ate_30_dias: "Até 30 dias",
    ate_3_meses: "3 meses",
    ate_6_meses: "6 meses",
    pesquisando: "Pesquisando",
  } as Record<string, string>,
  orcamento: {
    ate_30k: "Até R$ 30k",
    "30_a_50k": "R$ 30–50k",
    "50_a_80k": "R$ 50–80k",
    acima_80k: "Acima R$ 80k",
    nao_sei: "Não pensou",
  } as Record<string, string>,
};

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Leads — Splash Admin" }] }),
});

function AdminPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [prazo, setPrazo] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) {
        toast.error("Erro ao carregar leads.");
        setLeads([]);
        return;
      }
      setLeads(data as Lead[]);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!leads) return [];
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (estado !== "all" && l.estado !== estado) return false;
      if (prazo !== "all" && l.prazo_compra !== prazo) return false;
      if (!q) return true;
      return (
        l.nome.toLowerCase().includes(q) ||
        l.whatsapp.includes(q) ||
        (l.email?.toLowerCase().includes(q) ?? false) ||
        l.cidade.toLowerCase().includes(q)
      );
    });
  }, [leads, search, estado, prazo]);

  const stats = useMemo(() => {
    if (!leads) return { total: 0, hoje: 0, quentes: 0 };
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: leads.length,
      hoje: leads.filter((l) => l.created_at.slice(0, 10) === today).length,
      quentes: leads.filter(
        (l) => l.prazo_compra === "ate_30_dias" || l.prazo_compra === "ate_3_meses",
      ).length,
    };
  }, [leads]);

  const exportCsv = () => {
    if (!filtered.length) {
      toast.info("Nenhum lead pra exportar.");
      return;
    }
    const headers = [
      "Data", "Nome", "WhatsApp", "Email", "Cidade", "Estado",
      "Quintal", "Prazo", "Orçamento",
      "UTM Source", "UTM Medium", "UTM Campaign",
    ];
    const rows = filtered.map((l) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.nome,
      l.whatsapp,
      l.email ?? "",
      l.cidade,
      l.estado,
      LABELS.tamanho_quintal[l.tamanho_quintal] ?? l.tamanho_quintal,
      LABELS.prazo_compra[l.prazo_compra] ?? l.prazo_compra,
      LABELS.orcamento[l.orcamento] ?? l.orcamento,
      l.utm_source ?? "",
      l.utm_medium ?? "",
      l.utm_campaign ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-fenasoja-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportados ${filtered.length} lead(s).`);
  };

  if (!leads) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary tracking-tight">
            Leads capturados
          </h1>
          <p className="text-sm text-muted-foreground">
            FENASOJA 2026 — atualizado em tempo real
          </p>
        </div>
        <Button onClick={exportCsv} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={stats.total} icon={<Users className="w-4 h-4" />} />
        <StatCard label="Hoje" value={stats.hoje} icon={<Calendar className="w-4 h-4" />} />
        <StatCard label="Leads quentes" value={stats.quentes} icon={<Users className="w-4 h-4" />} accent />
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, telefone, email, cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              <SelectItem value="RS">Rio Grande do Sul</SelectItem>
              <SelectItem value="SC">Santa Catarina</SelectItem>
            </SelectContent>
          </Select>
          <Select value={prazo} onValueChange={setPrazo}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Prazo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os prazos</SelectItem>
              <SelectItem value="ate_30_dias">Até 30 dias 🔥</SelectItem>
              <SelectItem value="ate_3_meses">3 meses</SelectItem>
              <SelectItem value="ate_6_meses">6 meses</SelectItem>
              <SelectItem value="pesquisando">Pesquisando</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table desktop / cards mobile */}
      <Card className="border-border overflow-hidden">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Orçamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="font-medium text-secondary">{l.nome}</TableCell>
                  <TableCell className="text-sm">
                    <a href={`https://wa.me/55${l.whatsapp.replace(/\D/g, "")}`}
                       target="_blank" rel="noreferrer"
                       className="text-accent hover:underline block">{l.whatsapp}</a>
                    {l.email && <span className="text-xs text-muted-foreground">{l.email}</span>}
                  </TableCell>
                  <TableCell className="text-sm">{l.cidade} <span className="text-muted-foreground">/ {l.estado}</span></TableCell>
                  <TableCell className="text-sm">{LABELS.prazo_compra[l.prazo_compra]}</TableCell>
                  <TableCell className="text-sm">{LABELS.orcamento[l.orcamento]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {filtered.map((l) => (
            <div key={l.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-secondary">{l.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                  {LABELS.prazo_compra[l.prazo_compra]}
                </span>
              </div>
              <div className="text-sm flex items-center gap-2 text-secondary">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <a href={`https://wa.me/55${l.whatsapp.replace(/\D/g, "")}`} className="text-accent">{l.whatsapp}</a>
              </div>
              {l.email && (
                <div className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  {l.email}
                </div>
              )}
              <div className="text-sm flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {l.cidade} / {l.estado}
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                Quintal: <strong>{LABELS.tamanho_quintal[l.tamanho_quintal]}</strong> · Orçamento: <strong>{LABELS.orcamento[l.orcamento]}</strong>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum lead encontrado.</p>
            <p className="text-xs mt-1">
              {leads.length === 0 ? (
                <>Cadastre o primeiro pelo <Link to="/" className="text-accent underline">formulário</Link>.</>
              ) : "Tente ajustar os filtros."}
            </p>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Mostrando {filtered.length} de {leads.length} lead(s)
      </p>
    </div>
  );
}

function StatCard({
  label, value, icon, accent,
}: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/40 bg-primary/5" : "border-border"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-3xl font-extrabold ${accent ? "text-primary" : "text-secondary"} tabular-nums`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
