import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Loader2, CheckCircle2, XCircle, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/feiras/")({
  component: FeirasPage,
  head: () => ({ meta: [{ title: "Feiras — Splash Admin" }] }),
});

type Feira = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  created_at: string;
  _leads_count?: number;
  _users_count?: number;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function FeirasPage() {
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFeiras = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feiras")
      .select("id, nome, slug, ativo, created_at")
      .order("created_at", { ascending: false });

    if (error) { toast.error("Erro ao carregar feiras."); setLoading(false); return; }

    // Busca contagens em paralelo
    const feirasWithCounts = await Promise.all(
      (data || []).map(async (f) => {
        const [{ count: leadsCount }, { count: usersCount }] = await Promise.all([
          supabase.from("leads").select("id", { count: "exact", head: true }).eq("feira_id", f.id),
          supabase.from("feira_users").select("id", { count: "exact", head: true }).eq("feira_id", f.id),
        ]);
        return { ...f, _leads_count: leadsCount ?? 0, _users_count: usersCount ?? 0 };
      })
    );

    setFeiras(feirasWithCounts as Feira[]);
    setLoading(false);
  };

  useEffect(() => { loadFeiras(); }, []);

  const handleNomeChange = (v: string) => {
    setNome(v);
    if (!slugManual) setSlug(slugify(v));
  };

  const handleSlugChange = (v: string) => {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugManual(true);
  };

  const handleCreate = async () => {
    if (!nome.trim() || !slug.trim()) { toast.error("Preencha nome e slug."); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
      toast.error("Slug inválido. Use apenas letras minúsculas, números e hífens."); return;
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("feiras").insert({
      nome: nome.trim(),
      slug: slug.trim(),
      ativo: true,
      created_by: session?.user.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("unique") ? "Esse slug já está em uso." : error.message);
      return;
    }
    toast.success(`Feira "${nome}" criada!`);
    setShowDialog(false);
    setNome(""); setSlug(""); setSlugManual(false);
    loadFeiras();
  };

  const toggleAtivo = async (f: Feira) => {
    const { error } = await supabase.from("feiras").update({ ativo: !f.ativo }).eq("id", f.id);
    if (error) { toast.error("Erro ao atualizar status."); return; }
    toast.success(f.ativo ? "Feira desativada." : "Feira ativada!");
    setFeiras((prev) => prev.map((x) => x.id === f.id ? { ...x, ativo: !x.ativo } : x));
  };

  const publicUrl = (slug: string) =>
    `${window.location.origin}/${slug}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="p-2 -ml-2 text-muted-foreground hover:text-secondary rounded-full" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-secondary tracking-tight">Feiras</h1>
            <p className="text-xs text-muted-foreground">Gerencie eventos e usuários responsáveis</p>
          </div>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 px-4 gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Feira
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : feiras.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
          <p className="text-secondary font-bold mb-1">Nenhuma feira cadastrada</p>
          <p className="text-xs text-muted-foreground mb-4">Crie a primeira feira para começar.</p>
          <Button onClick={() => setShowDialog(true)} size="sm" className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Nova Feira
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {feiras.map((f) => (
            <div key={f.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-extrabold text-secondary text-base">{f.nome}</h2>
                  <span className={cn(
                    "text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                    f.ativo
                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  )}>
                    {f.ativo ? "Ativa" : "Encerrada"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground font-mono">/{f.slug}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" /> {f._users_count} usuários
                  </span>
                  <span className="text-xs text-muted-foreground">{f._leads_count} leads</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(publicUrl(f.slug)).then(() => toast.success("Link copiado!"))}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  title="Copiar link público"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Link
                </button>
                <button
                  type="button"
                  onClick={() => toggleAtivo(f)}
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-colors",
                    f.ativo
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  )}
                >
                  {f.ativo ? <><XCircle className="w-3.5 h-3.5" /> Desativar</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Ativar</>}
                </button>
                <Link
                  to="/admin/feiras/$feiraId"
                  params={{ feiraId: f.id }}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-border hover:border-primary/40 transition-colors"
                >
                  Gerenciar →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Nova Feira */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-secondary font-black">Nova Feira</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Nome do evento
              </label>
              <Input
                value={nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                placeholder="Ex: AgroSul 2026"
                className="h-12 rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                Slug (URL)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">…/</span>
                <Input
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="agrosul2026"
                  className="h-12 rounded-xl font-mono"
                />
              </div>
              {slug && (
                <p className="text-[11px] text-muted-foreground">
                  Link: <span className="font-bold text-primary">{window.location.origin}/{slug}</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !nome.trim() || !slug.trim()} className="rounded-xl font-bold gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Feira
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
