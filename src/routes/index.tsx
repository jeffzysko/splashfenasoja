import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { WelcomeScreen } from "@/components/form/WelcomeScreen";
import { useFormStore } from "@/store/useFormStore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

// Apenas a Welcome é carregada eager (primeira tela visível).
// As demais são carregadas sob demanda — só baixam quando o usuário avança.
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

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Splash Lead — FENASOJA 2026" },
      {
        name: "description",
        content:
          "Cadastre-se e receba o catálogo de piscinas de fibra Splash no seu WhatsApp.",
      },
    ],
  }),
});

const TOTAL_STEPS = 6;

function ScreenFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
}

function Index() {
  const { step, setStep } = useFormStore();

  const progressStep = step === 0 ? 0 : Math.min(step, TOTAL_STEPS);
  const progressPct = (progressStep / TOTAL_STEPS) * 100;
  const showBack = step > 0 && step < 6;
  const showProgress = step > 0 && step <= 6;

  // Pré-busca a próxima tela quando o usuário entra na anterior.
  // Quando o clique de "Próximo" acontece, o chunk já está pronto.
  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeScreen key="welcome" />;
      case 1:
        return <ContactScreen key="contact" />;
      case 2:
        return <CityScreen key="city" />;
      case 3:
        return <SizeScreen key="size" />;
      case 4:
        return <TimelineScreen key="timeline" />;
      case 5:
        return <BudgetScreen key="budget" />;
      case 6:
        return <SubmittingScreen key="submitting" />;
      case 7:
        return <SuccessScreen key="success" />;
      default:
        return <WelcomeScreen key="welcome" />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[var(--splash-blue-soft)] via-background to-background overflow-x-hidden relative">
      <div
        aria-hidden
        className="absolute top-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full bg-accent/15 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-[40%] left-[-100px] w-[260px] h-[260px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />

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
