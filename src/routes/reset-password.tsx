import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [{ title: "Redefinir senha — Splash" }],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validRecovery, setValidRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // O Supabase processa o hash da URL automaticamente e dispara PASSWORD_RECOVERY.
    // Aceitamos tanto esse evento quanto uma sessão já hidratada (caso o link
    // tenha sido aberto há pouco e a sessão esteja válida).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidRecovery(true);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const isRecovery = hash.includes("type=recovery") || hash.includes("access_token");
      if (data.session && isRecovery) {
        setValidRecovery(true);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message || "Não foi possível atualizar a senha.");
      toast.error("Erro ao atualizar a senha.");
      return;
    }

    setDone(true);
    toast.success("Senha atualizada com sucesso!");
    // Invalida a sessão de recuperação imediatamente — link é de uso único.
    await supabase.auth.signOut();
    setTimeout(() => {
      navigate({ to: "/login" });
    }, 1800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[var(--splash-blue-soft)] via-background to-background px-4 relative overflow-hidden">
      <div aria-hidden className="absolute top-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full bg-accent/15 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute bottom-[-100px] left-[-100px] w-[260px] h-[260px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo height={72} className="mx-auto mb-4" />
          <span className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1.5 rounded-full">
            <Lock className="w-3 h-3" />
            Redefinir senha
          </span>
        </div>

        <div className="bg-card border border-border rounded-[32px] p-8 shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--secondary)_25%,transparent)]">
          {!ready ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Validando link...
            </div>
          ) : !validRecovery ? (
            <div className="text-center">
              <h1 className="text-xl font-black text-secondary mb-2 tracking-tight">Link inválido ou expirado</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Solicite uma nova recuperação de senha na tela de login.
              </p>
              <Button
                onClick={() => navigate({ to: "/login" })}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black"
              >
                Voltar ao login
              </Button>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-accent mx-auto mb-4" />
              <h1 className="text-xl font-black text-secondary mb-2 tracking-tight">Senha atualizada!</h1>
              <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-secondary mb-1 tracking-tight">Crie uma nova senha</h1>
              <p className="text-sm text-muted-foreground mb-8">Use pelo menos 8 caracteres.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label className="text-secondary font-black uppercase text-[10px] tracking-widest ml-1">Nova senha</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-14 rounded-2xl border-2 mt-1 focus-visible:border-primary focus-visible:ring-0"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label className="text-secondary font-black uppercase text-[10px] tracking-widest ml-1">Confirmar senha</Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="h-14 rounded-2xl border-2 mt-1 focus-visible:border-primary focus-visible:ring-0"
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-lg mt-2 shadow-lg active:scale-95 transition-all"
                >
                  {loading ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" /> Salvando...</>) : "Atualizar senha"}
                </Button>
                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border-2 border-destructive/40 bg-destructive/10 text-destructive text-sm font-semibold px-4 py-3"
                  >
                    {error}
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
