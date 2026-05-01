import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Download,
  ArrowLeft,
  Loader2,
  Phone,
} from "lucide-react";
import { TEMP_BADGE, STATUS_BADGE, LABELS, formatWhatsappBR, type Temperatura, type LeadStatus } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { subscribeLeads } from "@/lib/leadsRealtime";
import { useDebounced } from "@/hooks/useDebounced";

const PAGE_LIMIT = 500; // Limite de segurança (era ilimitado)

type Status = "novo" | "contatado" | "qualificado" | "vendido" | "perdido" | "descartado";

type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  cidade: string;
  estado: string;
  temperatura: Temperatura;
  status: Status;
  score: number;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/leads/")({
  component: LeadsListPage,
});

function LeadsListPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "score" | "name">("recent");

  const debouncedSearch = useDebounced(search, 250);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, nome, whatsapp, cidade, estado, temperatura, status, score, created_at")
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT);

      if (!error && data) {
        setLeads(data as Lead[]);
      }
      setLoading(false);
    };

    fetchLeads();

    const unsub = subscribeLeads((event, payload) => {
      if (event === "INSERT") {
        const newLead = payload.new as Lead;
        setLeads((prev) => [newLead, ...prev].slice(0, PAGE_LIMIT));
      } else if (event === "UPDATE") {
        const updated = payload.new as Lead;
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
      } else if (event === "DELETE") {
        const oldLead = payload.old as { id: string };
        setLeads((prev) => prev.filter((l) => l.id !== oldLead.id));
      }
    });

    return () => {
      unsub();
    };
  }, []);

  const filteredLeads = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const filtered = leads.filter((l) => {
      if (filterTemp !== "all" && l.temperatura !== filterTemp) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (!q) return true;
      // normaliza uma vez por iteração, não 3
      return (
        l.nome.toLowerCase().includes(q) ||
        l.whatsapp.includes(debouncedSearch) ||
        l.cidade.toLowerCase().includes(q)
      );
    });

    if (sortBy === "recent") {
      filtered.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    } else if (sortBy === "score") {
      filtered.sort((a, b) => b.score - a.score);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return filtered;
  }, [leads, debouncedSearch, filterTemp, filterStatus, sortBy]);

  const exportCSV = async () => {
    const ids = filteredLeads.map((l) => l.id);
    if (ids.length === 0) {
      toast.error("Nenhum lead para exportar.");
      return;
    }

    const { data, error } = await supabase
      .from("leads")
      .select(
        "id, created_at, nome, whatsapp, email, cidade, estado, tamanho_quintal, prazo_compra, orcamento, temperatura, status, score, notes"
      )
      .in("id", ids);

    if (error || !data) {
      toast.error("Erro ao exportar CSV.");
      return;
    }

    // Mantém a ordem do filteredLeads
    const byId = new Map(data.map((l) => [l.id, l]));
    const ordered = filteredLeads.map((l) => byId.get(l.id)).filter(Boolean) as typeof data;

    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    };

    const headers = [
      "ID",
      "Data",
      "Nome",
      "WhatsApp",
      "E-mail",
      "Cidade",
      "Estado",
      "Tamanho do Quintal",
      "Prazo de Compra",
      "Orçamento",
      "Temperatura",
      "Status",
      "Score",
      "Notas",
    ];

    const rows = ordered.map((l) => {
      const dataFmt = new Date(l.created_at).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });
      return [
        l.id,
        dataFmt,
        l.nome,
        formatWhatsappBR(l.whatsapp),
        l.email || "",
        l.cidade,
        l.estado,
        LABELS.tamanho_quintal[l.tamanho_quintal as keyof typeof LABELS.tamanho_quintal] ||
          l.tamanho_quintal,
        LABELS.prazo_compra[l.prazo_compra as keyof typeof LABELS.prazo_compra] ||
          l.prazo_compra,
        LABELS.orcamento[l.orcamento as keyof typeof LABELS.orcamento] || l.orcamento,
        l.temperatura,
        l.status,
        l.score,
        l.notes || "",
      ]
        .map(esc)
        .join(";");
    });

    const csv = "\uFEFF" + headers.map(esc).join(";") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-fenasoja-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`${ordered.length} leads exportados!`);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-extrabold text-secondary tracking-tight">Leads</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              {filteredLeads.length} de {leads.length} encontrados
            </p>
          </div>
        </div>
        <Button onClick={exportCSV} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-10 px-4 rounded-xl shadow-md">
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
      </div>
      <div className="sticky top-[56px] z-30 bg-muted/30 -mx-4 px-4 py-3 space-y-3 backdrop-blur-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, zap ou cidade..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-12 bg-card border-border rounded-xl focus-visible:border-primary focus-visible:ring-0"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <FilterChip label="Todos" active={filterTemp === "all"} onClick={() => setFilterTemp("all")} />
          <FilterChip label="Quente 🔥" active={filterTemp === "quente"} onClick={() => setFilterTemp("quente")} />
          <FilterChip label="Morno 🌤️" active={filterTemp === "morno"} onClick={() => setFilterTemp("morno")} />
          <FilterChip label="Frio ❄️" active={filterTemp === "frio"} onClick={() => setFilterTemp("frio")} />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-border/40 pt-2">
          <FilterChip label="Todos Status" active={filterStatus === "all"} onClick={() => setFilterStatus("all")} />
          <FilterChip label="Novo" active={filterStatus === "novo"} onClick={() => setFilterStatus("novo")} />
          <FilterChip label="Contatado" active={filterStatus === "contatado"} onClick={() => setFilterStatus("contatado")} />
          <FilterChip label="Qualificado" active={filterStatus === "qualificado"} onClick={() => setFilterStatus("qualificado")} />
          <FilterChip label="Vendido 🏆" active={filterStatus === "vendido"} onClick={() => setFilterStatus("vendido")} />
          <FilterChip label="Perdido 💔" active={filterStatus === "perdido"} onClick={() => setFilterStatus("perdido")} />
          <FilterChip label="Descartado" active={filterStatus === "descartado"} onClick={() => setFilterStatus("descartado")} />
        </div>
      </div>
      <div className="grid gap-3 pb-20">
        {filteredLeads.map((l) => (
          <LeadRow key={l.id} lead={l} />
        ))}
        {filteredLeads.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-medium">Nenhum lead encontrado com esses filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const LeadRow = memo(function LeadRow({ lead: l }: { lead: Lead }) {
  const relative = useMemo(
    () => formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR }),
    [l.created_at]
  );
  const tempBadge = TEMP_BADGE[l.temperatura];
  const statusBadge = STATUS_BADGE[l.status as LeadStatus];
  return (
    <Link
      to="/admin/leads/$id"
      params={{ id: l.id }}
      className="text-left bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/40 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-secondary text-lg leading-tight">{l.nome}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {l.cidade}/{l.estado} • {relative}
          </div>
        </div>
        <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider", tempBadge.className)}>
          {l.temperatura}
        </span>
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex gap-2 items-center">
          <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border", statusBadge.className)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusBadge.dot)} />
            {statusBadge.label}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground">
            Score: {l.score}
          </span>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`, "_blank", "noreferrer");
          }}
          className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 hover:bg-green-500/20 transition-colors cursor-pointer"
          aria-label="Abrir WhatsApp"
        >
          <Phone className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
});

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border-2 transition-all",
        active 
          ? "bg-primary border-primary text-primary-foreground shadow-md" 
          : "bg-card border-border text-muted-foreground hover:border-primary/40"
      )}
    >
      {label}
    </button>
  );
}