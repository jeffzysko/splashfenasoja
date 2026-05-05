import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Download,
  ArrowLeft,
  Loader2,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Phone,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TEMP_BADGE, STATUS_BADGE, LABELS, formatWhatsappBR, type Temperatura, type LeadStatus } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { subscribeLeads } from "@/lib/leadsRealtime";
import { setVisibleLeadIds } from "@/lib/leadsNavigation";
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
  email: string | null;
  cidade: string;
  estado: string;
  temperatura: Temperatura;
  status: Status;
  score: number;
  created_at: string;
  tamanho_quintal: string;
  prazo_compra: string;
  orcamento: string;
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
          "id, nome, whatsapp, email, cidade, estado, temperatura, status, score, created_at, tamanho_quintal, prazo_compra, orcamento",
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

    // Verifica se um lead bate nos filtros + busca atualmente ativos.
    // Espelha a mesma lógica usada no fetch server-side (temp, status, ilike em nome/cidade/whatsapp).
    const matchesActive = (l: Partial<Lead> | null | undefined): boolean => {
      if (!l) return false;
      if (filterTemp !== "all" && l.temperatura !== filterTemp) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      const term = debouncedSearch.trim().toLowerCase();
      if (!term) return true;
      const digits = term.replace(/\D/g, "");
      const nome = (l.nome ?? "").toLowerCase();
      const cidade = (l.cidade ?? "").toLowerCase();
      const wpp = (l.whatsapp ?? "").replace(/\D/g, "");
      if (nome.includes(term)) return true;
      if (cidade.includes(term)) return true;
      if (digits && wpp.includes(digits)) return true;
      return false;
    };

    const unsub = subscribeLeads((event, payload) => {
      if (event === "INSERT") {
        const l = payload.new as Lead;
        invalidateAllListCaches(activeKey);
        if (!matchesActive(l)) return;
        setLeads((prev) => {
          if (prev.some((x) => x.id === l.id)) return prev;
          insertedSinceLoadRef.current += 1;
          return [l, ...prev];
        });
        setTotalCount((c) => (c === null ? c : c + 1));
      } else if (event === "UPDATE") {
        const l = payload.new as Lead;
        invalidateAllListCaches(activeKey);
        setLeads((prev) => {
          const existing = prev.find((x) => x.id === l.id);
          const wasIn = !!existing;
          const merged = existing ? { ...existing, ...l } : (l as Lead);
          const isIn = matchesActive(merged);

          // Ajusta totalCount conforme transição entra/sai do conjunto filtrado.
          if (wasIn && !isIn) {
            setTotalCount((c) => (c === null ? c : Math.max(0, c - 1)));
          } else if (!wasIn && isIn) {
            setTotalCount((c) => (c === null ? c : c + 1));
          }

          if (wasIn && isIn) {
            return prev.map((x) => (x.id === l.id ? merged : x));
          }
          if (wasIn && !isIn) {
            return prev.filter((x) => x.id !== l.id);
          }
          if (!wasIn && isIn) {
            insertedSinceLoadRef.current += 1;
            return [merged, ...prev];
          }
          return prev;
        });
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

  // Persiste IDs visíveis para navegação Próximo/Anterior na página de detalhe.
  useEffect(() => {
    setVisibleLeadIds(filteredLeads.map((l) => l.id));
  }, [filteredLeads]);


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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
            <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-secondary tracking-tight">Leads</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5 truncate">
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
                  {hasMore && " • mais"}
                  {refreshing && (
                    <Loader2 className="w-3 h-3 animate-spin text-primary ml-1" />
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          onClick={exportCSV}
          size="sm"
          disabled={showInitialSkeleton}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-10 px-3 sm:px-4 rounded-xl shadow-md shrink-0"
          aria-label="Exportar leads em CSV"
        >
          <Download className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>
      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        refreshing={refreshing && !showInitialSkeleton}
        filterTemp={filterTemp}
        setFilterTemp={setFilterTemp}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onClearAll={() => {
          setSearch("");
          setFilterTemp("all");
          setFilterStatus("all");
          setSortBy("recent");
        }}
      />

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
          className="pb-4"
          style={{ height: "calc(100dvh - 240px)", overflow: "auto" }}
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
        <div className="grid gap-3 pb-4">
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Trava local para impedir múltiplos disparos enquanto a request anterior
  // não terminou (a prop `loading` pode levar um tick para refletir o estado).
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    // Quando o loading volta a false, libera a trava para a próxima rodada.
    inFlightRef.current = false;
  }, [loading]);

  // Auto-prefetch quando o sentinel entra na viewport (margem de 240px),
  // reduzindo o "salto" perceptível ao carregar mais itens no mobile.
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (inFlightRef.current) return;
          inFlightRef.current = true;
          // Desconecta imediatamente para não reentrar antes do `loading` virar true.
          io.disconnect();
          onClick();
          break;
        }
      },
      { rootMargin: "240px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, onClick]);

  // Se não há mais leads, não renderiza nem o botão nem o sentinel.
  if (!hasMore) {
    return (
      <p className="text-center text-[11px] text-muted-foreground/70 font-semibold py-4">
        Fim da lista.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center py-4 gap-2" role="status" aria-live="polite">
      <div ref={sentinelRef} aria-hidden="true" className="h-1 w-1" />
      <Button
        onClick={() => {
          if (inFlightRef.current || loading) return;
          inFlightRef.current = true;
          onClick();
        }}
        disabled={loading}
        variant="outline"
        size="sm"
        className="rounded-xl h-11 px-4"
        aria-label={loading ? "Carregando mais leads" : "Carregar mais leads"}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
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
  const navigate = useNavigate();
  const relative = useMemo(
    () => formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR }),
    [l.created_at]
  );
  const tempBadge = TEMP_BADGE[l.temperatura];
  const statusBadge = STATUS_BADGE[l.status as LeadStatus];

  const goToDetail = () => {
    navigate({ to: "/admin/leads/$id", params: { id: l.id } });
  };

  const tamanho = l.tamanho_quintal;
  const orcamento = l.orcamento;
  const prazo = l.prazo_compra;

  // Navegação por teclado entre cards: ArrowUp/ArrowDown move o foco,
  // Home/End vão para o primeiro/último card. Enter/Space abre o detalhe.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToDetail();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
      const cards = Array.from(
        document.querySelectorAll<HTMLDivElement>("[data-lead-card]")
      );
      if (cards.length === 0) return;
      const idx = cards.indexOf(e.currentTarget);
      let nextIdx = idx;
      if (e.key === "ArrowDown") nextIdx = Math.min(cards.length - 1, idx + 1);
      else if (e.key === "ArrowUp") nextIdx = Math.max(0, idx - 1);
      else if (e.key === "Home") nextIdx = 0;
      else nextIdx = cards.length - 1;
      if (nextIdx !== idx) {
        e.preventDefault();
        cards[nextIdx]?.focus();
        cards[nextIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      data-lead-card
      data-lead-id={l.id}
      onClick={goToDetail}
      onKeyDown={onKeyDown}
      aria-label={`${l.nome}, ${statusBadge.label}, temperatura ${l.temperatura}, ${l.cidade}/${l.estado}`}
      className="group text-left bg-card border border-border rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 hover:border-primary/40 transition-all active:scale-[0.99] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/60"
    >
      {/* Linha 1 — Nome (prioridade máxima) + ações rápidas */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-secondary text-base sm:text-lg leading-tight truncate min-w-0">
              {l.nome}
            </h3>
            <span
              className={cn(
                "text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0",
                tempBadge.className
              )}
            >
              {l.temperatura}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {l.cidade}/{l.estado} • {relative}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(`tel:${l.whatsapp.replace(/\D/g, "")}`);
            }}
            className="w-10 h-10 rounded-full bg-blue-500/10 active:bg-blue-500/25 flex items-center justify-center text-blue-600 hover:bg-blue-500/20 transition-colors"
            aria-label={`Ligar para ${l.nome}`}
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(
                `https://wa.me/${l.whatsapp.replace(/\D/g, "")}`,
                "_blank",
                "noreferrer"
              );
            }}
            className="w-10 h-10 rounded-full bg-green-500/10 active:bg-green-500/25 flex items-center justify-center text-green-600 hover:bg-green-500/20 transition-colors"
            aria-label={`Abrir WhatsApp de ${l.nome}`}
          >
            <WhatsAppIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Linha 2 — Status + score (prioridade alta) */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border",
            statusBadge.className
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", statusBadge.dot)} />
          {statusBadge.label}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
          Score {l.score}
        </span>
      </div>

      {/* Linha 3 — Detalhes secundários (atributos do quintal) */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
        <span className="bg-muted/60 px-2 py-0.5 rounded-md">
          📏 {LABELS.tamanho_quintal[tamanho as keyof typeof LABELS.tamanho_quintal] || tamanho}
        </span>
        <span className="bg-muted/60 px-2 py-0.5 rounded-md">
          💰 {LABELS.orcamento[orcamento as keyof typeof LABELS.orcamento] || orcamento}
        </span>
        <span className="bg-muted/60 px-2 py-0.5 rounded-md">
          ⏱ {LABELS.prazo_compra[prazo as keyof typeof LABELS.prazo_compra] || prazo}
        </span>
      </div>
    </div>
  );
});

