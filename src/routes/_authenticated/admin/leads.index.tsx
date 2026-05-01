import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Download,
  ArrowLeft,
  Loader2,
  Phone,
  X,
} from "lucide-react";
import { TEMP_BADGE, STATUS_BADGE, LABELS, formatWhatsappBR, type Temperatura, type LeadStatus } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { subscribeLeads } from "@/lib/leadsRealtime";
import { useDebounced } from "@/hooks/useDebounced";
import { useVirtualizer } from "@tanstack/react-virtual";

const PAGE_SIZE = 50;
const VIRTUALIZE_THRESHOLD = 80;
const ROW_HEIGHT = 124; // altura aproximada do card + gap

type Cursor = { created_at: string; id: string } | null;

/** Escapa vírgulas e parênteses para uso em filtros .or() do PostgREST. */
function escapeOrValue(s: string) {
  return s.replace(/[(),]/g, " ").trim();
}

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
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "score" | "name">("recent");

  const debouncedSearch = useDebounced(search, 300);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const reqIdRef = useRef(0);
  const firstLoadRef = useRef(true);

  // Aplica todos os filtros server-side (temp, status, busca textual) + cursor.
  const fetchPage = useCallback(
    async (
      cur: Cursor,
      temp: string,
      status: string,
      searchText: string,
      withCount: boolean
    ) => {
      let q = supabase
        .from("leads")
        .select(
          "id, nome, whatsapp, cidade, estado, temperatura, status, score, created_at",
          withCount ? { count: "exact" } : undefined
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);

      if (temp !== "all") q = q.eq("temperatura", temp);
      if (status !== "all") q = q.eq("status", status);

      const term = searchText.trim();
      if (term) {
        const safe = escapeOrValue(term);
        if (safe) {
          const digits = term.replace(/\D/g, "");
          const ors: string[] = [
            `nome.ilike.*${safe}*`,
            `cidade.ilike.*${safe}*`,
          ];
          if (digits) ors.push(`whatsapp.ilike.*${digits}*`);
          q = q.or(ors.join(","));
        }
      }

      // Paginação por cursor: keyset (created_at, id) DESC
      if (cur) {
        q = q.or(
          `created_at.lt.${cur.created_at},and(created_at.eq.${cur.created_at},id.lt.${cur.id})`
        );
      }

      const { data, error, count } = await q;
      if (error) {
        toast.error("Erro ao carregar leads.");
        return { items: [] as Lead[], end: true, count: null as number | null };
      }
      const items = (data ?? []) as Lead[];
      return {
        items,
        end: items.length < PAGE_SIZE,
        count: typeof count === "number" ? count : null,
      };
    },
    []
  );

  // Recarrega do zero quando filtros ou busca mudam
  useEffect(() => {
    const reqId = ++reqIdRef.current;
    if (firstLoadRef.current) setLoading(true);
    else setRefreshing(true);
    setHasMore(true);

    fetchPage(null, filterTemp, filterStatus, debouncedSearch, true).then(
      ({ items, end, count }) => {
        if (reqId !== reqIdRef.current) return;
        setLeads(items);
        setHasMore(!end);
        setTotalCount(count);
        const last = items[items.length - 1];
        setCursor(last ? { created_at: last.created_at, id: last.id } : null);
        setLoading(false);
        setRefreshing(false);
        firstLoadRef.current = false;
      }
    );
  }, [filterTemp, filterStatus, debouncedSearch, fetchPage]);

  // Realtime: aplica em memória sem refetch
  useEffect(() => {
    const unsub = subscribeLeads((event, payload) => {
      if (event === "INSERT") {
        const l = payload.new as Lead;
        if (filterTemp !== "all" && l.temperatura !== filterTemp) return;
        if (filterStatus !== "all" && l.status !== filterStatus) return;
        setLeads((prev) => (prev.some((x) => x.id === l.id) ? prev : [l, ...prev]));
        setTotalCount((c) => (c === null ? c : c + 1));
      } else if (event === "UPDATE") {
        const l = payload.new as Lead;
        setLeads((prev) =>
          prev
            .map((x) => (x.id === l.id ? { ...x, ...l } : x))
            .filter((x) => {
              if (filterTemp !== "all" && x.temperatura !== filterTemp) return false;
              if (filterStatus !== "all" && x.status !== filterStatus) return false;
              return true;
            })
        );
      } else if (event === "DELETE") {
        const old = payload.old as { id: string };
        setLeads((prev) => {
          const next = prev.filter((x) => x.id !== old.id);
          if (next.length !== prev.length) {
            setTotalCount((c) => (c === null ? c : Math.max(0, c - 1)));
          }
          return next;
        });
      }
    });
    return () => {
      unsub();
    };
  }, [filterTemp, filterStatus]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    const { items, end } = await fetchPage(
      cursor,
      filterTemp,
      filterStatus,
      debouncedSearch,
      false
    );
    setLeads((prev) => {
      const seen = new Set(prev.map((l) => l.id));
      return [...prev, ...items.filter((l) => !seen.has(l.id))];
    });
    setHasMore(!end);
    const last = items[items.length - 1];
    if (last) setCursor({ created_at: last.created_at, id: last.id });
    else setHasMore(false);
    setLoadingMore(false);
  }, [cursor, filterTemp, filterStatus, debouncedSearch, fetchPage, hasMore, loadingMore]);

  // Sort client-side sobre o que já foi carregado (busca já é server-side).
  const filteredLeads = useMemo(() => {
    if (sortBy === "score") return [...leads].sort((a, b) => b.score - a.score);
    if (sortBy === "name") return [...leads].sort((a, b) => a.nome.localeCompare(b.nome));
    return leads;
  }, [leads, sortBy]);

  // Virtualização só ligada quando há muitas linhas (evita custo em listas pequenas)
  const shouldVirtualize = filteredLeads.length >= VIRTUALIZE_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: filteredLeads.length,
    getScrollElement: () => (shouldVirtualize ? parentRef.current : null),
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  const exportCSV = async () => {
    // Exporta TODOS os leads que batem nos filtros server-side (incluindo busca)
    let q = supabase
      .from("leads")
      .select(
        "id, created_at, nome, whatsapp, email, cidade, estado, tamanho_quintal, prazo_compra, orcamento, temperatura, status, score, notes"
      )
      .order("created_at", { ascending: false });
    if (filterTemp !== "all") q = q.eq("temperatura", filterTemp);
    if (filterStatus !== "all") q = q.eq("status", filterStatus);

    const term = debouncedSearch.trim();
    if (term) {
      const safe = escapeOrValue(term);
      if (safe) {
        const digits = term.replace(/\D/g, "");
        const ors = [`nome.ilike.*${safe}*`, `cidade.ilike.*${safe}*`];
        if (digits) ors.push(`whatsapp.ilike.*${digits}*`);
        q = q.or(ors.join(","));
      }
    }

    const { data, error } = await q;

    if (error || !data || data.length === 0) {
      toast.error("Nenhum lead para exportar.");
      return;
    }

    const filtered = data;

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

    const rows = filtered.map((l) => {
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
    toast.success(`${filtered.length} leads exportados!`);
  };

  const hasActiveFilters =
    filterTemp !== "all" || filterStatus !== "all" || debouncedSearch.trim().length > 0;

  const showInitialSkeleton = loading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-extrabold text-secondary tracking-tight">Leads</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
              {showInitialSkeleton ? (
                <Skeleton className="h-3 w-32" />
              ) : (
                <>
                  {filteredLeads.length}
                  {totalCount !== null && (
                    <>
                      {" "}de {totalCount.toLocaleString("pt-BR")}
                    </>
                  )}
                  {hasMore && " • mais disponíveis"}
                  {refreshing && (
                    <Loader2 className="w-3 h-3 animate-spin text-primary ml-1" />
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <Button onClick={exportCSV} size="sm" disabled={showInitialSkeleton} className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-10 px-4 rounded-xl shadow-md">
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
            className="pl-9 pr-16 h-12 bg-card border-border rounded-xl focus-visible:border-primary focus-visible:ring-0"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {refreshing && !showInitialSkeleton && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
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

      {showInitialSkeleton ? (
        <LeadListSkeleton />
      ) : refreshing && filteredLeads.length === 0 ? (
        <LeadListSkeleton />
      ) : filteredLeads.length === 0 ? (
        <EmptyState
          hasActiveFilters={hasActiveFilters}
          onClear={() => {
            setSearch("");
            setFilterTemp("all");
            setFilterStatus("all");
          }}
        />
      ) : shouldVirtualize ? (
        <div
          ref={parentRef}
          className="pb-20"
          style={{ height: "calc(100vh - 280px)", overflow: "auto" }}
        >
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const lead = filteredLeads[vi.index];
              return (
                <div
                  key={lead.id}
                  data-index={vi.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vi.start}px)`,
                    paddingBottom: 12,
                  }}
                >
                  <LeadRow lead={lead} />
                </div>
              );
            })}
          </div>
          <LoadMoreFooter hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      ) : (
        <div className="grid gap-3 pb-20">
          {filteredLeads.map((l) => (
            <LeadRow key={l.id} lead={l} />
          ))}
          <LoadMoreFooter hasMore={hasMore} loading={loadingMore} onClick={loadMore} />
        </div>
      )}
    </div>
  );
}

function LoadMoreFooter({
  hasMore,
  loading,
  onClick,
}: {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  if (!hasMore) {
    return (
      <p className="text-center text-[11px] text-muted-foreground/70 font-semibold py-4">
        Fim da lista.
      </p>
    );
  }
  return (
    <div className="flex justify-center py-4">
      <Button
        onClick={onClick}
        disabled={loading}
        variant="outline"
        size="sm"
        className="rounded-xl"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Carregando...
          </>
        ) : (
          "Carregar mais"
        )}
      </Button>
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
      preload="intent"
      className="text-left bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/40 transition-all active:scale-[0.99] block"
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
