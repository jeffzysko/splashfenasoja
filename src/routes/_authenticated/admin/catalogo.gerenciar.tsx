import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, ArrowUp, ArrowDown, Eye, EyeOff, Pencil, Trash2, X, ImageIcon, CheckSquare, Square, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/catalogo/gerenciar")({
  component: GerenciarCatalogoPage,
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

// Acesso solto à tabela `produtos` (ainda não está nos types gerados)
const tbl = () => (supabase as unknown as { from: (t: string) => any }).from("produtos");

function emptyProduto(): Omit<Produto, "id"> {
  return { nome: "", descricao: "", tamanhos: [], opcionais: {}, fotos: [], ativo: true, ordem: 0 };
}

function GerenciarCatalogoPage() {
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const [checkedRole, setCheckedRole] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [form, setForm] = useState<Omit<Produto, "id">>(emptyProduto());
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Produto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Master guard
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      const isM = !!data?.some((r) => r.role === "master");
      if (!isM) navigate({ to: "/admin/catalogo" });
      else setCheckedRole(true);
    });
  }, [user?.id, navigate]);

  const reload = async () => {
    setLoading(true);
    const { data } = await tbl().select("*").order("ordem").order("created_at");
    setProdutos((data ?? []) as Produto[]);
    setLoading(false);
  };

  useEffect(() => { if (checkedRole) reload(); }, [checkedRole]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyProduto(), ordem: produtos.length });
    setSheetOpen(true);
  };
  const openEdit = (p: Produto) => {
    setEditing(p);
    setForm({
      nome: p.nome, descricao: p.descricao ?? "",
      tamanhos: p.tamanhos ?? [], opcionais: p.opcionais ?? {},
      fotos: p.fotos ?? [], ativo: p.ativo, ordem: p.ordem,
    });
    setSheetOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    const payload = { ...form, descricao: form.descricao || null };
    const res = editing
      ? await tbl().update(payload).eq("id", editing.id)
      : await tbl().insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Produto atualizado" : "Produto criado");
    setSheetOpen(false);
    reload();
  };

  const move = async (p: Produto, dir: -1 | 1) => {
    const idx = produtos.findIndex((x) => x.id === p.id);
    const swap = produtos[idx + dir];
    if (!swap) return;
    await tbl().update({ ordem: swap.ordem }).eq("id", p.id);
    await tbl().update({ ordem: p.ordem }).eq("id", swap.id);
    reload();
  };

  const toggleAtivo = async (p: Produto) => {
    await tbl().update({ ativo: !p.ativo }).eq("id", p.id);
    reload();
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const paths = (confirmDel.fotos ?? []).map((f) => f.path).filter(Boolean);
    if (paths.length) await supabase.storage.from("produto-fotos").remove(paths);
    const { error } = await tbl().delete().eq("id", confirmDel.id);
    if (error) toast.error(error.message);
    else toast.success("Produto removido");
    setConfirmDel(null);
    reload();
  };

  // ---------- Form helpers ----------
  const addTamanho = () => setForm((f) => ({ ...f, tamanhos: [...f.tamanhos, { label: "" }] }));
  const updTamanho = (i: number, patch: Partial<Tamanho>) =>
    setForm((f) => ({ ...f, tamanhos: f.tamanhos.map((t, idx) => idx === i ? { ...t, ...patch } : t) }));
  const rmTamanho = (i: number) =>
    setForm((f) => ({ ...f, tamanhos: f.tamanhos.filter((_, idx) => idx !== i) }));

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const newFotos: Foto[] = [...form.fotos];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("produto-fotos").upload(path, file, { contentType: file.type });
      if (error) { toast.error(`Falha no upload: ${error.message}`); continue; }
      const { data } = supabase.storage.from("produto-fotos").getPublicUrl(path);
      newFotos.push({ url: data.publicUrl, path, ordem: newFotos.length });
    }
    setForm((f) => ({ ...f, fotos: newFotos.map((f, i) => ({ ...f, ordem: i })) }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const moveFoto = (i: number, dir: -1 | 1) => {
    const arr = [...form.fotos];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setForm((f) => ({ ...f, fotos: arr.map((x, k) => ({ ...x, ordem: k })) }));
  };

  const rmFoto = async (i: number) => {
    const foto = form.fotos[i];
    if (foto?.path) await supabase.storage.from("produto-fotos").remove([foto.path]);
    setForm((f) => ({ ...f, fotos: f.fotos.filter((_, idx) => idx !== i).map((x, k) => ({ ...x, ordem: k })) }));
  };

  if (!checkedRole) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <Link to="/admin/catalogo" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
        </Link>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4" /> Novo</Button>
      </div>
      <h1 className="text-2xl font-black mb-4">Gerenciar Catálogo</h1>

      {loading ? (
        <div className="text-center text-muted-foreground py-10">Carregando…</div>
      ) : produtos.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border border-dashed rounded-lg">
          Nenhum produto cadastrado. Clique em "Novo" para começar.
        </div>
      ) : (
        <div className="space-y-2">
          {produtos.map((p, idx) => (
            <div key={p.id} className={cn("flex items-center gap-3 p-3 rounded-lg border bg-card", !p.ativo && "opacity-60")}>
              <div className="w-14 h-14 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {p.fotos?.[0] ? (
                  <img src={p.fotos[0].url} alt={p.nome} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{p.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {p.fotos?.length ?? 0} fotos · {p.tamanhos?.length ?? 0} tamanhos
                </div>
                <div className="flex gap-1 mt-1">
                  {p.opcionais?.porcelana_atlas && <span className="text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded uppercase">Porcelana</span>}
                  {p.opcionais?.acrilico && <span className="text-[9px] font-bold bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded uppercase">Acrílico</span>}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => move(p, -1)} disabled={idx === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(p, 1)} disabled={idx === produtos.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => toggleAtivo(p)}>
                  {p.ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setConfirmDel(p)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar produto" : "Novo produto"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-5">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="desc">Descrição</Label>
              <Textarea id="desc" value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="min-h-[80px]" />
            </div>

            {/* Tamanhos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Tamanhos</Label>
                <Button size="sm" variant="outline" type="button" onClick={addTamanho}>
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {form.tamanhos.map((t, i) => (
                  <div key={i} className="border rounded-md p-2.5 space-y-2 relative">
                    <button type="button" onClick={() => rmTamanho(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                    <Input placeholder="Label (ex: P, M, G)" value={t.label} onChange={(e) => updTamanho(i, { label: e.target.value })} />
                    <div className="grid grid-cols-3 gap-1.5">
                      <Input placeholder="Comp. (m)" value={t.comprimento ?? ""} onChange={(e) => updTamanho(i, { comprimento: e.target.value })} />
                      <Input placeholder="Larg. (m)" value={t.largura ?? ""} onChange={(e) => updTamanho(i, { largura: e.target.value })} />
                      <Input placeholder="Prof. (m)" value={t.profundidade ?? ""} onChange={(e) => updTamanho(i, { profundidade: e.target.value })} />
                    </div>
                    <Input placeholder="Capacidade (ex: 7.800L)" value={t.capacidade ?? ""} onChange={(e) => updTamanho(i, { capacidade: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>

            {/* Opcionais */}
            <div>
              <Label>Opcionais</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, opcionais: { ...form.opcionais, porcelana_atlas: !form.opcionais.porcelana_atlas } })}
                  className={cn(
                    "flex items-center gap-2 border rounded-md p-3 text-sm font-medium transition-colors",
                    form.opcionais.porcelana_atlas ? "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300" : "hover:bg-muted"
                  )}
                >
                  {form.opcionais.porcelana_atlas ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  Porcelana Atlas
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, opcionais: { ...form.opcionais, acrilico: !form.opcionais.acrilico } })}
                  className={cn(
                    "flex items-center gap-2 border rounded-md p-3 text-sm font-medium transition-colors",
                    form.opcionais.acrilico ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300" : "hover:bg-muted"
                  )}
                >
                  {form.opcionais.acrilico ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  Acrílico
                </button>
              </div>
            </div>

            {/* Fotos */}
            <div>
              <Label>Fotos</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onUpload(e.target.files)}
              />
              <div className="grid grid-cols-3 gap-2 mt-2">
                {form.fotos.map((f, i) => (
                  <div key={f.path} className="relative aspect-square rounded-md overflow-hidden border bg-muted group">
                    <img src={f.url} alt="" className="w-full h-full object-cover" />
                    {i === 0 && <span className="absolute top-1 left-1 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">CAPA</span>}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button type="button" onClick={() => moveFoto(i, -1)} className="p-1.5 bg-white/20 rounded text-white hover:bg-white/30" disabled={i === 0}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => rmFoto(i)} className="p-1.5 bg-destructive rounded text-destructive-foreground hover:bg-destructive/80">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => moveFoto(i, 1)} className="p-1.5 bg-white/20 rounded text-white hover:bg-white/30" disabled={i === form.fotos.length - 1}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-[10px] font-medium mt-1">Adicionar</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label>Visível no catálogo</Label>
                <p className="text-xs text-muted-foreground">Produtos ocultos não aparecem para outros usuários.</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar produto"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDel?.nome}" será removido permanentemente, junto com todas as fotos.
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
