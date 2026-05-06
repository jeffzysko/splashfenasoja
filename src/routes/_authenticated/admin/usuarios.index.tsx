import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Loader2, Trash2, Eye, EyeOff, UserCog, CalendarDays } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/usuarios/")({
  component: UsuariosPage,
  head: () => ({ meta: [{ title: "Usuários — Splash Admin" }] }),
});

type Feira = { id: string; nome: string; slug: string };
type UserRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  feiras: Feira[];
};

const ROLE_LABEL: Record<string, string> = { master: "Master", admin: "Admin", user: "Vendedor" };
const ROLE_CLASS: Record<string, string> = {
  master: "bg-primary/15 text-primary border-primary/30",
  admin: "bg-secondary/15 text-secondary border-secondary/30",
  user: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feiras, setFeiras] = useState<Feira[]>([]);

  // Dialog criar usuário
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [role, setRole] = useState("admin");
  const [selectedFeiras, setSelectedFeiras] = useState<string[]>([]);

  // Dialog editar role
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editFeiras, setEditFeiras] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);

    // Buscar todos os roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .order("role");

    // Buscar perfis
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name");

    // Buscar emails via audit_log (melhor proxy disponível sem service_role)
    const { data: auditRows } = await supabase
      .from("admin_audit_log")
      .select("user_id, email")
      .order("created_at", { ascending: false });

    // Buscar vinculações
    const { data: fuRows } = await supabase
      .from("feira_users")
      .select("user_id, feira_id, feiras(id, nome, slug)");

    const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
    const emailMap = new Map<string, string>();
    for (const a of auditRows || []) {
      if (a.email && !emailMap.has(a.user_id)) emailMap.set(a.user_id, a.email);
    }

    // Agrupar feiras por user_id
    const fairsByUser = new Map<string, Feira[]>();
    for (const fu of fuRows || []) {
      const f = (fu as any).feiras;
      if (!f) continue;
      if (!fairsByUser.has(fu.user_id)) fairsByUser.set(fu.user_id, []);
      fairsByUser.get(fu.user_id)!.push(f as Feira);
    }

    // Deduplicar por user_id mantendo o role mais elevado
    const userMap = new Map<string, UserRow>();
    const rolePriority: Record<string, number> = { master: 3, admin: 2, user: 1 };
    for (const r of roles || []) {
      const existing = userMap.get(r.user_id);
      if (!existing || (rolePriority[r.role] || 0) > (rolePriority[existing.role] || 0)) {
        userMap.set(r.user_id, {
          user_id: r.user_id,
          email: emailMap.get(r.user_id) || "—",
          full_name: profileMap.get(r.user_id) || null,
          role: r.role,
          feiras: fairsByUser.get(r.user_id) || [],
        });
      }
    }

    setUsers(Array.from(userMap.values()).sort((a, b) =>
      (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0)
    ));
    setLoading(false);
  }, []);

  const loadFeiras = useCallback(async () => {
    const { data } = await supabase.from("feiras").select("id, nome, slug").order("nome");
    if (data) setFeiras(data as Feira[]);
  }, []);

  useEffect(() => {
    loadUsers();
    loadFeiras();
  }, [loadUsers, loadFeiras]);

  const handleCreate = async () => {
    if (!nome.trim() || !email.trim() || !senha || !role) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setCreating(true);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ nome: nome.trim(), email: email.trim(), senha, role, feira_ids: selectedFeiras }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Erro ao criar usuário.");
        return;
      }

      toast.success(`Usuário ${json.user.email} criado com sucesso!`);
      setShowCreate(false);
      setNome(""); setEmail(""); setSenha(""); setRole("admin"); setSelectedFeiras([]);
      loadUsers();
    } catch (e) {
      toast.error("Erro de conexão com a função.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: userId }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Erro ao excluir usuário.");
      return;
    }

    toast.success("Usuário removido.");
    loadUsers();
  };

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditFeiras(u.feiras.map((f) => f.id));
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      // Proteção: master não pode remover o próprio role de master
      if (editingUser.user_id === currentUserId && editingUser.role === "master" && editRole !== "master") {
        toast.error("Você não pode remover seu próprio role de master.");
        setSaving(false);
        return;
      }

      // SAFE: inserir/upsert PRIMEIRO, só depois deletar os antigos.
      // Isso evita a janela onde o usuário fica sem nenhum role,
      // o que quebraria a RLS e travaria o sistema.
      const { error: upsertErr } = await supabase
        .from("user_roles")
        .upsert({ user_id: editingUser.user_id, role: editRole }, { onConflict: "user_id,role" });

      if (upsertErr) {
        toast.error("Erro ao atualizar role: " + upsertErr.message);
        return;
      }

      // Agora remove os outros roles (diferentes do novo)
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingUser.user_id)
        .neq("role", editRole);

      // Atualizar feiras: remover all, reinserir selecionadas
      await supabase.from("feira_users").delete().eq("user_id", editingUser.user_id);
      if (editFeiras.length > 0) {
        await supabase.from("feira_users").insert(
          editFeiras.map((fid) => ({ feira_id: fid, user_id: editingUser.user_id }))
        );
      }

      // Se editou a própria conta: limpar cache de auth para forçar revalidação limpa
      if (editingUser.user_id === currentUserId) {
        try {
          sessionStorage.removeItem("admin_auth_cache_v1");
          sessionStorage.removeItem(`is_master_${currentUserId}`);
        } catch { /* ignore */ }
      }

      toast.success("Usuário atualizado.");
      setEditingUser(null);
      loadUsers();
    } catch (e) {
      toast.error("Erro inesperado ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleFeira = (id: string, arr: string[], set: (v: string[]) => void) => {
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="p-2 -ml-2 text-muted-foreground hover:text-secondary rounded-full" aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-secondary tracking-tight flex items-center gap-2">
              <UserCog className="w-6 h-6 text-primary" /> Usuários
            </h1>
            <p className="text-sm text-muted-foreground">{users.length} cadastrado{users.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-2 h-10"
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      {/* Lista */}
      <div className="bg-card border-2 border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Nenhum usuário cadastrado.</div>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.user_id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-secondary truncate">{u.full_name || "(sem nome)"}</span>
                    <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0", ROLE_CLASS[u.role] || "bg-muted text-muted-foreground border-border")}>
                      {ROLE_LABEL[u.role] || u.role}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                  {u.feiras.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <CalendarDays className="w-3 h-3 text-muted-foreground shrink-0" />
                      {u.feiras.map((f) => (
                        <span key={f.id} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-semibold">
                          {f.nome}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-primary rounded-xl"
                    onClick={() => openEdit(u)}
                    title="Editar"
                  >
                    <UserCog className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost" size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-xl"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{u.full_name || u.email}</strong> será removido permanentemente do sistema. Essa ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                          onClick={() => handleDelete(u.user_id)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog: Criar usuário */}
      <Dialog open={showCreate} onOpenChange={(v) => { if (!creating) setShowCreate(v); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-secondary">Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Nome completo">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João da Silva" className="rounded-xl h-11" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@splashpiscinas.com" className="rounded-xl h-11" />
            </Field>
            <Field label="Senha">
              <div className="relative">
                <Input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="rounded-xl h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary"
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Função">
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Vendedor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {feiras.length > 0 && (
              <Field label="Feiras vinculadas (opcional)">
                <div className="flex flex-wrap gap-2 mt-1">
                  {feiras.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFeira(f.id, selectedFeiras, setSelectedFeiras)}
                      className={cn(
                        "text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-all",
                        selectedFeiras.includes(f.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-transparent hover:border-border"
                      )}
                    >
                      {f.nome}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-primary text-primary-foreground rounded-xl font-bold gap-2">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar usuário */}
      <Dialog open={!!editingUser} onOpenChange={(v) => { if (!saving && !v) setEditingUser(null); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-secondary">
              Editar: {editingUser?.full_name || editingUser?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Função">
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Vendedor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="master">Master</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {feiras.length > 0 && (
              <Field label="Feiras vinculadas">
                <div className="flex flex-wrap gap-2 mt-1">
                  {feiras.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFeira(f.id, editFeiras, setEditFeiras)}
                      className={cn(
                        "text-xs font-bold px-3 py-1.5 rounded-xl border-2 transition-all",
                        editFeiras.includes(f.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-transparent hover:border-border"
                      )}
                    >
                      {f.nome}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditingUser(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="bg-primary text-primary-foreground rounded-xl font-bold gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-secondary font-black uppercase text-[10px] tracking-widest ml-1">{label}</Label>
      {children}
    </div>
  );
}
