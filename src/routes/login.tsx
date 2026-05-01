import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const dest = search.redirect || "/admin";
      if (dest === "/login" || dest.split("?")[0] === "/login") {
        throw redirect({ to: "/admin" });
      }
      throw redirect({ to: dest });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      toast.error(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tenta de novo?",
      );
      return;
    }

    setLoading(false);
    toast.success("Bem-vindo(a) de volta!");
    window.location.replace(search.redirect || "/admin");
  };

  const resetPassword = async () => {
    if (!email) {
      toast.error("Digite seu e-mail primeiro.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin`,
    });
    if (error) {
      toast.error("Erro ao enviar reset: " + error.message);
    } else {
      toast.success("E-mail de recuperação enviado!");
    }
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
            Time Splash
          </span>
        </div>

        <div className="bg-card border border-border rounded-[32px] p-8 shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--secondary)_25%,transparent)]">
          <h1 className="text-2xl font-black text-secondary mb-1 tracking-tight">Área do Time Splash</h1>
          <p className="text-sm text-muted-foreground mb-8">Acompanhe os leads da FENASOJA em tempo real.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-secondary font-black uppercase text-[10px] tracking-widest ml-1">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-14 rounded-2xl border-2 mt-1 focus-visible:border-primary focus-visible:ring-0"
                placeholder="voce@splashpiscinas.com"
              />
            </div>
            <div>
              <Label className="text-secondary font-black uppercase text-[10px] tracking-widest ml-1">Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-14 rounded-2xl border-2 mt-1 focus-visible:border-primary focus-visible:ring-0"
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-lg mt-2 shadow-lg active:scale-95 transition-all"
            >
              {loading ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" /> Entrando...</>) : "Entrar"}
            </Button>
          </form>
        </div>

        <button 
          onClick={resetPassword}
          className="w-full text-center text-xs font-bold text-muted-foreground mt-8 hover:text-primary transition-colors"
        >
          Esqueci minha senha
        </button>
      </div>
    </div>
  );
}
