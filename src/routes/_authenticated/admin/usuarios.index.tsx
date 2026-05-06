import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, KeyRound, ArrowLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export const Route = createFileRoute("/_authenticated/admin/usuarios/")({
  component: UsuariosPage,
});

type AppRole = "master" | "admin" | "user";
type Feira = { id: string; nome: string; slug: string };
type UserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  feiras: Feira[];
  created_at?: string;
  last_sign_in_at?: string | null;
};

function UsuariosPage() {
  const { user: currentUser } = useSupabaseAuth();
  const currentUserId = currentUser?.id ?? "";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [allFeiras, setAllFeiras] = useState<Feira[]>([]);

  // ── Create dialog ────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSenha, setNewSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [newRole, setNewRole] = useState<AppRole>("admin");
  const [newFeiras, setNewFeiras] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // ── Edit dialog ──────────────────────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("admin");
  const [editFeiras, setEditFeiras] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Reset password dialog ────────────────────────────────────────────────
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetSenha, setResetSenha] = useState("");
  const [showResetSenha, setShowResetSenha] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ── Deleting ─────────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── Carrega lista via Edge Function list-users ───────────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-users");
      if (error) throw error;
      setUsers((data as any).users as UserRow[]);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
      toast.error("Não foi possível carregar a lista de usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFeiras = useCallback(async () => {
    const { data } = await supabase
      .from("feiras")
      .select("id, nome, slug")
      .order("nome");
    if (data) setAllFeiras(data as Feira[]);
  }, []);

  useEffect(() => {
    loadUsers();
    loadFeiras();
  }, [loadUsers, loadFeiras]);

  // ── Criar usuário ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newNome.trim() || !newEmail.trim() || !newSenha.trim()) {
      toast.error("Preencha nome, e-mail e senha.");
      return;
    }
    if (newSenha.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: newEmail.trim().toLowerCase(),
          password: newSenha,
          full_name: newNome.trim(),
          role: newRole,
          feira_ids: newFeiras,
        },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Erro ao criar usuário.");
        return;
      }
      toast.success("Usuário criado com sucesso!");
      setCreateOpen(false);
      setNewNome(""); setNewEmail(""); setNewSenha(""); setNewRole("admin"); setNewFeiras([]);
      loadUsers();
    } finally {
      setCreating(false);
    }
  };

  // ── Editar usuário ───────────────────────────────────────────────────────
  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditFeiras(u.feiras.map((f) => f.id));
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    // Guard: master não pode trocar a própria role
    if (editingUser.user_id === currentUserId && editRole !== "master") {
      toast.error("Você não pode remover sua própria role de master.");
      return;
    }
    setSaving(true);
    try {
      // UPSERT primeiro (nunca fica sem role), depois remove as antigas
      await supabase
        .from("user_roles")
        .upsert({ user_id: editingUser.user_id, role: editRole }, { onConflict: "user_id,role" });
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingUser.user_id)
        .neq("role", editRole);

      // Atualiza vínculos com feiras
      await supabase.from("feira_users").delete().eq("user_id", editingUser.user_id);
      if (editFeiras.length > 0) {
        await supabase.from("feira_users").insert(
          editFeiras.map((fid) => ({ user_id: editingUser.user_id, feira_id: fid })),
        );
      }

      // Se for self-edit, limpa cache de auth
      if (editingUser.user_id === currentUserId) {
        sessionStorage.removeItem("admin_auth_cache_v1");
        sessionStorage.removeItem(`is_master_${currentUserId}`);
      }

      toast.success("Usuário atualizado!");
      setEditingUser(null);
      loadUsers();
    } catch {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  };

  // ── Reset de senha ───────────────────────────────────────────────────────
  const handleResetSenha = async () => {
    if (!resetUser) return;
    if (resetSenha.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { targetUserId: resetUser.user_id, newPassword: resetSenha },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || "Erro ao redefinir senha.");
        return;
      }
      toast.success(`Senha de ${resetUser.email || resetUser.full_name} redefinida!`);
      setResetUser(null);
      setResetSenha("");
    } finally {
      setResetting(false);
    }
  };

  // ── Deletar usuário ──────────────────────────────────────────────────────
  const handleDelete = async (u: UserRow) => {
    setDeleting(u.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { targetUserId: u.user_id },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || "Erro ao excluir usuário.");
        return;
      }
      toast.success("Usuário excluído.");
      loadUsers();
    } finally {
      setDeleting(null);
    }
  };

  const toggleFeira = (id: string, arr: string[], set: (v: string[]) => void) => {
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0 -ml-2" asChild>
            <Link to="/admin"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-extrabold text-secondary tracking-tight">Usuários</h2>
            <p className="text-xs text-muted-foreground">Gerencie os responsáveis pelas feiras</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} className="rounded-xl gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl gap-2 font-bold">
            <Plus className="w-4 h-4" />
            Novo usuário
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.user_id} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {(u.full_name || u.email || "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-secondary truncate">
                      {u.full_name || "Sem nome"}
                    </p>
                    <span className={cn(
                      "text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                      u.role === "master" ? "bg-purple-500/15 text-purple-700 border-purple-500/30" :
                      u.role === "admin"  ? "bg-blue-500/15 text-blue-700 border-blue-500/30" :
                                            "bg-muted text-muted-foreground border-border"
                    )}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                  {u.feiras.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {u.feiras.map((f) => f.nome).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Reset senha */}
                  {u.user_id !== currentUserId && (
                    <button
                      onClick={() => { setResetUser(u); setResetSenha(""); setShowResetSenha(false); }}
                      className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-secondary transition-colors"
                      title="Redefinir senha"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                  )}
                  {/* Editar */}
                  <button
                    onClick={() => openEdit(u)}
                    className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-secondary transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {/* Excluir */}
                  {u.user_id !== currentUserId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          disabled={deleting === u.user_id}
                          title="Excluir"
                        >
                          {deleting === u.user_id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir {u.email || u.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O usuário perderá acesso permanentemente. Os leads não serão afetados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(u)}
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Dialog: Criar usuário ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Nome completo</label>
              <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Maria Silva" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">E-mail</label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="maria@splash.com" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Senha</label>
              <div className="relative">
                <Input
                  value={newSenha}
                  onChange={(e) => setNewSenha(e.target.value)}
                  type={showSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="h-11 rounded-xl pr-10"
                />
                <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Role</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {allFeiras.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Feiras vinculadas</label>
                <div className="flex flex-wrap gap-2">
                  {allFeiras.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFeira(f.id, newFeiras, setNewFeiras)}
                      className={cn(
                        "text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all",
                        newFeiras.includes(f.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {f.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="rounded-xl font-bold gap-2">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar usuário ────────────────────────────────────────── */}
      <Dialog open={!!editingUser} onOpenChange={(v) => !v && setEditingUser(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-3 py-2">
              <div>
                <p className="text-sm font-bold text-secondary">{editingUser.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{editingUser.email}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Role</label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {allFeiras.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Feiras vinculadas</label>
                  <div className="flex flex-wrap gap-2">
                    {allFeiras.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFeira(f.id, editFeiras, setEditFeiras)}
                        className={cn(
                          "text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all",
                          editFeiras.includes(f.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {f.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingUser(null)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="rounded-xl font-bold gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reset de senha ────────────────────────────────────────── */}
      <Dialog open={!!resetUser} onOpenChange={(v) => !v && setResetUser(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>
          {resetUser && (
            <div className="space-y-3 py-2">
              <div>
                <p className="text-sm font-bold text-secondary">{resetUser.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{resetUser.email}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Nova senha</label>
                <div className="relative">
                  <Input
                    value={resetSenha}
                    onChange={(e) => setResetSenha(e.target.value)}
                    type={showResetSenha ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    className="h-11 rounded-xl pr-10"
                  />
                  <button type="button" onClick={() => setShowResetSenha(!showResetSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showResetSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetUser(null)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleResetSenha} disabled={resetting} className="rounded-xl font-bold gap-2">
              {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
              Redefinir senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
