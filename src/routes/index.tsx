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
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";

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

function Index() {
  const { step, setStep } = useFormStore();
  const progress = step === 0 ? 0 : step >= 6 ? 100 : step * 20;

  const renderStep = () => {
    switch (step) {
      case 0: return <WelcomeScreen />;
      case 1: return <ContactScreen />;
      case 2: return <CityScreen />;
      case 3: return <SizeScreen />;
      case 4: return <TimelineScreen />;
      case 5: return <BudgetScreen />;
      case 6: return <SubmittingScreen />;
      case 7: return <SuccessScreen />;
      default: return <WelcomeScreen />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[var(--splash-blue-soft)] to-background overflow-hidden">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={progress} className="h-1 rounded-none" />
        <div className="flex items-center justify-between p-4 h-16">
          {step > 0 && step < 6 && (
            <button
              onClick={() => setStep(step - 1)}
              className="p-2 -ml-2 text-secondary hover:bg-muted rounded-full transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex-1" />
        </div>
      </div>

      <main className="flex-1 flex flex-col pt-16">{renderStep()}</main>
    </div>
  );
}
