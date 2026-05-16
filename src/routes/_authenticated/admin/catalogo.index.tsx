import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  ArrowLeft, ChevronLeft, ChevronRight, X,
  Settings2, Loader2, ImageOff, CheckCircle2, Layers, Box,
  SlidersHorizontal, Circle, ZoomIn, ZoomOut,
  Share2, Copy, Check, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { thumbUrl, makeImgErrorHandler } from "@/lib/imageUtils";

export const Route = createFileRoute("/_authenticated/admin/catalogo/")({
  component: CatalogoPage,
  head: () => ({ meta: [{ title: "Catálogo — Splash Admin" }] }),
});

// ── Types ─────────────────────────────────────────────────────────────────────
type TamanhoOpcionais = { porcelana_atlas?: boolean; acrilico?: boolean };
type Tamanho = {
  label: string;
  comprimento: string;
  largura: string;
  profundidade: string;
  capacidade?: string;
  porcelana_atlas?: boolean; // legacy
  opcionais?: TamanhoOpcionais; // novo
  modelos?: string[];
};

type Modelo3D = { url: string; label: string; path?: string };

type OpcionaisObj = { porcelana_atlas?: boolean; acrilico?: boolean };

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  tamanhos: Tamanho[];
  opcionais: OpcionaisObj | string[]; // legacy supports array
  fotos: string[];
  modelos_3d: Modelo3D[];
  ativo: boolean;
  ordem: number;
  formato: string; // "retangular" | "oval"
};

// ── Filter state ──────────────────────────────────────────────────────────────
type Filters = {
  formato: "todos" | "retangular" | "oval";
  porcelana: boolean;
  acrilico: boolean;
  spa: boolean;
  prainha: boolean;
};

const DEFAULT_FILTERS: Filters = {
  formato: "todos",
  porcelana: false,
  acrilico: false,
  spa: false,
  prainha: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function hasPorcelanaOpcional(opcionais: OpcionaisObj | string[] | null | undefined) {
  if (!opcionais) return false;
  if (Array.isArray(opcionais)) {
    return opcionais.some((o) => typeof o === "string" && o.toLowerCase().includes("porcelana"));
  }
  return !!opcionais.porcelana_atlas;
}

function hasAcrilico(opcionais: OpcionaisObj | string[] | null | undefined) {
  if (!opcionais) return false;
  if (Array.isArray(opcionais)) {
    return opcionais.some((o) => typeof o === "string" && o.toLowerCase().includes("acr"));
  }
  return !!opcionais.acrilico;
}

// Opcionais aceitos por TAMANHO (com fallback ao formato legado)
function tamanhoAceitaPorcelana(t: Tamanho): boolean {
  if (t.opcionais && typeof t.opcionais.porcelana_atlas === "boolean") return !!t.opcionais.porcelana_atlas;
  return !!t.porcelana_atlas; // legado
}
function tamanhoAceitaAcrilico(t: Tamanho): boolean {
  return !!t.opcionais?.acrilico;
}

function hasSPA(tamanhos: Tamanho[]) {
  return Array.isArray(tamanhos) && tamanhos.some((t) =>
    /\bspa\b/i.test(t.label ?? "")
  );
}

function hasPrainha(tamanhos: Tamanho[]) {
  return Array.isArray(tamanhos) && tamanhos.some((t) =>
    /prainha/i.test(t.label ?? "")
  );
}

function matchesFilters(p: Produto, f: Filters): boolean {
  if (f.formato !== "todos" && (p.formato ?? "retangular") !== f.formato) return false;
  if (f.porcelana && !hasPorcelanaOpcional(p.opcionais)) return false;
  if (f.acrilico && !hasAcrilico(p.opcionais)) return false;
  if (f.spa && !hasSPA(p.tamanhos ?? [])) return false;
  if (f.prainha && !hasPrainha(p.tamanhos ?? [])) return false;
  return true;
}

// Filter tamanhos by selected 3D model using explicit vinculação (`tamanho.modelos`).
// Quando nenhum tamanho tem vinculação, todos aparecem em todas as variações.
function tamanhosForModelo(tamanhos: Tamanho[], modelo: Modelo3D | null | undefined): Tamanho[] {
  if (!modelo) return tamanhos;
  const hasExplicit = tamanhos.some((t) => Array.isArray(t.modelos) && t.modelos.length > 0);
  if (!hasExplicit) return tamanhos;
  const modeloId = modelo.path ?? modelo.url;
  return tamanhos.filter((t) => !Array.isArray(t.modelos) || t.modelos.length === 0 || t.modelos.includes(modeloId));
}

function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.formato !== "todos") n++;
  if (f.porcelana) n++;
  if (f.acrilico) n++;
  if (f.spa) n++;
  if (f.prainha) n++;
  return n;
}

