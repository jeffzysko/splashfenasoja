import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Splash Piscinas — Formulário de Leads" },
      { name: "description", content: "Acesse o link do evento para se cadastrar." },
    ],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-[var(--splash-blue-soft)] via-background to-background px-6 text-center gap-8">
      <div
        aria-hidden
        className="absolute top-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full bg-accent/15 blur-3xl pointer-events-none"
      />

      <Logo height={72} />

      <div className="space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <QrCode className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-extrabold text-secondary tracking-tight">
          Acesse o link do evento
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          Para se cadastrar, use o QR Code ou o link disponível no stand da{" "}
          <strong className="text-secondary">Splash Piscinas</strong> durante o evento.
        </p>
      </div>

      <p className="text-[11px] text-muted-foreground/60 font-semibold">
        feira.quintalideal.com.br/<span className="italic">nomedoevento</span>
      </p>

      {/* Link de acesso ao admin para a equipe interna */}
      <Link
        to="/admin"
        className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-2"
      >
        Acesso da equipe →
      </Link>
    </div>
  );
}
