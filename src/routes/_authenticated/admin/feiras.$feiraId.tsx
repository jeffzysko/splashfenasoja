import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  Copy,
  UserPlus,
  UserMinus,
  ExternalLink,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/admin/feiras/$feiraId")({
  component: FeiraDetailPage,
  head: () => ({ meta: [{ title: "Gerenciar Feira — Splash Admin" }] }),
});

type Feira = { id: string; nome: string; slug: string; ativo: boolean; created_at: string; whatsapp: string | null; mensagem_sucesso: string | null; quintal_franquia_id: string | null };
type UserRow = { user_id: string; email: string | null; full_name: string | null; role: string; vinculado: boolean };

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function FeiraDetailPage() {
  const { feiraId } = Route.useParams();
  const navigate = useNavigate();

  const [feira, setFeira] = useState<Feira | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Campos de edição
  const [editNome, setEditNome] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editMensagem, setEditMensagem] = useState("");
  const [editQuintalFranquiaId, setEditQuintalFranquiaId] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

  const loadFeira = useCallback(async () => {
    const { data, error } = await supabase
      .from("feiras")
      .select("*")
      .eq("id", feiraId)
      .single();
    if (error || !data) { toast.error("Feira não encontrada."); navigate({ to: "/admin/feiras" }); return; }
    setFeira(data as Feira);
    setEditNome(data.nome);
    setEditSlug(data.slug);
    setEditAtivo(data.ativo);
    setEditWhatsapp(data.whatsapp || "");
    setEditMensagem(data.mensagem_sucesso || "");
    setEditQuintalFranquiaId(data.quintal_franquia_id || "");
    setLoading(false);
  }, [feiraId, navigate]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    // Busca todos os usuários com role admin ou user
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "user", "master"]);

    // Busca usuários vinculados a esta feira
    const { data: vinculados } = await supabase
      .from("feira_users")
      .select("user_id")
      .eq("feira_id", feiraId);

    const vinculadosSet = new Set((vinculados || []).map((v) => v.user_id));

    // Busca dados de perfil
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", (roles || []).map((r) => r.user_id));

    // Busca emails do audit log (único lugar com email exposto)
    const { data: auditLog } = await supabase
      .from("admin_audit_log")
      .select("user_id, email")
      .order("created_at", { ascending: false });

    const emailMap = new Map<string, string>();
    (auditLog || []).forEach((a) => { if (a.email && !emailMap.has(a.user_id)) emailMap.set(a.user_id, a.email); });
    const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));

    const rows: UserRow[] = (roles || []).map((r) => ({
      user_id: r.user_id,
      email: emailMap.get(r.user_id) || null,
      full_name: profileMap.get(r.user_id) || null,
      role: r.role,
      vinculado: vinculadosSet.has(r.user_id),
    }));

    // Vinculados primeiro, depois por email
    rows.sort((a, b) => Number(b.vinculado) - Number(a.vinculado) || (a.email || "").localeCompare(b.email || ""));
    setUsers(rows);
    setLoadingUsers(false);
  }, [feiraId]);

  useEffect(() => { loadFeira(); loadUsers(); }, [loadFeira, loadUsers]);

  const handleSave = async () => {
    if (!editNome.trim() || !editSlug.trim()) { toast.error("Nome e slug são obrigatórios."); return; }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(editSlug)) { toast.error("Slug inválido."); return; }
    setSaving(true);
    const waClean = editWhatsapp.replace(/\D/g, "");
    // Validar UUID do quintalideal se preenchido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const qfId = editQuintalFranquiaId.trim();
    if (qfId && !uuidRegex.test(qfId)) {
      toast.error("ID da franquia inválido. Cole o UUID exato do Quintal Ideal.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("feiras").update({
      nome: editNome.trim(),
      slug: editSlug.trim(),
      ativo: editAtivo,
      whatsapp: waClean || null,
      mensagem_sucesso: editMensagem.trim() || null,
      quintal_franquia_id: qfId || null,
    }).eq("id", feiraId);
    setSaving(false);
    if (error) { toast.error(error.message.includes("unique") ? "Esse slug já está em uso." : error.message); return; }
    toast.success("Feira atualizada!");
    setFeira((prev) => prev ? { ...prev, nome: editNome.trim(), slug: editSlug.trim(), ativo: editAtivo } : prev);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("feiras").delete().eq("id", feiraId);
    setDeleting(false);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Feira excluída.");
    navigate({ to: "/admin/feiras" });
  };

  const toggleUser = async (u: UserRow) => {
    setTogglingUser(u.user_id);
    if (u.vinculado) {
      await supabase.from("feira_users").delete().eq("feira_id", feiraId).eq("user_id", u.user_id);
      toast.success(`${u.email || u.full_name || "Usuário"} desvinculado.`);
    } else {
      await supabase.from("feira_users").insert({ feira_id: feiraId, user_id: u.user_id });
      toast.success(`${u.email || u.full_name || "Usuário"} vinculado!`);
    }
    setTogglingUser(null);
    setUsers((prev) => prev.map((x) => x.user_id === u.user_id ? { ...x, vinculado: !x.vinculado } : x));
  };

  const publicUrl = feira ? `${window.location.origin}/${feira.slug}` : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link to="/admin/feiras" className="p-2 -ml-2 text-muted-foreground hover:text-secondary rounded-full" aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-secondary tracking-tight">{feira?.nome}</h1>
          <p className="text-xs text-muted-foreground font-mono">/{feira?.slug}</p>
        </div>
      </div>

      {/* Link público */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary mb-1">Link do formulário</p>
          <p className="text-sm font-mono text-secondary break-all">{publicUrl}</p>
        </div>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success("Copiado!"))}
          className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors shrink-0"
          aria-label="Copiar link"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {/* Edição */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Configurações</h2>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Nome do evento</label>
          <Input
            value={editNome}
            onChange={(e) => { setEditNome(e.target.value); if (!slugManual) setEditSlug(slugify(e.target.value)); }}
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Slug (URL)</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">…/</span>
            <Input
              value={editSlug}
              onChange={(e) => { setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugManual(true); }}
              className="h-12 rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            WhatsApp do responsável
          </label>
          <Input
            value={editWhatsapp}
            onChange={(e) => setEditWhatsapp(e.target.value)}
            placeholder="Ex: 5555999990000 (com DDD e DDI)"
            className="h-12 rounded-xl font-mono"
            type="tel"
          />
          <p className="text-[11px] text-muted-foreground">
            Número que aparece no botão "Chamar especialista" da tela de sucesso do formulário.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            Mensagem na tela de agradecimento
          </label>
          <textarea
            value={editMensagem}
            onChange={(e) => setEditMensagem(e.target.value)}
            placeholder="Ex: Em breve nossa equipe da FENASOJA entrará em contato com você!"
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground">
            Texto exibido abaixo do "Pronto, [nome]!" na tela de sucesso. Se vazio, usa a mensagem padrão.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            Franquia no Quintal Ideal
          </label>
          <Input
            value={editQuintalFranquiaId}
            onChange={(e) => setEditQuintalFranquiaId(e.target.value.trim())}
            placeholder="Cole aqui o UUID da franquia (ex: a18278bd-0f91-...)"
            className="h-12 rounded-xl font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            ID da franquia responsável por esta feira no sistema Quintal Ideal. Os leads capturados serão enviados para ela (com redistribuição por cidade automática). Encontre o UUID no painel de franquias do Quintal Ideal.
          </p>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-bold text-secondary">Formulário ativo</p>
            <p className="text-xs text-muted-foreground">Desativado = formulário público inacessível</p>
          </div>
          <Switch checked={editAtivo} onCheckedChange={setEditAtivo} />
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl gap-2" disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir feira
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {feira?.nome}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Os leads desta feira <strong>não serão excluídos</strong>, mas perderão o vínculo com ela. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl">
                  Sim, excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={handleSave} disabled={saving} className="rounded-xl font-bold gap-2 ml-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Usuários vinculados */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
          Usuários responsáveis
        </h2>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário cadastrado no sistema.</p>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-secondary truncate">
                    {u.full_name || u.email || "Usuário sem nome"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                    <span className={cn(
                      "text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider",
                      u.role === "master" ? "bg-purple-100 text-purple-700" :
                      u.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {u.role}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleUser(u)}
                  disabled={togglingUser === u.user_id}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all shrink-0",
                    u.vinculado
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  )}
                >
                  {togglingUser === u.user_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : u.vinculado ? (
                    <><UserMinus className="w-3.5 h-3.5" /> Desvincular</>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5" /> Vincular</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      {feira && (
        <p className="text-center text-[11px] text-muted-foreground/60">
          Criada em {format(new Date(feira.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      )}
    </div>
  );
}