// Highlights "Prainha", "SPA", "Acrílico RETO" and "Acrílico L" in tamanho labels
function HighlightedLabel({ label }: { label: string }) {
  if (!label) return null;
  const tokens = label.split(/(Acrílico\s+RETO\b|Acrílico\s+L\b|\bPrainha\b|\bSPA\b)/gi);
  return (
    <>
      {tokens.map((token, i) => {
        if (/^(prainha|spa)$/i.test(token))
          return <span key={i} className="text-sky-300 font-extrabold">{token}</span>;
        if (/^acrílico\s+reto$/i.test(token))
          return <span key={i} className="text-cyan-300 font-extrabold">{token}</span>;
        if (/^acrílico\s+l$/i.test(token))
          return <span key={i} className="text-teal-300 font-extrabold">{token}</span>;
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}

// ── Pool shape preview dims helper ───────────────────────────────────────────
function poolPreviewDims(t: Tamanho, base = 26) {
  const comp = parseFloat((t.comprimento ?? "").replace(",", "."));
  const larg = parseFloat((t.largura ?? "").replace(",", "."));
  const ratio = comp && larg ? comp / larg : 1.6;
  const w = Math.round(Math.min(58, Math.max(20, base * ratio)));
  const h = Math.round(Math.min(26, Math.max(9, w / ratio)));
  return { w, h };
}

// ── Share URL helper ──────────────────────────────────────────────────────────
function buildShareUrl(nome: string) {
  const slug = nome
    .toLowerCase()
    .replace(/^splash\s+/i, "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
  return `https://splashpiscinas.com/piscinas/${slug}`;
}

// ── Catalog Page ──────────────────────────────────────────────────────────────
function CatalogoPage() {
  const { user } = useSupabaseAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);
  const [selected, setSelected] = useState<Produto | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [cardOrigin, setCardOrigin] = useState({ x: 50, y: 50 });

  // Master check
  useEffect(() => {
    if (!user?.id) return;
    const key = `is_master_${user.id}`;
    try {
      if (sessionStorage.getItem(key) === "1") { setIsMaster(true); return; }
    } catch { /**/ }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      const isM = !!data?.some((r) => r.role === "master");
      setIsMaster(isM);
      try { sessionStorage.setItem(key, isM ? "1" : "0"); } catch { /**/ }
    });
  }, [user?.id]);

  const PRODUTOS_CACHE_KEY = "catalogo_produtos_v1";
  const PRODUTOS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  const loadProdutos = useCallback(async () => {
    // Cache rápido via sessionStorage — evita re-fetch toda vez que admin visita catálogo
    try {
      const raw = sessionStorage.getItem(PRODUTOS_CACHE_KEY);
      if (raw) {
        const { ts, produtos: cached } = JSON.parse(raw) as { ts: number; produtos: Produto[] };
        if (Date.now() - ts < PRODUTOS_CACHE_TTL) {
          setProdutos(cached);
          setLoading(false);
          return; // dados frescos do cache — sem request ao Supabase
        }
      }
    } catch { /**/ }

    setLoading(true);
    const { data } = await supabase
      .from("produtos")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    const lista = (data as unknown as Produto[]) ?? [];
    setProdutos(lista);
    setLoading(false);

    // Persiste no sessionStorage para próximas visitas na mesma sessão
    try {
      sessionStorage.setItem(PRODUTOS_CACHE_KEY, JSON.stringify({ ts: Date.now(), produtos: lista }));
    } catch { /**/ }
  }, []);

  useEffect(() => { loadProdutos(); }, [loadProdutos]);

  const filtered = produtos.filter((p) => matchesFilters(p, filters));
  const nFilters = activeFilterCount(filters);

  const openDetail = (p: Produto, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCardOrigin({
      x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
      y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
    });
    setSelected(p);
    setPhotoIdx(0);
  };
  const closeDetail = () => setSelected(null);

  const prevPhoto = () => setPhotoIdx((i) => Math.max(0, i - 1));
  const nextPhoto = () => {
    const galleryLen = Math.max(0, (selected?.fotos.length ?? 1) - 1);
    setPhotoIdx((i) => Math.min(galleryLen - 1, i + 1));
  };

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, photoIdx]);

  const toggleFilter = (key: keyof Filters, value?: string) => {
    setFilters((prev) => {
      if (key === "formato") {
        return { ...prev, formato: prev.formato === value ? "todos" : value as Filters["formato"] };
      }
      return { ...prev, [key]: !prev[key as keyof Omit<Filters, "formato">] };
    });
  };

  return (
    <div className="animate-in fade-in duration-300">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="pb-4 flex items-center justify-between gap-2 border-b border-border/50">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0 h-9 w-9 sm:h-10 sm:w-10">
            <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">Catálogo</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">
              Splash · {loading ? "…" : `${filtered.length}${nFilters > 0 ? `/${produtos.length}` : ""} modelo${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filtros"
            className={cn(
              "flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-bold transition-all",
              showFilters || nFilters > 0
                ? "bg-sky-50 border-sky-300 text-sky-700"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {nFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center">
                {nFilters}
              </span>
            )}
          </button>
          {isMaster && (
            <Button asChild size="sm" variant="outline" className="font-semibold rounded-xl text-xs h-9 px-2.5 sm:px-3" aria-label="Gerenciar catálogo">
              <Link to="/admin/catalogo/gerenciar">
                <Settings2 className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Gerenciar</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Filter Panel ──────────────────────────────────────────────── */}
      {showFilters && (
        <div className="py-4 border-b border-border/50 bg-muted/30 -mx-4 px-4 sm:-mx-6 sm:px-6 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-3">
            {/* Formato */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Formato</p>
              <div className="flex flex-wrap gap-2">
                {(["retangular", "oval"] as const).map((fmt) => (
                  <FilterPill
                    key={fmt}
                    active={filters.formato === fmt}
                    onClick={() => toggleFilter("formato", fmt)}
                    label={fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                  />
                ))}
              </div>
            </div>
            {/* Opcionais / características */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Características</p>
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  active={filters.porcelana}
                  onClick={() => toggleFilter("porcelana")}
                  label="Porcelana Atlas"
                  color="amber"
                />
                <FilterPill
                  active={filters.acrilico}
                  onClick={() => toggleFilter("acrilico")}
                  label="Acrílico"
                  color="sky"
                />
                <FilterPill
                  active={filters.spa}
                  onClick={() => toggleFilter("spa")}
                  label="Com SPA"
                  color="violet"
                />
                <FilterPill
                  active={filters.prainha}
                  onClick={() => toggleFilter("prainha")}
                  label="Com Prainha"
                  color="emerald"
                />
              </div>
            </div>
            {/* Limpar */}
            {nFilters > 0 && (
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition mt-1"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-9 h-9 animate-spin text-sky-500/60" />
            <p className="text-muted-foreground text-xs font-semibold tracking-wider">Carregando catálogo…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-muted-foreground">
          <ImageOff className="w-16 h-16 opacity-30" />
          <p className="text-base font-bold">
            {nFilters > 0 ? "Nenhum modelo com esses filtros" : "Nenhum produto cadastrado"}
          </p>
          {nFilters > 0 && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-sm font-bold text-sky-600 hover:text-sky-700 transition mt-1"
            >
              Limpar filtros
            </button>
          )}
          {nFilters === 0 && isMaster && (
            <Button asChild variant="outline" className="mt-2 text-sm">
              <Link to="/admin/catalogo/gerenciar">Adicionar primeiro produto</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="py-6 pb-24 sm:pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} produto={p} onClick={(e) => openDetail(p, e)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────── */}
      {selected && (
        <ProductDetail
          produto={selected}
          photoIdx={photoIdx}
          onSetPhoto={setPhotoIdx}
          onPrev={prevPhoto}
          onNext={nextPhoto}
          onClose={closeDetail}
          cardOrigin={cardOrigin}
        />
      )}
    </div>
  );
}

// ── Filter Pill ───────────────────────────────────────────────────────────────
function FilterPill({
  active, onClick, label,
  color = "default",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: "default" | "amber" | "sky" | "violet" | "emerald";
}) {
  const colors = {
    default: active
      ? "bg-foreground/10 border-foreground/30 text-foreground"
      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
    amber: active
      ? "bg-amber-100 border-amber-300 text-amber-700"
      : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-700",
    sky: active
      ? "bg-sky-100 border-sky-300 text-sky-700"
      : "border-border text-muted-foreground hover:border-sky-300 hover:text-sky-700",
    violet: active
      ? "bg-violet-100 border-violet-300 text-violet-700"
      : "border-border text-muted-foreground hover:border-violet-300 hover:text-violet-700",
    emerald: active
      ? "bg-emerald-100 border-emerald-300 text-emerald-700"
      : "border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-700",
  }[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
        colors
      )}
    >
      {active && <CheckCircle2 className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ produto, onClick }: {
  produto: Produto;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const allFotos = Array.isArray(produto.fotos) ? produto.fotos : [];
  const modelos3d = Array.isArray(produto.modelos_3d) ? produto.modelos_3d : [];
  const coverUrl = allFotos[1] ?? modelos3d[0]?.url ?? allFotos[0] ?? null;
  const porcelana = hasPorcelanaOpcional(produto.opcionais);
  const acrilico = hasAcrilico(produto.opcionais ?? []);
  const galleryCount = Math.max(0, allFotos.length - 1);
  const tamanhoCount = Array.isArray(produto.tamanhos) ? produto.tamanhos.length : 0;
  const isOval = (produto.formato ?? "retangular") === "oval";
  const tamanhos = Array.isArray(produto.tamanhos) ? produto.tamanhos : [];
  const firstT = tamanhos[0] ?? null;
  const preview = firstT ? poolPreviewDims(firstT) : null;

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border border-border text-left transition-all duration-300 hover:border-sky-400/40 hover:shadow-lg hover:shadow-sky-100 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
    >
      {/* Photo */}
      <div className="relative h-40 sm:h-44 overflow-hidden bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl ?? undefined}
            alt={produto.nome}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isOval && (
            <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-violet-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-violet-400/20">
              <Circle className="w-2.5 h-2.5" />
              Oval
            </span>
          )}
        </div>
        {galleryCount > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white/60 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
            <Layers className="w-3 h-3" />
            {galleryCount}
          </div>
        )}

        {/* Hover overlay — pool shape preview */}
        {preview && firstT && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-[#00111f]/96 backdrop-blur-sm px-3 py-2.5 flex items-center gap-2.5">
            <div
              style={{ width: preview.w, height: preview.h }}
              className={cn(
                "shrink-0 border-2 border-sky-400/50 bg-sky-400/10",
                isOval ? "rounded-full" : "rounded-[2px]"
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-white font-black text-[11px] leading-none">{firstT.comprimento} × {firstT.largura}</p>
              <p className="text-white/40 text-[9px] mt-1 font-semibold uppercase tracking-wide">a partir de</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-sky-400/60 shrink-0" />
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="min-h-[2.5rem]">
          <p className="text-foreground font-extrabold text-sm leading-snug line-clamp-2">{produto.nome}</p>
          {tamanhoCount > 0 && (
            <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">
              {tamanhoCount} tamanho{tamanhoCount !== 1 ? "s" : ""} disponíve{tamanhoCount !== 1 ? "is" : "l"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-auto min-h-[1.25rem]">
          {porcelana && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              Porcelana Atlas
            </span>
          )}
          {acrilico && (
            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
              Acrílico
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Product Detail Modal ──────────────────────────────────────────────────────
function ProductDetail({
  produto, photoIdx, onSetPhoto, onPrev, onNext, onClose, cardOrigin,
}: {
  produto: Produto;
  photoIdx: number;
  onSetPhoto: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  cardOrigin: { x: number; y: number };
}) {
  const allFotos = Array.isArray(produto.fotos) ? produto.fotos : [];
  const modelos3d: Modelo3D[] = Array.isArray(produto.modelos_3d) && produto.modelos_3d.length > 0
    ? produto.modelos_3d
    : (allFotos[0] ? [{ url: allFotos[0], label: "" }] : []);
  const galleryFotos = allFotos.slice(1);
  const currentUrl = galleryFotos[photoIdx] ?? null;
  const hasPrev = photoIdx > 0;
  const hasNext = photoIdx < galleryFotos.length - 1;
  const porcelana = hasPorcelanaOpcional(produto.opcionais ?? []);
  const acrilico = hasAcrilico(produto.opcionais ?? []);
  const hasOps = porcelana || acrilico;
  const tamanhos = Array.isArray(produto.tamanhos) ? produto.tamanhos : [];

  // ── Modelo 3D carousel state ────────────────────────────────────────────
  const [modeloIdx, setModeloIdx] = useState(0);
  useEffect(() => { setModeloIdx(0); }, [produto.id]);
  const safeModeloIdx = Math.min(modeloIdx, Math.max(0, modelos3d.length - 1));
  const currentModelo = modelos3d[safeModeloIdx] ?? null;

  // ── Zoom state ──────────────────────────────────────────────────────────
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  // ── Share state ──────────────────────────────────────────────────────────
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = buildShareUrl(produto.nome);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(shareUrl)}&size=180x180&margin=1&bgcolor=00111f&color=e2e8f0&format=png`;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch { /**/ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: produto.nome, url: shareUrl }).catch(() => {/**/ });
    }
  };

  // ── Touch / swipe state ──────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || zoomed) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs((touchStartY.current ?? 0) - e.changedTouches[0].clientY);
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > 45 && Math.abs(dx) > dy * 1.5) {
      dx > 0 ? onNext() : onPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    setZoomed(false);
    setZoomOrigin({ x: 50, y: 50 });
  }, [photoIdx]);

  const handleImgClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (zoomed) {
      setZoomed(false);
      setZoomOrigin({ x: 50, y: 50 });
    } else {
      setZoomOrigin({ x, y });
      setZoomed(true);
    }
  };

  const handleImgMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  // ── Tamanho card renderer (shared desktop + mobile) ──────────────────────
  const renderTamanhoCard = (t: Tamanho, i: number) => {
    const isSPA          = /\bspa\b/i.test(t.label ?? "");
    const isPrainha      = /prainha/i.test(t.label ?? "");
    const isAcrelicoReto = /acrílico\s+reto/i.test(t.label ?? "");
    const isAcrelicoL    = /acrílico\s+l\b/i.test(t.label ?? "");
    const isOvalShape    = (produto.formato ?? "retangular") === "oval";
    const comp  = parseFloat((t.comprimento ?? "").replace(",", "."));
    const larg  = parseFloat((t.largura ?? "").replace(",", "."));
    const ratio = comp && larg ? comp / larg : 1.6;
    const poolW = Math.round(Math.min(60, Math.max(22, 28 * ratio)));
    const poolH = Math.round(Math.min(28, Math.max(10, poolW / ratio)));
    return (
      <div key={i} className={cn(
        "relative flex flex-col gap-2.5 rounded-2xl p-3.5 border transition-all duration-200 group overflow-hidden",
        isSPA
          ? "bg-violet-500/8 border-violet-400/20 hover:bg-violet-500/12 hover:border-violet-400/35"
          : isPrainha
            ? "bg-emerald-500/8 border-emerald-400/20 hover:bg-emerald-500/12 hover:border-emerald-400/35"
            : isAcrelicoReto
              ? "bg-cyan-500/8 border-cyan-400/20 hover:bg-cyan-500/12 hover:border-cyan-400/35"
              : isAcrelicoL
                ? "bg-teal-500/8 border-teal-400/20 hover:bg-teal-500/12 hover:border-teal-400/35"
                : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14]"
      )}>
        {(tamanhoAceitaPorcelana(t) || tamanhoAceitaAcrilico(t)) && (
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
            {tamanhoAceitaPorcelana(t) && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-[3px] rounded-full bg-amber-500/15 text-amber-300/80 border border-amber-400/20 whitespace-nowrap leading-none">
                ✦ Porcelana
              </span>
            )}
            {tamanhoAceitaAcrilico(t) && (
              <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-[3px] rounded-full bg-cyan-500/15 text-cyan-300/80 border border-cyan-400/20 whitespace-nowrap leading-none">
                ✦ Acrílico
              </span>
            )}
          </div>
        )}
        <div className="h-7 flex items-center">
          <div
            style={{ width: poolW, height: poolH }}
            className={cn(
              "border-2 border-sky-400/35 bg-sky-400/10 transition-all duration-200",
              "group-hover:border-sky-400/60 group-hover:bg-sky-400/18",
              isOvalShape ? "rounded-full" : "rounded-[3px]"
            )}
          />
        </div>
        {t.label && (
          <span className={cn(
            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full self-start border leading-none",
            isSPA
              ? "bg-violet-500/20 text-violet-300 border-violet-400/25"
              : isPrainha
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/25"
                : isAcrelicoReto
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/25"
                  : isAcrelicoL
                    ? "bg-teal-500/20 text-teal-300 border-teal-400/25"
                    : "bg-white/8 text-white/45 border-white/10"
          )}>
            <HighlightedLabel label={t.label} />
          </span>
        )}
        <div>
          <p className="text-white font-black text-base leading-none tracking-tight">{t.comprimento}</p>
          <p className="text-white/40 text-[11px] font-medium mt-1 tracking-wide">{t.largura} × {t.profundidade}</p>
          {t.capacidade && <p className="text-sky-400/60 text-[10px] font-semibold mt-0.5">{t.capacidade}</p>}
        </div>
      </div>
    );
  };

  // ── Shared info body (desktop panel + mobile sheet expanded) ──────────────
  const infoBody = (
    <div className="flex-1 px-4 sm:px-5 py-4 sm:py-5 pb-safe space-y-5 sm:space-y-6">
      {modelos3d.length > 0 && currentModelo && (
        <div>
          <SectionLabel>
            <Box className="w-3 h-3 opacity-60" />
            {modelos3d.length > 1 ? `Modelos 3D · ${safeModeloIdx + 1}/${modelos3d.length}` : "Modelo 3D"}
          </SectionLabel>
          <div className="mt-2.5 relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#000d1a]">
            <img
              key={currentModelo.url}
              src={currentModelo.url}
              alt={`${produto.nome}${currentModelo.label ? " — " + currentModelo.label : ""} — modelo 3D`}
              className="w-full object-contain max-h-48"
              onError={(e) => {
                const wrap = (e.currentTarget as HTMLImageElement).closest("div") as HTMLElement | null;
                if (wrap) wrap.style.display = "none";
              }}
            />
            {modelos3d.length > 1 && (
              <>
                <button
                  onClick={() => setModeloIdx((i) => (i - 1 + modelos3d.length) % modelos3d.length)}
                  aria-label="Modelo anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/80 border border-white/10 flex items-center justify-center transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setModeloIdx((i) => (i + 1) % modelos3d.length)}
                  aria-label="Próximo modelo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/80 border border-white/10 flex items-center justify-center transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {currentModelo.label && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/10 whitespace-nowrap">
                    {currentModelo.label}
                  </div>
                )}
              </>
            )}
          </div>
          {modelos3d.length > 1 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {modelos3d.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setModeloIdx(i)}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition",
                    i === safeModeloIdx
                      ? "bg-sky-500/20 text-sky-200 border-sky-400/40"
                      : "bg-white/[0.04] text-white/45 border-white/10 hover:text-white/70 hover:border-white/25"
                  )}
                >
                  {m.label || `Variação ${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {produto.descricao && (
        <div>
          <SectionLabel>Descrição</SectionLabel>
          <p className="text-sm text-white/65 leading-relaxed mt-2">{produto.descricao}</p>
        </div>
      )}
      {hasOps && (
        <div>
          <SectionLabel>Opcionais disponíveis</SectionLabel>
          <div className="mt-2.5 space-y-2">
            {porcelana && <OpcionalCard color="amber" title="Pastilha de Porcelana Atlas" subtitle="Revestimento nas bordas em porcelana" />}
            {acrilico  && <OpcionalCard color="sky"   title="Acrílico" subtitle='Acabamento em acrílico reto ou em "L"' />}
          </div>
        </div>
      )}
      {(() => {
        const filteredTamanhos = modelos3d.length > 1 && currentModelo
          ? tamanhosForModelo(tamanhos, currentModelo)
          : tamanhos;
        const isFiltered = modelos3d.length > 1 && filteredTamanhos.length !== tamanhos.length;
        if (filteredTamanhos.length === 0 && tamanhos.length === 0) return null;
        return (
          <div>
            <SectionLabel>
              {filteredTamanhos.length} Tamanho{filteredTamanhos.length !== 1 ? "s" : ""} disponíve{filteredTamanhos.length !== 1 ? "is" : "l"}
              {isFiltered && currentModelo?.label ? ` · ${currentModelo.label}` : ""}
            </SectionLabel>
            {filteredTamanhos.length === 0 ? (
              <p className="text-xs text-white/40 mt-3">Nenhum tamanho cadastrado para esta variação.</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                {filteredTamanhos.map(renderTamanhoCard)}
              </div>
            )}
            {(filteredTamanhos.some(tamanhoAceitaPorcelana) || filteredTamanhos.some(tamanhoAceitaAcrilico)) && (
              <div className="mt-3 space-y-1">
                {filteredTamanhos.some(tamanhoAceitaPorcelana) && (
                  <p className="text-[10px] text-white/25 font-semibold">
                    * Tamanhos com <span className="text-amber-400/60">✦ Porcelana</span> aceitam Pastilha de Porcelana Atlas
                  </p>
                )}
                {filteredTamanhos.some(tamanhoAceitaAcrilico) && (
                  <p className="text-[10px] text-white/25 font-semibold">
                    * Tamanhos com <span className="text-cyan-400/60">✦ Acrílico</span> aceitam acabamento em acrílico
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );

  // ── Thumbnail strip ───────────────────────────────────────────────────────
  const thumbStrip = (extraClass = "") => galleryFotos.length > 1 ? (
    <div className={cn("shrink-0 overflow-x-auto px-3 sm:px-4 py-2.5 sm:py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", extraClass)}>
      <div className="flex gap-2 w-max mx-auto">
        {galleryFotos.map((url, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onSetPhoto(i); setZoomed(false); }}
            aria-label={`Foto ${i + 1}`}
            className={cn(
              "relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 shrink-0 group/thumb",
              i === photoIdx
                ? "border-sky-400 ring-2 ring-sky-400/30 scale-105"
                : "border-white/10 opacity-50 hover:opacity-95 hover:border-white/35 hover:scale-105"
            )}>
            <img src={thumbUrl(url, 120, 60) ?? url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-110" loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#00060f] animate-in fade-in zoom-in-95 duration-300 flex flex-col lg:flex-row"
      style={{ top: 0, transformOrigin: `${cardOrigin.x}% ${cardOrigin.y}%` }}
    >

      {/* ── Photo area ── fixed height on mobile / flex-1 on desktop ────── */}
      <div className={cn(
        "relative flex flex-col bg-[#00060f]",
        "h-45dvh shrink-0",               // mobile/tablet: fixed top slice
        "lg:h-auto lg:flex-1 lg:min-w-0"   // desktop: fills remaining width
      )}>

        {/* Main image */}
        <div
          className={cn(
            "flex-1 relative overflow-hidden",
            currentUrl ? (zoomed ? "cursor-zoom-out" : "cursor-zoom-in") : ""
          )}
          onClick={currentUrl ? handleImgClick : undefined}
          onMouseMove={currentUrl ? handleImgMouseMove : undefined}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentUrl ? (
            <img
              key={currentUrl}
              src={thumbUrl(currentUrl, 1200, 85) ?? currentUrl}
              alt={`${produto.nome} — foto ${photoIdx + 1}`}
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain select-none"
              onError={makeImgErrorHandler(currentUrl)}
              style={{
                transform: zoomed ? "scale(2.6)" : "scale(1)",
                transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                transition: zoomed
                  ? "transform-origin 0s, transform 0.18s cubic-bezier(0.4,0,0.2,1)"
                  : "transform 0.22s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          ) : galleryFotos.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/20">
              <ImageOff className="w-20 h-20" />
              <p className="text-sm font-semibold">Sem fotos na galeria</p>
            </div>
          ) : null}

          {/* Zoom hint — somente desktop (touch já dá pinch nativo) */}
          {currentUrl && !zoomed && (
            <div className="hidden lg:flex absolute bottom-3 left-1/2 -translate-x-1/2 items-center gap-1.5 bg-black/55 backdrop-blur-md text-white/55 text-[10px] font-semibold px-3 py-1.5 rounded-full border border-white/[0.12] pointer-events-none select-none">
              <ZoomIn className="w-3 h-3" />
              Clique para ampliar
            </div>
          )}

          {/* Zoom active indicator */}
          {zoomed && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-sky-500/75 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full pointer-events-none select-none shadow-lg shadow-sky-900/30">
              <ZoomOut className="w-3 h-3" />
              <span className="hidden sm:inline">×2.6 · Mova o cursor · Clique para sair</span>
              <span className="sm:hidden">×2.6 · Toque para sair</span>
            </div>
          )}

          {/* Nav arrows — hidden when zoomed */}
          {galleryFotos.length > 1 && !zoomed && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onPrev(); }} disabled={!hasPrev}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center border border-white/10 disabled:opacity-0 hover:bg-black/80 hover:border-white/25 hover:scale-110 transition-all duration-150 z-10">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onNext(); }} disabled={!hasNext}
                aria-label="Próxima foto"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center border border-white/10 disabled:opacity-0 hover:bg-black/80 hover:border-white/25 hover:scale-110 transition-all duration-150 z-10">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip — desktop only */}
        {thumbStrip("hidden lg:block border-t border-white/[0.07] bg-black/25")}
      </div>

      {/* ── Info panel ── scrollable on mobile / fixed column on desktop ─── */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[#00111f] flex flex-col border-t border-white/[0.07] lg:border-t-0 lg:border-l lg:flex-none lg:w-[380px] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">

        {/* Header — sticky no mobile/tablet para manter Fechar/Compartilhar acessível */}
        <div className="sticky top-0 z-20 lg:static flex items-start justify-between gap-3 px-4 sm:px-5 pt-3 sm:pt-4 pb-3 border-b border-white/[0.07] shrink-0 bg-[#00111f]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#00111f]/80">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-white leading-tight tracking-tight truncate">{produto.nome}</h2>
            <div className="flex items-center gap-2 mt-1 sm:mt-1.5 flex-wrap">
              {(produto.formato ?? "retangular") === "oval" ? (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-400/20">Oval</span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/10">Retangular</span>
              )}
              {galleryFotos.length > 0 && (
                <p className="text-[11px] text-white/30 font-semibold">{photoIdx + 1} / {galleryFotos.length} foto{galleryFotos.length !== 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <button onClick={() => setShowShare(true)} aria-label="Compartilhar"
              className="w-10 h-10 sm:w-9 sm:h-9 lg:w-8 lg:h-8 rounded-full bg-white/8 hover:bg-sky-500/20 active:bg-sky-500/30 text-white/60 hover:text-sky-300 flex items-center justify-center transition">
              <Share2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            </button>
            <button onClick={onClose} aria-label="Fechar"
              className="w-10 h-10 sm:w-9 sm:h-9 lg:w-8 lg:h-8 rounded-full bg-white/8 hover:bg-white/15 active:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition">
              <X className="w-4.5 h-4.5 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>

        {/* Thumbnail strip — mobile only (inside scrollable info) */}
        {thumbStrip("lg:hidden border-b border-white/[0.06] bg-black/15")}

        {/* Body */}
        {infoBody}

        {/* ── Share / QR Panel ── */}
        {showShare && (
          <div className="absolute inset-0 z-20 bg-[#00111f] flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.07] shrink-0">
              <p className="text-white font-extrabold text-sm">Compartilhar modelo</p>
              <button onClick={() => setShowShare(false)} aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR + info */}
            <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-6">
              <p className="text-white/50 text-xs font-semibold text-center">
                Escaneie para ver <span className="text-white font-bold">{produto.nome}</span> no site Splash
              </p>

              {/* QR Code */}
              <div className="rounded-2xl overflow-hidden border border-white/10 p-3 bg-[#060f1a]">
                <img
                  src={qrSrc}
                  alt={`QR Code — ${produto.nome}`}
                  className="w-44 h-44 block"
                  loading="lazy"
                />
              </div>

              {/* URL row */}
              <div className="w-full flex gap-2 items-center">
                <div className="flex-1 flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 min-w-0">
                  <Link2 className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <p className="text-white/50 text-[11px] font-medium truncate">{shareUrl}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition border",
                    copied
                      ? "bg-emerald-500/15 border-emerald-400/25 text-emerald-400"
                      : "bg-white/[0.06] border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                  )}
                  aria-label="Copiar link"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Native share (mobile) */}
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 bg-sky-500/15 border border-sky-400/25 text-sky-300 font-bold text-sm rounded-2xl py-3 hover:bg-sky-500/25 transition"
                >
                  <Share2 className="w-4 h-4" />
                  Compartilhar via…
                </button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
      {children}
    </p>
  );
}

function OpcionalCard({ color, title, subtitle }: {
  color: "amber" | "sky"; title: string; subtitle: string;
}) {
  const s = {
    amber: { wrap: "bg-amber-500/8 border-amber-400/15", icon: "bg-amber-400/15", svg: "text-amber-400", title: "text-amber-200", sub: "text-amber-400/55" },
    sky: { wrap: "bg-sky-500/8 border-sky-400/15", icon: "bg-sky-400/15", svg: "text-sky-400", title: "text-sky-200", sub: "text-sky-400/55" },
  }[color];
  return (
    <div className={cn("flex items-center gap-3 border rounded-xl p-3.5", s.wrap)}>
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", s.icon)}>
        <CheckCircle2 className={cn("w-4.5 h-4.5", s.svg)} />
      </div>
      <div>
        <p className={cn("font-extrabold text-sm", s.title)}>{title}</p>
        <p className={cn("text-[11px] font-semibold mt-0.5", s.sub)}>{subtitle}</p>
      </div>
    </div>
  );
}
