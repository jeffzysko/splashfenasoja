import { createFileRoute } from "@tanstack/react-router";
import { WelcomeScreen } from "@/components/form/WelcomeScreen";
import { ContactScreen } from "@/components/form/ContactScreen";
import { CityScreen } from "@/components/form/CityScreen";
import { SizeScreen } from "@/components/form/SizeScreen";
import { TimelineScreen } from "@/components/form/TimelineScreen";
import { BudgetScreen } from "@/components/form/BudgetScreen";
import { SubmittingScreen } from "@/components/form/SubmittingScreen";
import { SuccessScreen } from "@/components/form/SuccessScreen";
import { useFormStore } from "@/store/useFormStore";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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

const TOTAL_STEPS = 6; // 1..6 são os passos com progresso

function Index() {
  const { step, setStep } = useFormStore();

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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[var(--splash-blue-soft)] via-background to-background overflow-x-hidden relative">
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="absolute top-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full bg-accent/15 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-[40%] left-[-100px] w-[260px] h-[260px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />

      {/* Top bar */}
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
              <WelcomeLogo />
            </div>
          )}

          {showProgress && (
            <>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
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
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </main>
    </div>
  );
}
