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

export const Route = createFileRoute("/admin/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: search.redirect || "/admin" });
    }
  },
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Acesso da equipe — Splash Lead" }],
  }),
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
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
    setLoading(false);

    if (error) {
      toast.error(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tenta de novo?",
      );
      return;
    }
    toast.success("Bem-vindo(a) de volta!");
    navigate({ to: search.redirect || "/admin" });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[var(--splash-blue-soft)] via-background to-background px-4 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute top-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full bg-accent/15 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute bottom-[-100px] left-[-100px] w-[260px] h-[260px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo height={48} className="mx-auto mb-4" />
          <span className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-full">
            <Lock className="w-3 h-3" />
            Área da equipe
          </span>
        </div>

        <div className="bg-card border border-border rounded-3xl p-7 shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--secondary)_25%,transparent)]">
          <h1 className="text-2xl font-extrabold text-secondary mb-1 tracking-tight">
            Entrar
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Acesso restrito ao time comercial.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-secondary font-bold uppercase text-[11px] tracking-wider">
                E-mail
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 rounded-xl border-2 mt-1.5 focus-visible:border-primary focus-visible:ring-0"
                placeholder="voce@splashpiscinas.com"
              />
            </div>
            <div>
              <Label className="text-secondary font-bold uppercase text-[11px] tracking-wider">
                Senha
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-12 rounded-xl border-2 mt-1.5 focus-visible:border-primary focus-visible:ring-0"
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Esqueceu a senha? Fala com o admin pra resetar.
        </p>
      </div>
    </div>
  );
}
