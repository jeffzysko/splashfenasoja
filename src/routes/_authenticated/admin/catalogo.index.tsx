import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  ArrowLeft, ChevronLeft, ChevronRight, X, ZoomIn,
  Settings2, Loader2, ImageOff, Maximize2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/catalogo/")({
  component: CatalogoPage,
  head: () => ({ meta: [{ title: "Catálogo — Splash Admin" }] }),
});

// ── Types ─────────────────────────────────────────────────────────────────────
type Foto = { url: string; path: string; ordem: number };
type Tamanho = { label: string; comprimento: number; largura: number; profundidade: number; capacidade: string };
type Opcional = { porcelana_atlas?: boolean; acrilico?: boolean };

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  tamanhos: Tamanho[];
  opcionais: Opcional;
  fotos: Foto[];
  ativo: boolean;
  ordem: number;
};

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

  const prevPhoto = () => setPhotoIdx((i) => Math.max(0, i - 1));
  const nextPhoto = () =>
    setPhotoIdx((i) => Math.min((selected?.fotos.length ?? 1) - 1, i + 1));

  // keyboard navigation inside modal
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    // Full-bleed dark background within the admin content area
    <div className="-mx-4 -my-5 sm:-my-6 min-h-[calc(100dvh-3.5rem)] bg-[#001830] animate-in fade-in duration-300">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-5 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild
            className="rounded-full shrink-0 text-white/60 hover:text-white hover:bg-white/10">
            <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Catálogo</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Splash Piscinas · {produtos.length} modelo{produtos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {isMaster && (
          <Button asChild size="sm" variant="outline"
            className="border-white/20 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white font-bold rounded-xl">
            <Link to="/admin/catalogo/gerenciar">
              <Settings2 className="w-4 h-4 mr-1.5" />
              Gerenciar
            </Link>
          </Button>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </div>
      ) : produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-white/40">
          <ImageOff className="w-16 h-16 opacity-30" />
          <p className="text-base font-bold">Nenhum produto cadastrado</p>
          {isMaster && (
            <Button asChild variant="outline"
              className="border-white/20 bg-white/5 text-white/80 hover:bg-white/15 mt-2">
              <Link to="/admin/catalogo/gerenciar">Adicionar primeiro produto</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="px-4 sm:px-6 pb-24 sm:pb-8">
          {/* Product Grid — 2 cols mobile, 3 tablet, 4 large */}
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
  const coverFoto = produto.fotos.find((f) => f.ordem === 0) ?? produto.fotos[0];
  const hasOps = produto.opcionais?.porcelana_atlas || produto.opcionais?.acrilico;

  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10 text-left transition-all duration-200 hover:border-white/30 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Photo */}
      {coverFoto ? (
        <img
          src={coverFoto.url}
          alt={produto.nome}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff className="w-10 h-10 text-white/20" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Badge: foto count */}
      {produto.fotos.length > 1 && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white/80 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
          <ZoomIn className="w-3 h-3" />
          {produto.fotos.length}
        </div>
      )}

      {/* Footer info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white font-extrabold text-sm leading-tight truncate">{produto.nome}</p>
        {produto.tamanhos.length > 0 && (
          <p className="text-white/60 text-[10px] font-semibold mt-0.5 truncate">
            {produto.tamanhos.map((t) => t.label).join(" · ")}
          </p>
        )}
        {hasOps && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {produto.opcionais?.porcelana_atlas && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/20">
                Porcelana Atlas
              </span>
            )}
            {produto.opcionais?.acrilico && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/20">
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
  produto, photoIdx, onPrev, onNext, onClose,
}: {
  produto: Produto;
  photoIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const fotos = produto.fotos.slice().sort((a, b) => a.ordem - b.ordem);
  const currentFoto = fotos[photoIdx];
  const hasPrev = photoIdx > 0;
  const hasNext = photoIdx < fotos.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col md:flex-row animate-in fade-in duration-200"
      style={{ top: "0" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Photo Column ─────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center min-h-[45dvh] md:min-h-0 bg-[#000d1a]">
        {currentFoto ? (
          <img
            key={currentFoto.url}
            src={currentFoto.url}
            alt={`${produto.nome} — foto ${photoIdx + 1}`}
            className="w-full h-full object-contain max-h-[50dvh] md:max-h-full animate-in fade-in duration-200"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/30">
            <ImageOff className="w-20 h-20" />
            <p className="text-sm font-semibold">Sem fotos cadastradas</p>
          </div>
        )}

        {/* Photo navigation */}
        {fotos.length > 1 && (
          <>
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center border border-white/10 disabled:opacity-20 hover:bg-black/70 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center border border-white/10 disabled:opacity-20 hover:bg-black/70 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {fotos.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-full transition-all",
                    i === photoIdx
                      ? "w-5 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/40"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Thumbnail strip */}
        {fotos.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex gap-2">
            {fotos.map((f, i) => (
              <button
                key={f.path}
                onClick={() => { /* parent manages index via onPrev/onNext logic — use direct idx */ }}
                className={cn(
                  "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                  i === photoIdx ? "border-white scale-110" : "border-white/20 opacity-60 hover:opacity-100"
                )}
              >
                <img src={f.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Info Panel ───────────────────────────────────── */}
      <div className="w-full md:w-[380px] md:max-w-[40%] bg-[#001830] flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-white leading-tight">{produto.nome}</h2>
            {fotos.length > 0 && (
              <p className="text-[11px] text-white/40 font-semibold mt-0.5">
                {photoIdx + 1} / {fotos.length}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {/* Descrição */}
          {produto.descricao && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Descrição</p>
              <p className="text-sm text-white/80 leading-relaxed">{produto.descricao}</p>
            </div>
          )}

          {/* Tamanhos */}
          {produto.tamanhos.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Tamanhos disponíveis</p>
              <div className="grid grid-cols-2 gap-2">
                {produto.tamanhos.map((t, i) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1"
                  >
                    <p className="text-white font-extrabold text-base leading-none">{t.label}</p>
                    <div className="text-white/50 text-[10px] font-semibold space-y-0.5">
                      {t.comprimento && t.largura && (
                        <p>{t.comprimento}m × {t.largura}m{t.profundidade ? ` × ${t.profundidade}m` : ""}</p>
                      )}
                      {t.capacidade && <p className="text-cyan-400/80">{t.capacidade}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opcionais */}
          {(produto.opcionais?.porcelana_atlas || produto.opcionais?.acrilico) && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Opcionais disponíveis</p>
              <div className="space-y-2">
                {produto.opcionais?.porcelana_atlas && (
                  <div className="flex items-center gap-3 bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-amber-300 font-extrabold text-sm">Porcelana Atlas</p>
                      <p className="text-amber-400/60 text-[10px] font-semibold">Revestimento premium em porcelana</p>
                    </div>
                  </div>
                )}
                {produto.opcionais?.acrilico && (
                  <div className="flex items-center gap-3 bg-cyan-400/10 border border-cyan-400/20 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-400/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-cyan-300 font-extrabold text-sm">Acrílico</p>
                      <p className="text-cyan-400/60 text-[10px] font-semibold">Tampa e acabamento em acrílico</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Photo nav footer (mobile) */}
        {fotos.length > 1 && (
          <div className="md:hidden flex items-center justify-between px-5 pb-6 pt-3 border-t border-white/10 shrink-0">
            <Button onClick={onPrev} disabled={!hasPrev} variant="outline" size="sm"
              className="border-white/20 bg-white/5 text-white disabled:opacity-20">
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <span className="text-white/40 text-xs font-bold">{photoIdx + 1}/{fotos.length}</span>
            <Button onClick={onNext} disabled={!hasNext} variant="outline" size="sm"
              className="border-white/20 bg-white/5 text-white disabled:opacity-20">
              Próxima <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
