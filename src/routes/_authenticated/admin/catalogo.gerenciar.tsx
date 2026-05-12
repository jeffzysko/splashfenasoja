import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Loader2, Pencil, Trash2, Eye, EyeOff,
  Upload, X, ChevronUp, ChevronDown, GripVertical, ImageOff,
  CheckSquare, Square,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/catalogo/gerenciar")({
  component: CatalogoGerenciarPage,
  head: () => ({ meta: [{ title: "Gerenciar Catálogo — Splash Admin" }] }),
});

// ── Types ─────────────────────────────────────────────────────────────────────
type Foto = { url: string; path: string; ordem: number };
type Modelo3D = { url: string; path: string; label: string };
type Tamanho = { label: string; comprimento: string; largura: string; profundidade: string; capacidade: string };
type Opcional = { porcelana_atlas: boolean; acrilico: boolean };

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  tamanhos: Tamanho[];
  opcionais: Opcional;
  fotos: Foto[];
  modelos_3d: Modelo3D[];
  ativo: boolean;
  ordem: number;
};

const EMPTY_TAMANHO: Tamanho = { label: "", comprimento: "", largura: "", profundidade: "", capacidade: "" };
const EMPTY_FORM = {
  nome: "",
  descricao: "",
  tamanhos: [{ ...EMPTY_TAMANHO }] as Tamanho[],
  opcionais: { porcelana_atlas: false, acrilico: false } as Opcional,
  fotos: [] as Foto[],
  modelos_3d: [] as Modelo3D[],
  ativo: true,
};

