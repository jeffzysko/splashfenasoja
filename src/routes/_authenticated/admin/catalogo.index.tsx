import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  ArrowLeft, ChevronLeft, ChevronRight, X,
  Settings2, Loader2, ImageOff, CheckCircle2, Layers, Box,
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
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function hasPorcelana(opcionais: string[]) {
  return Array.isArray(opcionais) && opcionais.some((o) =>
    typeof o === "string" && o.toLowerCase().includes("porcelana")
  );
}

function hasAcrilico(opcionais: string[]) {
  return Array.isArray(opcionais) && opcionais.some((o) =>
    typeof o === "string" && o.toLowerCase().includes("acr")
  );
}

function dimensaoLabel(t: Tamanho) {
  const parts: string[] = [];
  if (t.comprimento) parts.push(t.comprimento);
  if (t.largura) parts.push(t.largura);
  if (t.profundidade) parts.push(t.profundidade);
  const dims = parts.join(" × ");
  return t.label ? `${t.label} — ${dims}` : dims;
}

// Highlights "Prainha" and "SPA" keywords in tamanho label text
function HighlightedLabel({ label }: { label: string }) {
  if (!label) return null;
  const tokens = label.split(/(\bPrainha\b|\bSPA\b)/gi);
  return (
    <>
      {tokens.map((token, i) =>
        /^(prainha|spa)$/i.test(token) ? (
          <span key={i} className="text-sky-300 font-extrabold">{token}</span>
        ) : (
          <span key={i}>{token}</span>
        )
      )}
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

  const openDetail = (p: Produto) => { setSelected(p); setPhotoIdx(0); };
  const closeDetail = () => setSelected(null);

  // Gallery = fotos.slice(1); photoIdx is relative to gallery
  const prevPhoto = () => setPhotoIdx((i) => Math.max(0, i - 1));
  const nextPhoto = () => {
    const galleryLen = Math.max(0, (selected?.fotos.length ?? 1) - 1);
    setPhotoIdx((i) => Math.min(galleryLen - 1, i + 1));
  };

  // Keyboard navigation inside modal
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

  return (
    <div className="-mx-4 -my-5 sm:-my-6 min-h-[calc(100dvh-3.5rem)] bg-[#00111f] animate-in fade-in duration-300">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-5 pb-5 flex items-center justify-between gap-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild
            className="rounded-full shrink-0 text-white/50 hover:text-white hover:bg-white/10">
            <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Catálogo</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Splash Piscinas · {loading ? "…" : `${produtos.length} modelo${produtos.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {isMaster && (
          <Button asChild size="sm" variant="outline"
            className="border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white font-semibold rounded-xl text-xs">
            <Link to="/admin/catalogo/gerenciar">
              <Settings2 className="w-3.5 h-3.5 mr-1.5" />
              Gerenciar
            </Link>
          </Button>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-9 h-9 animate-spin text-sky-400/60" />
            <p className="text-white/30 text-xs font-semibold tracking-wider">Carregando catálogo…</p>
          </div>
        </div>
      ) : produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-white/30">
          <ImageOff className="w-16 h-16 opacity-30" />
          <p className="text-base font-bold">Nenhum produto cadastrado</p>
          {isMaster && (
            <Button asChild variant="outline"
              className="border-white/20 bg-white/5 text-white/70 hover:bg-white/10 mt-2 text-sm">
              <Link to="/admin/catalogo/gerenciar">Adicionar primeiro produto</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="px-4 sm:px-6 py-6 pb-24 sm:pb-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {produtos.map((p) => (
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

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ produto, onClick }: { produto: Produto; onClick: () => void }) {
  // fotos[0] = 3D model (used as card cover); fotos[1..] = gallery
  const allFotos = Array.isArray(produto.fotos) ? produto.fotos : [];
  const coverUrl = allFotos[0] ?? null;

  const hasOps = Array.isArray(produto.opcionais) && produto.opcionais.length > 0;
  const porcelana = hasPorcelana(produto.opcionais ?? []);
  const acrilico = hasAcrilico(produto.opcionais ?? []);
  // Gallery count = total - 1 (exclude 3D model)
  const galleryCount = Math.max(0, allFotos.length - 1);
  const tamanhoCount = Array.isArray(produto.tamanhos) ? produto.tamanhos.length : 0;

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.09] text-left transition-all duration-300 hover:border-sky-400/30 hover:shadow-lg hover:shadow-sky-900/20 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#001830]">
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
            <ImageOff className="w-10 h-10 text-white/10" />
          </div>
        )}

        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#00111f]/90 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

        {/* Gallery count badge */}
        {galleryCount > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white/70 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
            <Layers className="w-3 h-3" />
            {galleryCount}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-white font-extrabold text-sm leading-snug">{produto.nome}</p>
          {tamanhoCount > 0 && (
            <p className="text-white/35 text-[10px] font-semibold mt-0.5">
              {tamanhoCount} tamanho{tamanhoCount !== 1 ? "s" : ""} disponíve{tamanhoCount !== 1 ? "is" : "l"}
            </p>
          )}
        </div>

        {hasOps && (
          <div className="flex flex-wrap gap-1">
            {porcelana && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300/90 border border-amber-400/20">
                Porcelana Atlas
              </span>
            )}
            {acrilico && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300/90 border border-sky-400/20">
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
  // fotos[0] = 3D model, shown in the info panel
  const modeloUrl = allFotos[0] ?? null;
  // Gallery = fotos[1..], photoIdx is relative to this slice
  const galleryFotos = allFotos.slice(1);
  const currentUrl = galleryFotos[photoIdx] ?? null;
  const hasPrev = photoIdx > 0;
  const hasNext = photoIdx < galleryFotos.length - 1;
  const porcelana = hasPorcelana(produto.opcionais ?? []);
  const acrilico = hasAcrilico(produto.opcionais ?? []);
  const hasOps = porcelana || acrilico;
  const tamanhos = Array.isArray(produto.tamanhos) ? produto.tamanhos : [];

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col md:flex-row animate-in fade-in duration-200"
      style={{ top: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Photo Gallery Column ─────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col bg-[#00060f] min-h-[45dvh] md:min-h-0">

        {/* Main image */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {currentUrl ? (
            <img
              key={currentUrl}
              src={currentUrl}
              alt={`${produto.nome} — foto ${photoIdx + 1}`}
              className="w-full h-full object-contain max-h-[55dvh] md:max-h-[calc(100dvh-140px)] animate-in fade-in duration-150"
            />
          ) : galleryFotos.length === 0 ? (
            <div className="flex flex-col items-center gap-4 text-white/20">
              <ImageOff className="w-20 h-20" />
              <p className="text-sm font-semibold">Sem fotos na galeria</p>
            </div>
          ) : null}
        </div>

        {/* Prev / Next arrows */}
        {galleryFotos.length > 1 && (
          <>
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center border border-white/10 disabled:opacity-20 hover:bg-black/80 hover:border-white/20 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Próxima foto"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center border border-white/10 disabled:opacity-20 hover:bg-black/80 hover:border-white/20 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Thumbnail strip */}
        {galleryFotos.length > 1 && (
          <div className="shrink-0 px-4 py-3 border-t border-white/[0.07] overflow-x-auto">
            <div className="flex gap-2 w-max mx-auto">
              {galleryFotos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => onSetPhoto(i)}
                  className={cn(
                    "w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-200 shrink-0",
                    i === photoIdx
                      ? "border-sky-400 ring-2 ring-sky-400/30 scale-105"
                      : "border-white/10 opacity-50 hover:opacity-90 hover:border-white/30"
                  )}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dot indicators (mobile, up to 8 photos) */}
        {galleryFotos.length > 1 && galleryFotos.length <= 8 && (
          <div className="flex md:hidden justify-center gap-1.5 pb-2">
            {galleryFotos.map((_, i) => (
              <button
                key={i}
                onClick={() => onSetPhoto(i)}
                className={cn(
                  "rounded-full transition-all",
                  i === photoIdx ? "w-5 h-1.5 bg-sky-400" : "w-1.5 h-1.5 bg-white/25"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Info Panel ───────────────────────────────────────────────── */}
      <div className="w-full md:w-[400px] md:max-w-[42%] bg-[#00111f] flex flex-col overflow-y-auto border-l border-white/[0.07]">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5 border-b border-white/[0.07] shrink-0">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold text-white leading-tight tracking-tight">{produto.nome}</h2>
            {galleryFotos.length > 0 && (
              <p className="text-[11px] text-white/30 font-semibold mt-1">
                {photoIdx + 1} / {galleryFotos.length} foto{galleryFotos.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — order: Modelo 3D → Descrição → Opcionais → Tamanhos */}
        <div className="flex-1 px-6 py-6 space-y-7">

          {/* 1. Modelo 3D */}
          {modeloUrl && (
            <div>
              <SectionLabel className="flex items-center gap-1.5">
                <Box className="w-3 h-3 opacity-60" />
                Modelo 3D
              </SectionLabel>
              <div className="mt-3 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#000d1a]">
                <img
                  src={modeloUrl}
                  alt={`${produto.nome} — modelo 3D`}
                  className="w-full object-contain max-h-56"
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
              <div className="mt-3 space-y-2">
                {porcelana && (
                  <OpcionalCard
                    color="amber"
                    title="Pastilha de Porcelana Atlas"
                    subtitle="Revestimento premium em porcelana"
                  />
                )}
                {acrilico && (
                  <OpcionalCard
                    color="sky"
                    title="Acrílico"
                    subtitle="Tampa e acabamento em acrílico"
                  />
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
              <div className="mt-3 grid grid-cols-1 gap-2">
                {tamanhos.map((t, i) => {
                  const parts = [t.comprimento, t.largura, t.profundidade].filter(Boolean);
                  const dims = parts.join(" × ");
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 hover:bg-white/[0.07] transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-sky-400/60 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white/85 font-semibold text-sm leading-snug">
                          {t.label ? (
                            <>
                              <HighlightedLabel label={t.label} />
                              {" — "}
                              <span className="text-white/50 font-normal">{dims}</span>
                            </>
                          ) : (
                            dims
                          )}
                        </p>
                        {t.capacidade && (
                          <p className="text-sky-400/70 text-[11px] font-semibold mt-0.5">{t.capacidade}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mobile nav footer */}
        {galleryFotos.length > 1 && (
          <div className="md:hidden flex items-center justify-between px-6 pb-8 pt-4 border-t border-white/[0.07] shrink-0">
            <Button onClick={onPrev} disabled={!hasPrev} variant="outline" size="sm"
              className="border-white/15 bg-white/5 text-white/70 disabled:opacity-25 text-xs">
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <span className="text-white/30 text-xs font-bold">{photoIdx + 1}/{galleryFotos.length}</span>
            <Button onClick={onNext} disabled={!hasNext} variant="outline" size="sm"
              className="border-white/15 bg-white/5 text-white/70 disabled:opacity-25 text-xs">
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5", className)}>
      {children}
    </p>
  );
}

function OpcionalCard({
  color, title, subtitle,
}: {
  color: "amber" | "sky";
  title: string;
  subtitle: string;
}) {
  const styles = {
    amber: {
      wrap: "bg-amber-500/8 border-amber-400/15",
      icon: "bg-amber-400/15",
      svg: "text-amber-400",
      title: "text-amber-200",
      sub: "text-amber-400/55",
    },
    sky: {
      wrap: "bg-sky-500/8 border-sky-400/15",
      icon: "bg-sky-400/15",
      svg: "text-sky-400",
      title: "text-sky-200",
      sub: "text-sky-400/55",
    },
  }[color];

  return (
    <div className={cn("flex items-center gap-3 border rounded-xl p-3.5", styles.wrap)}>
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", styles.icon)}>
        <CheckCircle2 className={cn("w-4.5 h-4.5", styles.svg)} />
      </div>
      <div>
        <p className={cn("font-extrabold text-sm", styles.title)}>{title}</p>
        <p className={cn("text-[11px] font-semibold mt-0.5", styles.sub)}>{subtitle}</p>
      </div>
    </div>
  );
}
