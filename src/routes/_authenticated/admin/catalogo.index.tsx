import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { ArrowLeft, Settings, ChevronLeft, ChevronRight, X, CheckCircle2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/catalogo/")({
  component: CatalogoPage,
});

type Tamanho = { label: string; comprimento?: string; largura?: string; profundidade?: string; capacidade?: string };
type Foto = { url: string; path: string; ordem: number };
type Opcionais = { porcelana_atlas?: boolean; acrilico?: boolean };
type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  tamanhos: Tamanho[];
  opcionais: Opcionais;
  fotos: Foto[];
  ativo: boolean;
  ordem: number;
};

function CatalogoPage() {
  const { user } = useSupabaseAuth();
  const [isMaster, setIsMaster] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Produto | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const key = `is_master_${user.id}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached === "1") setIsMaster(true);
    } catch { /* ignore */ }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      const m = !!data?.some((r) => r.role === "master");
      setIsMaster(m);
      try { sessionStorage.setItem(key, m ? "1" : "0"); } catch { /* ignore */ }
    });
  }, [user?.id]);

  useEffect(() => {
    (supabase.from("produtos" as never) as never as { select: (s: string) => { eq: (a: string, b: boolean) => { order: (a: string) => { order: (a: string) => Promise<{ data: Produto[] | null }> } } } })
      .select("*")
      .eq("ativo", true)
      .order("ordem")
      .order("created_at")
      .then(({ data }) => {
        setProdutos((data ?? []) as Produto[]);
        setLoading(false);
      });
  }, []);

  const open = (p: Produto) => { setSelected(p); setPhotoIdx(0); };
  const close = useCallback(() => setSelected(null), []);
  const prev = useCallback(() => {
    if (!selected) return;
    setPhotoIdx((i) => (i - 1 + selected.fotos.length) % selected.fotos.length);
  }, [selected]);
  const next = useCallback(() => {
    if (!selected) return;
    setPhotoIdx((i) => (i + 1) % selected.fotos.length);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, close, prev, next]);

  return (
    <div className="-mx-4 -my-5 sm:-my-6 min-h-[calc(100dvh-3.5rem)] bg-[#001830] text-white">
      <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-2 text-white/80 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar</span>
        </Link>
        <h1 className="text-lg font-bold">Catálogo</h1>
        {isMaster ? (
          <Link to="/admin/catalogo/gerenciar" className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Gerenciar</span>
          </Link>
        ) : <span className="w-8" />}
      </div>

      <div className="px-4 py-5">
        {loading ? (
          <div className="text-center text-white/60 py-10">Carregando…</div>
        ) : produtos.length === 0 ? (
          <div className="text-center text-white/60 py-16">Nenhum produto disponível.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {produtos.map((p) => {
              const cover = p.fotos?.[0];
              return (
                <button
                  key={p.id}
                  onClick={() => open(p)}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden bg-white/5 group text-left"
                >
                  {cover ? (
                    <img src={cover.url} alt={p.nome} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/30">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {p.fotos?.length > 0 && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-black/60 backdrop-blur px-1.5 py-0.5 rounded">
                      {p.fotos.length} fotos
                    </span>
                  )}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p.opcionais?.porcelana_atlas && (
                      <span className="text-[9px] font-bold bg-amber-500/90 text-amber-950 px-1.5 py-0.5 rounded uppercase">Porcelana</span>
                    )}
                    {p.opcionais?.acrilico && (
                      <span className="text-[9px] font-bold bg-cyan-400/90 text-cyan-950 px-1.5 py-0.5 rounded uppercase">Acrílico</span>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <h3 className="font-bold text-sm leading-tight line-clamp-2">{p.nome}</h3>
                    {p.tamanhos?.length > 0 && (
                      <p className="text-[10px] text-white/70 mt-1 line-clamp-1">
                        {p.tamanhos.map((t) => t.label).join(" · ")}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col md:flex-row">
          <div className="flex-1 relative flex items-center justify-center min-h-0">
            {selected.fotos.length > 0 ? (
              <>
                <img src={selected.fotos[photoIdx]?.url} alt={selected.nome} className="max-w-full max-h-full object-contain" />
                {selected.fotos.length > 1 && (
                  <>
                    <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {selected.fotos.map((_, i) => (
                        <button key={i} onClick={() => setPhotoIdx(i)} className={cn("w-2 h-2 rounded-full transition-all", i === photoIdx ? "bg-white w-6" : "bg-white/40")} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-white/40 flex flex-col items-center gap-2">
                <ImageIcon className="w-12 h-12" />
                <span>Sem fotos</span>
              </div>
            )}
          </div>
          <div className="w-full md:w-[380px] bg-[#001830] text-white flex flex-col max-h-[60vh] md:max-h-none overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="font-bold text-lg leading-tight">{selected.nome}</h2>
              <button onClick={close} className="p-1.5 hover:bg-white/10 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selected.descricao && (
                <p className="text-sm text-white/80 whitespace-pre-line">{selected.descricao}</p>
              )}
              {selected.tamanhos?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Tamanhos</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {selected.tamanhos.map((t, i) => (
                      <div key={i} className="bg-white/5 rounded-md p-3">
                        <div className="font-bold text-sm">{t.label}</div>
                        <div className="text-xs text-white/70 mt-1 space-y-0.5">
                          {(t.comprimento || t.largura || t.profundidade) && (
                            <div>
                              {[t.comprimento && `${t.comprimento}m`, t.largura && `${t.largura}m`, t.profundidade && `${t.profundidade}m`]
                                .filter(Boolean).join(" × ")}
                            </div>
                          )}
                          {t.capacidade && <div>Capacidade: {t.capacidade}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(selected.opcionais?.porcelana_atlas || selected.opcionais?.acrilico) && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Opcionais</h3>
                  <div className="space-y-2">
                    {selected.opcionais.porcelana_atlas && (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5">
                        <CheckCircle2 className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-medium">Porcelana Atlas</span>
                      </div>
                    )}
                    {selected.opcionais.acrilico && (
                      <div className="flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/30 rounded-md p-2.5">
                        <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                        <span className="text-sm font-medium">Acrílico</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
