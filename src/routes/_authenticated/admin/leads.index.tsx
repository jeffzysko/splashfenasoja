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
const CACHE_PREFIX = "leadsList:v2:";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 min

type SortBy = "recent" | "score" | "name";

// Cursor por chave composta dependendo do sort.
type Cursor =
  | { kind: "recent"; created_at: string; id: string }
  | { kind: "score"; score: number; created_at: string; id: string }
  | { kind: "name"; nome: string; id: string }
  | null;

type CacheEntry = {
  ts: number;
  leads: Lead[];
  cursor: Cursor;
  hasMore: boolean;
  totalCount: number | null;
};

function cacheKey(temp: string, status: string, search: string, sort: SortBy) {
  return `${CACHE_PREFIX}${temp}|${status}|${sort}|${search.trim().toLowerCase()}`;
}

function readCache(key: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, entry: CacheEntry) {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // quota — ignora
  }
}

/**
 * Invalida (remove) todas as entradas de cache de listas de leads,
 * opcionalmente preservando a chave atualmente ativa (que já está sincronizada
 * em memória via realtime). Usado quando um INSERT/DELETE chega e pode afetar
 * combinações de filtros/sort/busca diferentes da que o usuário está vendo.
 */
function invalidateAllListCaches(exceptKey?: string) {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX) && k !== exceptKey) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

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
  // Compensa cursor após INSERT/DELETE em tempo real para evitar gaps/duplicações
  const insertedSinceLoadRef = useRef(0);
  const deletedIdsRef = useRef<Set<string>>(new Set());

  function buildCursorFromLast(items: Lead[], sort: SortBy): Cursor {
    const last = items[items.length - 1];
    if (!last) return null;
    if (sort === "score") {
      return { kind: "score", score: last.score, created_at: last.created_at, id: last.id };
    }
    if (sort === "name") {
      return { kind: "name", nome: last.nome, id: last.id };
    }
    return { kind: "recent", created_at: last.created_at, id: last.id };
  }

  // Aplica todos os filtros server-side (temp, status, busca textual) + cursor + sort.
  const fetchPage = useCallback(
    async (
      cur: Cursor,
      temp: string,
      status: string,
      searchText: string,
      sort: SortBy,
      withCount: boolean
    ) => {
      let q = supabase
        .from("leads")
        .select(
          "id, nome, whatsapp, cidade, estado, temperatura, status, score, created_at",
          withCount ? { count: "exact" } : undefined
        )
        .limit(PAGE_SIZE);

      // Sort + tie-breaker por id para keyset estável
      if (sort === "score") {
        q = q.order("score", { ascending: false })
             .order("created_at", { ascending: false })
             .order("id", { ascending: false });
      } else if (sort === "name") {
        q = q.order("nome", { ascending: true })
             .order("id", { ascending: true });
      } else {
        q = q.order("created_at", { ascending: false })
             .order("id", { ascending: false });
      }

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

      // Paginação por cursor (keyset) coerente com o sort
      if (cur) {
        if (cur.kind === "recent") {
          q = q.or(
            `created_at.lt.${cur.created_at},and(created_at.eq.${cur.created_at},id.lt.${cur.id})`
          );
        } else if (cur.kind === "score") {
          q = q.or(
            `score.lt.${cur.score},and(score.eq.${cur.score},created_at.lt.${cur.created_at}),and(score.eq.${cur.score},created_at.eq.${cur.created_at},id.lt.${cur.id})`
          );
        } else {
          // name asc
          const safeName = cur.nome.replace(/[(),]/g, " ");
          q = q.or(
            `nome.gt.${safeName},and(nome.eq.${safeName},id.gt.${cur.id})`
          );
        }
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

  // Recarrega do zero quando filtros, sort ou busca mudam
  useEffect(() => {
    const reqId = ++reqIdRef.current;
    const key = cacheKey(filterTemp, filterStatus, debouncedSearch, sortBy);
    const cached = readCache(key);

    // Sempre zera contadores de drift na recarga
    insertedSinceLoadRef.current = 0;
    deletedIdsRef.current = new Set();

    if (cached) {
      // Hidrata imediatamente da cache (sem flicker)
      setLeads(cached.leads);
      setCursor(cached.cursor);
      setHasMore(cached.hasMore);
      setTotalCount(cached.totalCount);
      setLoading(false);
      setRefreshing(true);
      firstLoadRef.current = false;
    } else {
      if (firstLoadRef.current) setLoading(true);
      else setRefreshing(true);
      setHasMore(true);
    }

    fetchPage(null, filterTemp, filterStatus, debouncedSearch, sortBy, true).then(
      ({ items, end, count }) => {
        if (reqId !== reqIdRef.current) return;
        setLeads(items);
        setHasMore(!end);
        setTotalCount(count);
        const nextCursor = buildCursorFromLast(items, sortBy);
        setCursor(nextCursor);
        setLoading(false);
        setRefreshing(false);
        firstLoadRef.current = false;
        insertedSinceLoadRef.current = 0;
        deletedIdsRef.current = new Set();
        writeCache(key, {
          ts: Date.now(),
          leads: items,
          cursor: nextCursor,
          hasMore: !end,
          totalCount: count,
        });
      }
    );
  }, [filterTemp, filterStatus, debouncedSearch, sortBy, fetchPage]);

  // Realtime: aplica em memória sem refetch
  useEffect(() => {
    const activeKey = cacheKey(filterTemp, filterStatus, debouncedSearch, sortBy);
    const unsub = subscribeLeads((event, payload) => {
      if (event === "INSERT") {
        const l = payload.new as Lead;
        // Invalida outras combinações de cache: o novo lead pode pertencer a
        // filtros diferentes do atual e ficaria desatualizado ao voltar.
        invalidateAllListCaches(activeKey);
        if (filterTemp !== "all" && l.temperatura !== filterTemp) return;
        if (filterStatus !== "all" && l.status !== filterStatus) return;
        setLeads((prev) => {
          if (prev.some((x) => x.id === l.id)) return prev;
          insertedSinceLoadRef.current += 1;
          return [l, ...prev];
        });
        setTotalCount((c) => (c === null ? c : c + 1));
      } else if (event === "UPDATE") {
        const l = payload.new as Lead;
        // Mudanças em temperatura/status/score/nome alteram a pertinência e a
        // ordem em outras combinações de filtros/sort. Invalida os demais caches.
        invalidateAllListCaches(activeKey);
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
        deletedIdsRef.current.add(old.id);
        invalidateAllListCaches(activeKey);
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
  }, [filterTemp, filterStatus, debouncedSearch, sortBy]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    const { items, end } = await fetchPage(
      cursor,
      filterTemp,
      filterStatus,
      debouncedSearch,
      sortBy,
      false
    );
    // Filtra IDs já presentes (dedupe) e que foram deletados em tempo real (evita ressuscitar)
    const deleted = deletedIdsRef.current;
    setLeads((prev) => {
      const seen = new Set(prev.map((l) => l.id));
      const merged = [
        ...prev,
        ...items.filter((l) => !seen.has(l.id) && !deleted.has(l.id)),
      ];
      // Atualiza cache com a página acumulada
      const key = cacheKey(filterTemp, filterStatus, debouncedSearch, sortBy);
      const nextCursor = buildCursorFromLast(items.length ? items : prev, sortBy);
      writeCache(key, {
        ts: Date.now(),
        leads: merged,
        cursor: nextCursor,
        hasMore: !end && items.length > 0,
        totalCount,
      });
      return merged;
    });
    setHasMore(!end && items.length > 0);
    const nextCursor = buildCursorFromLast(items, sortBy);
    if (nextCursor) setCursor(nextCursor);
    else setHasMore(false);
    setLoadingMore(false);
  }, [cursor, filterTemp, filterStatus, debouncedSearch, sortBy, fetchPage, hasMore, loadingMore, totalCount]);

  // Ordenação já é server-side; mantemos a referência direta.
  const filteredLeads = leads;


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

        <div
          className="flex gap-2 items-center overflow-x-auto pb-1 no-scrollbar border-t border-border/40 pt-2"
          role="radiogroup"
          aria-label="Ordenar leads"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground pr-1">
            Ordenar:
          </span>
          <FilterChip label="Mais recentes" active={sortBy === "recent"} onClick={() => setSortBy("recent")} />
          <FilterChip label="Maior score" active={sortBy === "score"} onClick={() => setSortBy("score")} />
          <FilterChip label="Nome (A-Z)" active={sortBy === "name"} onClick={() => setSortBy("name")} />
        </div>
      </div>

      {/* Live region para leitores de tela */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {showInitialSkeleton
          ? "Carregando leads..."
          : refreshing
          ? "Atualizando lista de leads..."
          : loadingMore
          ? "Carregando mais leads..."
          : totalCount !== null
          ? `${filteredLeads.length} de ${totalCount} leads exibidos.`
          : `${filteredLeads.length} leads exibidos.`}
      </p>


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
    <div className="flex justify-center py-4" role="status" aria-live="polite">
      <Button
        onClick={onClick}
        disabled={loading}
        variant="outline"
        size="sm"
        className="rounded-xl"
        aria-label={loading ? "Carregando mais leads" : "Carregar mais leads"}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            Carregando mais leads...
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

function LeadListSkeleton() {
  return (
    <div
      className="grid gap-3 pb-20"
      role="status"
      aria-live="polite"
      aria-label="Carregando lista de leads"
    >
      <span className="sr-only">Carregando lista de leads...</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasActiveFilters,
  onClear,
}: {
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="text-center py-20 px-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-3">
        <Search className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-secondary font-bold mb-1">
        {hasActiveFilters ? "Nenhum lead encontrado" : "Ainda não há leads"}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {hasActiveFilters
          ? "Tente ajustar a busca ou limpar os filtros."
          : "Assim que chegarem novos leads eles aparecerão aqui."}
      </p>
      {hasActiveFilters && (
        <Button onClick={onClear} variant="outline" size="sm" className="rounded-xl">
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
