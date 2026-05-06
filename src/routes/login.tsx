import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import {
  Loader2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  // Injeta o manifest do admin apenas na rota de login (PWA admin).
  // O formulário público ($slug) não recebe manifest — sem PWA lá.
  head: () => ({
    meta: [
      { name: "apple-mobile-web-app-title", content: "Splash Admin" },
      { name: "application-name", content: "Splash Admin" },
      { title: "Splash Admin — Login" },
    ],
    links: [
      { rel: "manifest", href: "/admin-manifest.webmanifest" },
    ],
  }),
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

type Mode = "login" | "forgot";

function LoginPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      const msg =
        error.message === "Invalid login credentials" ||
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : error.message === "Email not confirmed"
            ? "Confirme seu e-mail antes de entrar."
            : error.message || "Não foi possível entrar. Tenta de novo?";
      setError(msg);
      toast.error(msg);
      return;
    }

    toast.success("Bem-vindo(a) de volta!");
    window.location.replace(search.redirect || "/admin");
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Digite seu e-mail.");
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      forgotEmail.trim(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setForgotLoading(false);

    if (error) {
      toast.error("Erro ao enviar: " + error.message);
      return;
    }
    setForgotSent(true);
    toast.success("Link enviado! Confira seu e-mail.");
  };

  const goToForgot = () => {
    setForgotEmail(email);
    setForgotSent(false);
    setMode("forgot");
    setError(null);
  };

  const backToLogin = () => {
    setMode("login");
    setError(null);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br from-[var(--splash-blue-soft)] via-background to-background px-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="absolute top-[-140px] right-[-100px] w-[380px] h-[380px] rounded-full bg-accent/15 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute bottom-[-120px] left-[-120px] w-[320px] h-[320px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full bg-secondary/5 blur-3xl pointer-events-none"
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo height={72} className="mx-auto mb-4" />
          <span className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            Time Splash
          </span>
        </div>

        <div className="bg-card/95 backdrop-blur-xl border border-border rounded-[32px] p-8 shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--secondary)_30%,transparent)]">
          {mode === "login" ? (
            <>
              <h1 className="text-2xl font-black text-secondary mb-1 tracking-tight">
                Entrar
              </h1>
              <p className="text-sm text-muted-foreground mb-7">
                Acompanhe os leads em tempo real.
              </p>

              <form onSubmit={handleLogin} className="space-y-5">
                <FieldEmail
                  value={email}
                  onChange={setEmail}
                  autoFocus
                  placeholder="voce@splashpiscinas.com"
                />

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-secondary font-black uppercase text-[10px] tracking-widest ml-1">
                      Senha
                    </Label>
                    <button
                      type="button"
                      onClick={goToForgot}
                      className="text-[11px] font-bold text-primary hover:underline mr-1"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-14 pl-11 pr-12 rounded-2xl border-2 focus-visible:border-primary focus-visible:ring-0"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-secondary hover:bg-muted transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-[var(--splash-pink-hover)] text-primary-foreground rounded-2xl font-black text-lg mt-2 shadow-lg shadow-primary/30 active:scale-95 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
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
          ) : forgotSent ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h1 className="text-xl font-black text-secondary mb-2 tracking-tight">
                Link enviado!
              </h1>
              <p className="text-sm text-muted-foreground mb-1">
                Enviamos um link para
              </p>
              <p className="text-sm font-bold text-secondary mb-6 break-all">
                {forgotEmail}
              </p>
              <p className="text-xs text-muted-foreground/80 mb-6 leading-relaxed">
                Confira sua caixa de entrada (e o spam, por garantia). O link
                expira em <strong>1 hora</strong> e só pode ser usado uma vez.
              </p>
              <Button
                onClick={backToLogin}
                className="w-full h-12 bg-primary hover:bg-[var(--splash-pink-hover)] text-primary-foreground rounded-2xl font-black"
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={backToLogin}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>

              <h1 className="text-2xl font-black text-secondary mb-1 tracking-tight">
                Esqueci minha senha
              </h1>
              <p className="text-sm text-muted-foreground mb-7">
                Vamos enviar um link de recuperação para o seu e-mail.
              </p>

              <form onSubmit={handleForgot} className="space-y-5">
                <FieldEmail
                  value={forgotEmail}
                  onChange={setForgotEmail}
                  autoFocus
                  placeholder="voce@splashpiscinas.com"
                />

                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-14 bg-primary hover:bg-[var(--splash-pink-hover)] text-primary-foreground rounded-2xl font-black text-lg shadow-lg shadow-primary/30 active:scale-95 transition-all"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar link"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[11px] font-bold text-muted-foreground/70 mt-6 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" />
          Acesso restrito ao Time Splash
        </p>
      </div>
    </div>
  );
}

function FieldEmail({
  value,
  onChange,
  autoFocus,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-secondary font-black uppercase text-[10px] tracking-widest ml-1">
        E-mail
      </Label>
      <div className="relative mt-1">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete="email"
          autoFocus={autoFocus}
          className={cn(
            "h-14 pl-11 rounded-2xl border-2 focus-visible:border-primary focus-visible:ring-0"
          )}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
