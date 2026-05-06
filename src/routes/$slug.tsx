import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { WelcomeScreen } from "@/components/form/WelcomeScreen";
import { useFormStore } from "@/store/useFormStore";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const ContactScreen = lazy(() =>
  import("@/components/form/ContactScreen").then((m) => ({ default: m.ContactScreen }))
);
const CityScreen = lazy(() =>
  import("@/components/form/CityScreen").then((m) => ({ default: m.CityScreen }))
);
const SizeScreen = lazy(() =>
  import("@/components/form/SizeScreen").then((m) => ({ default: m.SizeScreen }))
);
const TimelineScreen = lazy(() =>
  import("@/components/form/TimelineScreen").then((m) => ({ default: m.TimelineScreen }))
);
const BudgetScreen = lazy(() =>
  import("@/components/form/BudgetScreen").then((m) => ({ default: m.BudgetScreen }))
);
const SubmittingScreen = lazy(() =>
  import("@/components/form/SubmittingScreen").then((m) => ({ default: m.SubmittingScreen }))
);
const SuccessScreen = lazy(() =>
  import("@/components/form/SuccessScreen").then((m) => ({ default: m.SuccessScreen }))
);

type Feira = { id: string; nome: string; slug: string; ativo: boolean };

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }): Promise<Feira> => {
    const { data, error } = await supabase
      .from("feiras")
      .select("id, nome, slug, ativo")
      .eq("slug", params.slug)
      .maybeSingle();

    if (error || !data) throw notFound();
    return data as Feira;
  },
  notFoundComponent: FeiraNaoEncontrada,
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Splash Lead — ${loaderData.nome}` : "Splash Lead" },
      {
        name: "description",
        content: "Cadastre-se e receba o catálogo de piscinas de fibra Splash no seu WhatsApp.",
      },
    ],
  }),
  component: FeiraFormPage,
});

const TOTAL_STEPS = 6;

function ScreenFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
}

function FeiraNaoEncontrada() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-[var(--splash-blue-soft)] via-background to-background px-6 text-center gap-6">
      <Logo height={56} />
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-2xl font-extrabold text-secondary mb-2">Evento não encontrado</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          O link que você acessou não corresponde a nenhum evento ativo da Splash Piscinas.
          Confirme o link com o stand da Splash.
        </p>
      </div>
    </div>
  );
}

function FeiraInativa({ nome }: { nome: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-[var(--splash-blue-soft)] via-background to-background px-6 text-center gap-6">
      <Logo height={56} />
      <div>
        <h1 className="text-2xl font-extrabold text-secondary mb-2">{nome}</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          As inscrições para este evento foram encerradas. Obrigado pela sua visita!
        </p>
      </div>
    </div>
  );
}

function FeiraFormPage() {
  const feira = Route.useLoaderData();
  const { step, setStep, setFeira, feiraId } = useFormStore();

  // Sincroniza a feira no store sempre que o slug mudar
  useEffect(() => {
    if (feira && feiraId !== feira.id) {
      setFeira(feira.id, feira.nome, feira.slug);
    }
  }, [feira, feiraId, setFeira]);

  if (!feira.ativo) return <FeiraInativa nome={feira.nome} />;

  const progressStep = step === 0 ? 0 : Math.min(step, TOTAL_STEPS);
  const progressPct = (progressStep / TOTAL_STEPS) * 100;
  const showBack = step > 0 && step < 6;
  const showProgress = step > 0 && step <= 6;

  const renderStep = () => {
    switch (step) {
      case 0: return <WelcomeScreen key="welcome" />;
      case 1: return <ContactScreen key="contact" />;
      case 2: return <CityScreen key="city" />;
      case 3: return <SizeScreen key="size" />;
      case 4: return <TimelineScreen key="timeline" />;
      case 5: return <BudgetScreen key="budget" />;
      case 6: return <SubmittingScreen key="submitting" />;
      case 7: return <SuccessScreen key="success" />;
      default: return <WelcomeScreen key="welcome" />;
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-[var(--splash-blue-soft)] via-background to-background overflow-x-hidden relative">
      <div aria-hidden className="absolute top-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full bg-accent/15 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute top-[40%] left-[-100px] w-[260px] h-[260px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/50">
        <div className="max-w-md mx-auto flex items-center px-4 h-16 gap-3">
          {showBack ? (
            <button
              onClick={() => setStep(step - 1)}
              className="p-2 -ml-2 text-secondary hover:bg-muted rounded-full transition-colors shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex-1 flex items-center py-2">
              <Logo height={32} />
            </div>
          )}

          {showProgress && (
            <>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0">
                {progressStep}/{TOTAL_STEPS}
              </span>
            </>
          )}
          {!showProgress && <div className="flex-1" />}
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full relative">
        <Suspense fallback={<ScreenFallback />}>{renderStep()}</Suspense>
      </main>
    </div>
  );
}
