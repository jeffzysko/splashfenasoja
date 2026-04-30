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
import {
  Search,
  Download,
  Users,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import { LABELS, TEMP_BADGE, type Temperatura } from "@/lib/leads";

type Status = "novo" | "contatado" | "qualificado" | "descartado";

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
  score: number;
  temperatura: Temperatura;
  status: Status;
  evento: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  user_agent: string | null;
  created_at: string;
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "novo", label: "🆕 Novo" },
  { value: "contatado", label: "📞 Contatado" },
  { value: "qualificado", label: "✅ Qualificado" },
  { value: "descartado", label: "🗑️ Descartado" },
];

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Leads — Splash Admin" }] }),
});

function AdminPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("all");
  const [temp, setTemp] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

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
      if (temp !== "all" && l.temperatura !== temp) return false;
      if (status !== "all" && l.status !== status) return false;
      if (!q) return true;
      return (
        l.nome.toLowerCase().includes(q) ||
        l.whatsapp.includes(q) ||
        (l.email?.toLowerCase().includes(q) ?? false) ||
        l.cidade.toLowerCase().includes(q)
      );
    });
  }, [leads, search, estado, temp, status]);

  const stats = useMemo(() => {
    if (!leads) return { total: 0, hoje: 0, quentes: 0 };
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: leads.length,
      hoje: leads.filter((l) => l.created_at.slice(0, 10) === today).length,
      quentes: leads.filter((l) => l.temperatura === "quente").length,
    };
  }, [leads]);

  const updateStatus = async (id: string, newStatus: Status) => {
    const prev = leads;
    setLeads((curr) =>
      curr ? curr.map((l) => (l.id === id ? { ...l, status: newStatus } : l)) : curr,
    );
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      toast.error("Não consegui salvar o status.");
      setLeads(prev);
      return;
    }
    toast.success("Status atualizado.");
  };

  const uniqueUFs = useMemo(() => {
    if (!leads) return [];
    return Array.from(new Set(leads.map((l) => l.estado).filter(Boolean))).sort();
  }, [leads]);

  const exportCsv = () => {
    if (!filtered.length) {
      toast.info("Nenhum lead pra exportar.");
      return;
    }
    const headers = [
      "Data", "Nome", "WhatsApp", "Email", "Cidade", "Estado",
      "Quintal", "Prazo", "Orçamento",
      "Score", "Temperatura", "Status",
      "UTM Source", "UTM Medium", "UTM Campaign",
    ];
    const rows = filtered.map((l) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.nome || "",
      l.whatsapp || "",
      l.email ?? "",
      l.cidade || "",
      l.estado || "",
      (l.tamanho_quintal && LABELS.tamanho_quintal[l.tamanho_quintal as keyof typeof LABELS.tamanho_quintal]) || l.tamanho_quintal || "",
      (l.prazo_compra && LABELS.prazo_compra[l.prazo_compra as keyof typeof LABELS.prazo_compra]) || l.prazo_compra || "",
      (l.orcamento && LABELS.orcamento[l.orcamento as keyof typeof LABELS.orcamento]) || l.orcamento || "",
      l.score || 0,
      l.temperatura || "",
      l.status || "",
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
        <StatCard label="Quentes 🔥" value={stats.quentes} icon={<Flame className="w-4 h-4" />} accent />
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-[1fr_140px_140px_160px] gap-3">
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
              <SelectItem value="all">Todos UFs</SelectItem>
              {uniqueUFs.map((uf) => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={temp} onValueChange={setTemp}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Temperatura" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas temps</SelectItem>
              <SelectItem value="quente">🔥 Quente</SelectItem>
              <SelectItem value="morno">☀️ Morno</SelectItem>
              <SelectItem value="frio">❄️ Frio</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table desktop */}
      <Card className="border-border overflow-hidden">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Data</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Quintal / Prazo / Orç.</TableHead>
                <TableHead>Temp.</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const badge = TEMP_BADGE[l.temperatura];
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium text-secondary">{l.nome}</TableCell>
                    <TableCell className="text-sm">
                      <a
                        href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline block"
                      >
                        {formatBrPhone(l.whatsapp)}
                      </a>
                      {l.email && <span className="text-xs text-muted-foreground">{l.email}</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.cidade} <span className="text-muted-foreground">/ {l.estado}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{(l.tamanho_quintal && LABELS.tamanho_quintal[l.tamanho_quintal as keyof typeof LABELS.tamanho_quintal]) || l.tamanho_quintal}</div>
                      <div>{(l.prazo_compra && LABELS.prazo_compra[l.prazo_compra as keyof typeof LABELS.prazo_compra]) || l.prazo_compra}</div>
                      <div>{(l.orcamento && LABELS.orcamento[l.orcamento as keyof typeof LABELS.orcamento]) || l.orcamento}</div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border whitespace-nowrap ${badge.className}`}
                      >
                        {badge.label} <span className="opacity-60">· {l.score}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={l.status}
                        onValueChange={(v) => updateStatus(l.id, v as Status)}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {filtered.map((l) => {
            const badge = TEMP_BADGE[l.temperatura];
            return (
              <div key={l.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-secondary">{l.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-1 rounded-full border whitespace-nowrap ${badge.className}`}
                  >
                    {badge.label} · {l.score}
                  </span>
                </div>
                <div className="text-sm flex items-center gap-2 text-secondary">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <a
                    href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`}
                    className="text-accent"
                  >
                    {formatBrPhone(l.whatsapp)}
                  </a>
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
                  Quintal: <strong>{(l.tamanho_quintal && LABELS.tamanho_quintal[l.tamanho_quintal as keyof typeof LABELS.tamanho_quintal]) || l.tamanho_quintal}</strong> · Prazo:{" "}
                  <strong>{(l.prazo_compra && LABELS.prazo_compra[l.prazo_compra as keyof typeof LABELS.prazo_compra]) || l.prazo_compra}</strong> · Orçamento:{" "}
                  <strong>{(l.orcamento && LABELS.orcamento[l.orcamento as keyof typeof LABELS.orcamento]) || l.orcamento}</strong>
                </div>
                <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v as Status)}>
                  <SelectTrigger className="h-9 text-xs mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
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

// Formata "5555999998888" -> "(55) 99999-8888" (assumindo 55 país)
function formatBrPhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
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
