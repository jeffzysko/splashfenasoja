import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  ArrowLeft, ChevronLeft, ChevronRight, X,
  Settings2, Loader2, ImageOff, CheckCircle2, Layers, Box,
  SlidersHorizontal, Circle, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/catalogo/")({
  component: CatalogoPage,
  head: () => ({ meta: [{ title: "Catálogo — Splash Admin" }] }),
});

// ── Types ─────────────────────────────────────────────────────────────────────
type Tamanho = {
  label: string;
  comprimento: string;
  largura: string;
  profundidade: string;
  capacidade?: string;
  porcelana_atlas: boolean;
};

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  tamanhos: Tamanho[];
  opcionais: string[];
  fotos: string[];
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
function hasPorcelanaOpcional(opcionais: string[]) {
  return Array.isArray(opcionais) && opcionais.some((o) =>
    typeof o === "string" && o.toLowerCase().includes("porcelana")
  );
}

function hasAcrilico(opcionais: string[]) {
  return Array.isArray(opcionais) && opcionais.some((o) =>
    typeof o === "string" && o.toLowerCase().includes("acr")
  );
}

function hasPorcelanaEmAlgumTamanho(tamanhos: Tamanho[]) {
  return Array.isArray(tamanhos) && tamanhos.some((t) => t.porcelana_atlas);
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
  if (f.porcelana && !hasPorcelanaEmAlgumTamanho(p.tamanhos ?? [])) return false;
  if (f.acrilico && !hasAcrilico(p.opcionais ?? [])) return false;
  if (f.spa && !hasSPA(p.tamanhos ?? [])) return false;
  if (f.prainha && !hasPrainha(p.tamanhos ?? [])) return false;
  return true;
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

// Highlights "Prainha", "SPA" and "Acrílico RETO / L" keywords in tamanho labels
function HighlightedLabel({ label }: { label: string }) {
  if (!label) return null;
  const tokens = label.split(/(Acrílico\s+(?:RETO|L)\b|\bPrainha\b|\bSPA\b)/gi);
  return (
    <>
      {tokens.map((token, i) => {
        if (/^(prainha|spa)$/i.test(token))
          return <span key={i} className="text-sky-300 font-extrabold">{token}</span>;
        if (/^acrílico\s+(reto|l)$/i.test(token))
          return <span key={i} className="text-cyan-300 font-extrabold">{token}</span>;
        return <span key={i}>{token}</span>;
      })}
    </>
  );
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

  const loadProdutos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("produtos")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    setProdutos((data as Produto[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadProdutos(); }, [loadProdutos]);

  const filtered = produtos.filter((p) => matchesFilters(p, filters));
  const nFilters = activeFilterCount(filters);

  const openDetail = (p: Produto) => { setSelected(p); setPhotoIdx(0); };
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
      <div className="pb-4 flex items-center justify-between gap-3 border-b border-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
            <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Catálogo</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Splash Piscinas · {loading ? "…" : `${filtered.length}${nFilters > 0 ? ` de ${produtos.length}` : ""} modelo${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all",
              showFilters || nFilters > 0
                ? "bg-sky-50 border-sky-300 text-sky-700"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
            {nFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center">
                {nFilters}
              </span>
            )}
          </button>
          {isMaster && (
            <Button asChild size="sm" variant="outline" className="font-semibold rounded-xl text-xs">
              <Link to="/admin/catalogo/gerenciar">
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Gerenciar
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} produto={p} onClick={() => openDetail(p)} />
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
function ProductCard({ produto, onClick }: { produto: Produto; onClick: () => void }) {
  const allFotos = Array.isArray(produto.fotos) ? produto.fotos : [];
  // fotos[0] = modelo 3D; fotos[1] = primeira foto real da galeria → capa do card
  const coverUrl = allFotos[1] ?? allFotos[0] ?? null;

  const porcelana = hasPorcelanaEmAlgumTamanho(produto.tamanhos ?? []);
  const acrilico = hasAcrilico(produto.opcionais ?? []);
  const hasOps = porcelana || acrilico;
  const galleryCount = Math.max(0, allFotos.length - 1);
  const tamanhoCount = Array.isArray(produto.tamanhos) ? produto.tamanhos.length : 0;
  const isOval = (produto.formato ?? "retangular") === "oval";

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border border-border text-left transition-all duration-300 hover:border-sky-400/40 hover:shadow-lg hover:shadow-sky-100 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={produto.nome}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
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
      </div>

      {/* Card footer */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-foreground font-extrabold text-sm leading-snug">{produto.nome}</p>
          {tamanhoCount > 0 && (
            <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">
              {tamanhoCount} tamanho{tamanhoCount !== 1 ? "s" : ""} disponíve{tamanhoCount !== 1 ? "is" : "l"}
            </p>
          )}
        </div>

        {hasOps && (
          <div className="flex flex-wrap gap-1">
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
        )}
      </div>
    </button>
  );
}

// ── Product Detail Modal ──────────────────────────────────────────────────────
function ProductDetail({
  produto, photoIdx, onSetPhoto, onPrev, onNext, onClose,
}: {
  produto: Produto;
  photoIdx: number;
  onSetPhoto: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const allFotos = Array.isArray(produto.fotos) ? produto.fotos : [];
  const modeloUrl = allFotos[0] ?? null;
  const galleryFotos = allFotos.slice(1);
  const currentUrl = galleryFotos[photoIdx] ?? null;
  const hasPrev = photoIdx > 0;
  const hasNext = photoIdx < galleryFotos.length - 1;
  const porcelana = hasPorcelanaOpcional(produto.opcionais ?? []);
  const acrilico = hasAcrilico(produto.opcionais ?? []);
  const hasOps = porcelana || acrilico;
  const tamanhos = Array.isArray(produto.tamanhos) ? produto.tamanhos : [];

  // ── Zoom state ──────────────────────────────────────────────────────────
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

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

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/92 backdrop-blur-sm flex flex-col md:flex-row animate-in fade-in duration-200"
      style={{ top: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Photo Gallery Column ─────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col bg-[#00060f] min-h-[55dvh] md:min-h-0">

        {/* Main image */}
        <div
          className={cn(
            "flex-1 relative overflow-hidden",
            currentUrl ? (zoomed ? "cursor-zoom-out" : "cursor-zoom-in") : ""
          )}
          onClick={currentUrl ? handleImgClick : undefined}
          onMouseMove={currentUrl ? handleImgMouseMove : undefined}
        >
          {currentUrl ? (
            <img
              key={currentUrl}
              src={currentUrl}
              alt={`${produto.nome} — foto ${photoIdx + 1}`}
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain select-none animate-in fade-in duration-200"
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

          {/* Zoom hint — shown when not zoomed */}
          {currentUrl && !zoomed && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/55 backdrop-blur-md text-white/55 text-[10px] font-semibold px-3 py-1.5 rounded-full border border-white/[0.12] pointer-events-none select-none">
              <ZoomIn className="w-3 h-3" />
              Clique para ampliar
            </div>
          )}

          {/* Zoom active indicator */}
          {zoomed && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-sky-500/75 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full pointer-events-none select-none shadow-lg shadow-sky-900/30">
              <ZoomOut className="w-3 h-3" />
              ×2.6 · Mova o cursor para explorar · Clique para sair
            </div>
          )}

          {/* Nav arrows — hidden when zoomed */}
          {galleryFotos.length > 1 && !zoomed && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onPrev(); }} disabled={!hasPrev}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center border border-white/10 disabled:opacity-0 hover:bg-black/80 hover:border-white/25 hover:scale-110 transition-all duration-150 z-10">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onNext(); }} disabled={!hasNext}
                aria-label="Próxima foto"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center border border-white/10 disabled:opacity-0 hover:bg-black/80 hover:border-white/25 hover:scale-110 transition-all duration-150 z-10">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {galleryFotos.length > 1 && (
          <div className="shrink-0 px-4 py-3 border-t border-white/[0.07] overflow-x-auto bg-black/25">
            <div className="flex gap-2 w-max mx-auto">
              {galleryFotos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => { onSetPhoto(i); setZoomed(false); }}
                  className={cn(
                    "relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 shrink-0 group/thumb",
                    i === photoIdx
                      ? "border-sky-400 ring-2 ring-sky-400/30 scale-105"
                      : "border-white/10 opacity-50 hover:opacity-95 hover:border-white/35 hover:scale-105"
                  )}>
                  <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-110" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Info Panel ───────────────────────────────────────────────── */}
      <div className="w-full md:w-[360px] md:max-w-[37%] bg-[#00111f] flex flex-col overflow-y-auto border-l border-white/[0.07]">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-white/[0.07] shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-white leading-tight tracking-tight">{produto.nome}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {(produto.formato ?? "retangular") === "oval" ? (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-400/20">
                  Oval
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/10">
                  Retangular
                </span>
              )}
              {galleryFotos.length > 0 && (
                <p className="text-[11px] text-white/30 font-semibold">
                  {photoIdx + 1} / {galleryFotos.length} foto{galleryFotos.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — Modelo 3D → Descrição → Opcionais → Tamanhos */}
        <div className="flex-1 px-5 py-5 space-y-6">

          {/* 1. Modelo 3D */}
          {modeloUrl && (
            <div>
              <SectionLabel>
                <Box className="w-3 h-3 opacity-60" />
                Modelo 3D
              </SectionLabel>
              <div className="mt-2.5 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#000d1a]">
                <img
                  src={modeloUrl}
                  alt={`${produto.nome} — modelo 3D`}
                  className="w-full object-contain max-h-48"
                  onError={(e) => {
                    const wrap = (e.currentTarget as HTMLImageElement).closest("div") as HTMLElement | null;
                    if (wrap) wrap.style.display = "none";
                  }}
                />
              </div>
            </div>
          )}

          {/* 2. Descrição */}
          {produto.descricao && (
            <div>
              <SectionLabel>Descrição</SectionLabel>
              <p className="text-sm text-white/65 leading-relaxed mt-2">{produto.descricao}</p>
            </div>
          )}

          {/* 3. Opcionais */}
          {hasOps && (
            <div>
              <SectionLabel>Opcionais disponíveis</SectionLabel>
              <div className="mt-2.5 space-y-2">
                {porcelana && (
                  <OpcionalCard color="amber" title="Pastilha de Porcelana Atlas"
                    subtitle="Revestimento nas bordas em porcelana" />
                )}
                {acrilico && (
                  <OpcionalCard color="sky" title="Acrílico"
                    subtitle='Acabamento em acrílico reto ou em "L"' />
                )}
              </div>
            </div>
          )}

          {/* 4. Tamanhos */}
          {tamanhos.length > 0 && (
            <div>
              <SectionLabel>
                {tamanhos.length} Tamanho{tamanhos.length !== 1 ? "s" : ""} disponíve{tamanhos.length !== 1 ? "is" : "l"}
              </SectionLabel>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {tamanhos.map((t, i) => {
                  const isSPA      = /\bspa\b/i.test(t.label ?? "");
                  const isPrainha  = /prainha/i.test(t.label ?? "");
                  const isAcrilico = /acrílico/i.test(t.label ?? "");
                  const isOvalShape = (produto.formato ?? "retangular") === "oval";

                  // Parse dims for proportional pool shape
                  const comp = parseFloat((t.comprimento ?? "").replace(",", "."));
                  const larg = parseFloat((t.largura ?? "").replace(",", "."));
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
                          : isAcrilico
                            ? "bg-cyan-500/8 border-cyan-400/20 hover:bg-cyan-500/12 hover:border-cyan-400/35"
                            : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14]"
                    )}>

                      {/* Porcelana badge — top right */}
                      {t.porcelana_atlas && (
                        <span className="absolute top-2.5 right-2.5 text-[7px] font-black uppercase tracking-wider px-1.5 py-[3px] rounded-full bg-amber-500/15 text-amber-300/80 border border-amber-400/20 whitespace-nowrap leading-none">
                          ✦ Porcelana
                        </span>
                      )}

                      {/* Mini pool shape */}
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

                      {/* Label badge */}
                      {t.label && (
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full self-start border leading-none",
                          isSPA
                            ? "bg-violet-500/20 text-violet-300 border-violet-400/25"
                            : isPrainha
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/25"
                              : isAcrilico
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/25"
                                : "bg-white/8 text-white/45 border-white/10"
                        )}>
                          <HighlightedLabel label={t.label} />
                        </span>
                      )}

                      {/* Dimensions */}
                      <div>
                        <p className="text-white font-black text-base leading-none tracking-tight">
                          {t.comprimento}
                        </p>
                        <p className="text-white/40 text-[11px] font-medium mt-1 tracking-wide">
                          {t.largura} × {t.profundidade}
                        </p>
                        {t.capacidade && (
                          <p className="text-sky-400/60 text-[10px] font-semibold mt-0.5">{t.capacidade}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Legenda se houver mix */}
              {tamanhos.some(t => t.porcelana_atlas) && tamanhos.some(t => !t.porcelana_atlas) && (
                <p className="text-[10px] text-white/25 mt-3 font-semibold">
                  * Tamanhos com <span className="text-amber-400/60">✦ Porcelana</span> aceitam Pastilha de Porcelana Atlas
                </p>
              )}
            </div>
          )}
        </div>

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