const TEMP_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "quente", label: "Quente 🔥" },
  { value: "morno", label: "Morno 🌤️" },
  { value: "frio", label: "Frio ❄️" },
];

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "qualificado", label: "Qualificado" },
  { value: "vendido", label: "Vendido 🏆" },
  { value: "perdido", label: "Perdido 💔" },
  { value: "descartado", label: "Descartado" },
];

const SORT_LABEL: Record<SortBy, string> = {
  recent: "Mais recentes",
  score: "Maior score",
  name: "Nome (A-Z)",
};

function FiltersBar({
  search,
  onSearchChange,
  refreshing,
  filterTemp,
  setFilterTemp,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  onClearAll,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  refreshing: boolean;
  filterTemp: string;
  setFilterTemp: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  onClearAll: () => void;
}) {
  const activeCount =
    (filterTemp !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0);
  const tempLabel = TEMP_FILTERS.find((t) => t.value === filterTemp)?.label ?? "Todas";
  const statusLabel = STATUS_FILTERS.find((s) => s.value === filterStatus)?.label ?? "Todos";

  return (
    <div className="sticky top-14 z-30 bg-muted/40 -mx-4 px-4 py-2.5 space-y-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, zap ou cidade..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-16 h-11 bg-card border-border rounded-xl focus-visible:border-primary focus-visible:ring-0"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {refreshing && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-11 rounded-xl gap-1.5 font-bold relative shrink-0"
              aria-label="Abrir filtros"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold">
                  {activeCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-2xl p-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Temperatura</Label>
              <div className="flex flex-wrap gap-1.5">
                {TEMP_FILTERS.map((t) => (
                  <FilterChip
                    key={t.value}
                    label={t.label}
                    active={filterTemp === t.value}
                    onClick={() => setFilterTemp(t.value)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((s) => (
                  <FilterChip
                    key={s.value}
                    label={s.label}
                    active={filterStatus === s.value}
                    onClick={() => setFilterStatus(s.value)}
                  />
                ))}
              </div>
            </div>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="w-full rounded-xl text-muted-foreground hover:text-secondary"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Limpar filtros
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger
            className="h-11 w-auto rounded-xl bg-card font-bold gap-1.5 px-3 shrink-0"
            aria-label="Ordenar leads"
          >
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <span className="hidden md:inline">{SORT_LABEL[sortBy]}</span>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="score">Maior score</SelectItem>
            <SelectItem value="name">Nome (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(filterTemp !== "all" || filterStatus !== "all") && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filterTemp !== "all" && (
            <ActiveFilterPill
              label={tempLabel}
              onRemove={() => setFilterTemp("all")}
            />
          )}
          {filterStatus !== "all" && (
            <ActiveFilterPill
              label={statusLabel}
              onRemove={() => setFilterStatus("all")}
            />
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground hover:text-secondary px-1"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
      {children}
    </span>
  );
}

function ActiveFilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-primary/20 rounded-full w-3.5 h-3.5 flex items-center justify-center"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border-2 transition-all",
        active
          ? "bg-primary border-primary text-primary-foreground shadow-sm"
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
      className="grid gap-3 pb-4"
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