// ── Main Page ─────────────────────────────────────────────────────────────────
function CatalogoGerenciarPage() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const [isMaster, setIsMaster] = useState<boolean | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingModelo, setUploadingModelo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const modeloRef = useRef<HTMLInputElement>(null);

  // Master guard
  useEffect(() => {
    if (!user?.id) return;
    const key = `is_master_${user.id}`;
    try { if (sessionStorage.getItem(key) === "1") { setIsMaster(true); return; } } catch { /**/ }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      const isM = !!data?.some((r) => r.role === "master");
      setIsMaster(isM);
      if (!isM) { toast.error("Acesso restrito a masters."); navigate({ to: "/admin/catalogo" }); }
    });
  }, [user?.id, navigate]);

  const loadProdutos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("produtos")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    setProdutos((data as unknown as Produto[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (isMaster) loadProdutos(); }, [isMaster, loadProdutos]);

  // ── Form helpers ────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, tamanhos: [{ ...EMPTY_TAMANHO }] });
    setSheetOpen(true);
  };

  const openEdit = (p: Produto) => {
    setEditing(p);
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? "",
      tamanhos: p.tamanhos.length > 0
        ? p.tamanhos.map((t) => ({
            label: t.label ?? "",
            comprimento: String(t.comprimento ?? ""),
            largura: String(t.largura ?? ""),
            profundidade: String(t.profundidade ?? ""),
            capacidade: t.capacidade ?? "",
          }))
        : [{ ...EMPTY_TAMANHO }],
      opcionais: { porcelana_atlas: !!p.opcionais?.porcelana_atlas, acrilico: !!p.opcionais?.acrilico },
      fotos: p.fotos.slice().sort((a, b) => a.ordem - b.ordem),
      modelos_3d: Array.isArray(p.modelos_3d) ? p.modelos_3d.map((m) => ({ url: m.url, path: m.path, label: m.label ?? "" })) : [],
      ativo: p.ativo,
    });
    setSheetOpen(true);
  };

  // ── Tamanhos ─────────────────────────────────────────────────────────────
  const addTamanho = () =>
    setForm((f) => ({ ...f, tamanhos: [...f.tamanhos, { ...EMPTY_TAMANHO }] }));

  const removeTamanho = (i: number) =>
    setForm((f) => ({ ...f, tamanhos: f.tamanhos.filter((_, idx) => idx !== i) }));

  const setTamanho = (i: number, field: keyof Tamanho, value: string) =>
    setForm((f) => ({
      ...f,
      tamanhos: f.tamanhos.map((t, idx) => idx === i ? { ...t, [field]: value } : t),
    }));

  // ── Photos ────────────────────────────────────────────────────────────────
  const uploadFoto = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Apenas imagens são aceitas."); return; }
    setUploadingFoto(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const prodId = editing?.id ?? "temp";
      const path = `produtos/${prodId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("produto-fotos").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("produto-fotos").getPublicUrl(path);
      const novaFoto: Foto = { url: publicUrl, path, ordem: form.fotos.length };
      setForm((f) => ({ ...f, fotos: [...f.fotos, novaFoto] }));
      toast.success("Foto adicionada!");
    } catch (e) {
      toast.error("Erro ao fazer upload da foto.");
    } finally {
      setUploadingFoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeFoto = async (foto: Foto, i: number) => {
    try {
      await supabase.storage.from("produto-fotos").remove([foto.path]);
    } catch { /**/ }
    setForm((f) => ({
      ...f,
      fotos: f.fotos.filter((_, idx) => idx !== i).map((ft, idx) => ({ ...ft, ordem: idx })),
    }));
  };

  const moveFoto = (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= form.fotos.length) return;
    setForm((f) => {
      const fotos = [...f.fotos];
      [fotos[i], fotos[ni]] = [fotos[ni], fotos[i]];
      return { ...f, fotos: fotos.map((ft, idx) => ({ ...ft, ordem: idx })) };
    });
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      tamanhos: form.tamanhos.filter((t) => t.label.trim()),
      opcionais: form.opcionais,
      fotos: form.fotos,
      ativo: form.ativo,
      ordem: editing?.ordem ?? produtos.length,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase.from("produtos").insert(payload);
        if (error) throw error;
        toast.success("Produto criado!");
      }
      setSheetOpen(false);
      loadProdutos();
    } catch {
      toast.error("Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle ativo ──────────────────────────────────────────────────────────
  const toggleAtivo = async (p: Produto) => {
    await supabase.from("produtos").update({ ativo: !p.ativo }).eq("id", p.id);
    loadProdutos();
  };

  // ── Move order ────────────────────────────────────────────────────────────
  const moveOrdem = async (p: Produto, dir: -1 | 1) => {
    const sorted = [...produtos].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex((x) => x.id === p.id);
    const ni = idx + dir;
    if (ni < 0 || ni >= sorted.length) return;
    const other = sorted[ni];
    await Promise.all([
      supabase.from("produtos").update({ ordem: other.ordem }).eq("id", p.id),
      supabase.from("produtos").update({ ordem: p.ordem }).eq("id", other.id),
    ]);
    loadProdutos();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteProduto = async (p: Produto) => {
    // Delete photos from storage
    if (p.fotos.length) {
      await supabase.storage.from("produto-fotos").remove(p.fotos.map((f) => f.path));
    }
    await supabase.from("produtos").delete().eq("id", p.id);
    toast.success("Produto removido.");
    loadProdutos();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (isMaster === null) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0 -ml-2">
            <Link to="/admin/catalogo"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-secondary tracking-tight">Gerenciar Catálogo</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              {produtos.length} produto{produtos.length !== 1 ? "s" : ""} cadastrado{produtos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="font-bold rounded-xl shrink-0">
          <Plus className="w-4 h-4 mr-1.5" /> Novo
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
        </div>
      ) : produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
          <ImageOff className="w-14 h-14 opacity-30" />
          <p className="font-bold">Nenhum produto ainda</p>
          <Button onClick={openNew} variant="outline">Cadastrar primeiro produto</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...produtos].sort((a, b) => a.ordem - b.ordem).map((p, idx, arr) => {
            const cover = p.fotos.find((f) => f.ordem === 0) ?? p.fotos[0];
            return (
              <div
                key={p.id}
                className={cn(
                  "bg-card border border-border rounded-2xl flex items-center gap-3 p-3 transition-opacity",
                  !p.ativo && "opacity-50"
                )}
              >
                {/* Cover thumb */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                  {cover
                    ? <img src={cover.url} alt={p.nome} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground/40" /></div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-secondary text-sm leading-tight truncate">{p.nome}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    {p.fotos.length} foto{p.fotos.length !== 1 ? "s" : ""}
                    {p.tamanhos.length > 0 && ` · ${p.tamanhos.length} tamanho${p.tamanhos.length !== 1 ? "s" : ""}`}
                  </p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {p.opcionais?.porcelana_atlas && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/20">Porcelana</span>
                    )}
                    {p.opcionais?.acrilico && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 border border-cyan-500/20">Acrílico</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveOrdem(p, -1)} disabled={idx === 0}
                      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-secondary disabled:opacity-20 transition">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveOrdem(p, 1)} disabled={idx === arr.length - 1}
                      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-secondary disabled:opacity-20 transition">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Toggle ativo */}
                  <button onClick={() => toggleAtivo(p)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-secondary transition">
                    {p.ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  {/* Edit */}
                  <button onClick={() => openEdit(p)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary transition">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl max-w-sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover produto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{p.nome}" e todas as suas fotos serão deletados permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteProduto(p)}
                          className="rounded-xl bg-destructive hover:bg-destructive/90">
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Form Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
            <SheetTitle className="text-lg font-extrabold">
              {editing ? "Editar produto" : "Novo produto"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Nome do modelo *
              </Label>
              <Input id="nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Premium Acqua 5x3" className="rounded-xl" />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Breve descrição
              </Label>
              <Textarea id="desc" value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Piscina de fibra com acabamento premium..."
                className="rounded-xl resize-none min-h-[80px]" />
            </div>

            {/* Tamanhos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Tamanhos disponíveis
                </Label>
                <button onClick={addTamanho}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              <div className="space-y-3">
                {form.tamanhos.map((t, i) => (
                  <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={t.label} onChange={(e) => setTamanho(i, "label", e.target.value)}
                        placeholder="Label (ex: 3x2)" className="rounded-lg h-9 flex-1" />
                      {form.tamanhos.length > 1 && (
                        <button onClick={() => removeTamanho(i)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={t.comprimento} onChange={(e) => setTamanho(i, "comprimento", e.target.value)}
                        placeholder="Comprimento (m)" className="rounded-lg h-9 text-sm" inputMode="decimal" />
                      <Input value={t.largura} onChange={(e) => setTamanho(i, "largura", e.target.value)}
                        placeholder="Largura (m)" className="rounded-lg h-9 text-sm" inputMode="decimal" />
                      <Input value={t.profundidade} onChange={(e) => setTamanho(i, "profundidade", e.target.value)}
                        placeholder="Profund. (m)" className="rounded-lg h-9 text-sm" inputMode="decimal" />
                      <Input value={t.capacidade} onChange={(e) => setTamanho(i, "capacidade", e.target.value)}
                        placeholder="Capacidade (ex: 7.800L)" className="rounded-lg h-9 text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Opcionais */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Opcionais disponíveis
              </Label>
              <div className="space-y-2">
                <button
                  onClick={() => setForm((f) => ({ ...f, opcionais: { ...f.opcionais, porcelana_atlas: !f.opcionais.porcelana_atlas } }))}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition text-left",
                    form.opcionais.porcelana_atlas
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-700"
                      : "bg-muted/40 border-border text-muted-foreground"
                  )}
                >
                  {form.opcionais.porcelana_atlas
                    ? <CheckSquare className="w-4 h-4 shrink-0" />
                    : <Square className="w-4 h-4 shrink-0" />}
                  <span className="font-bold text-sm">Porcelana Atlas</span>
                </button>
                <button
                  onClick={() => setForm((f) => ({ ...f, opcionais: { ...f.opcionais, acrilico: !f.opcionais.acrilico } }))}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition text-left",
                    form.opcionais.acrilico
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-700"
                      : "bg-muted/40 border-border text-muted-foreground"
                  )}
                >
                  {form.opcionais.acrilico
                    ? <CheckSquare className="w-4 h-4 shrink-0" />
                    : <Square className="w-4 h-4 shrink-0" />}
                  <span className="font-bold text-sm">Acrílico</span>
                </button>
              </div>
            </div>

            {/* Fotos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Galeria de fotos ({form.fotos.length})
                </Label>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingFoto}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition disabled:opacity-50"
                >
                  {uploadingFoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingFoto ? "Enviando…" : "Adicionar foto"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    Array.from(e.target.files ?? []).forEach((f) => uploadFoto(f));
                  }}
                />
              </div>

              {form.fotos.length === 0 ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-semibold">Clique para adicionar fotos</span>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {form.fotos.map((foto, i) => (
                    <div key={foto.path} className="relative group aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                      <img src={foto.url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">CAPA</span>
                      )}
                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                        <button onClick={() => moveFoto(i, -1)} disabled={i === 0}
                          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center disabled:opacity-30 transition">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeFoto(foto, i)}
                          className="w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center transition">
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveFoto(i, 1)} disabled={i === form.fotos.length - 1}
                          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center disabled:opacity-30 transition">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Add more */}
                  <button onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition">
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">A primeira foto é a capa do produto no catálogo. Use as setas para reordenar.</p>
            </div>

            {/* Visibilidade */}
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="font-bold text-sm text-secondary">Visível no catálogo</p>
                <p className="text-xs text-muted-foreground">Desative para ocultar sem deletar</p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
            </div>

          </div>

          {/* Footer */}
          <SheetFooter className="px-5 py-4 border-t border-border shrink-0">
            <Button onClick={save} disabled={saving} className="w-full rounded-xl font-bold h-12">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar produto"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
