import { createFileRoute } from "@tanstack/react-router";
import { WelcomeScreen } from "@/components/form/WelcomeScreen";
import { ContactScreen } from "@/components/form/ContactScreen";
import { CityScreen, SizeScreen, TimelineScreen, BudgetScreen, SubmittingScreen, SuccessScreen } from "@/components/form/CityScreen";
import { useFormStore } from "@/store/useFormStore";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export const Route = createFileRoute("/")({
  component: Index,
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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-sky-50 to-white overflow-hidden">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={progress} className="h-1 rounded-none bg-sky-100" />
        <div className="flex items-center justify-between p-4 h-16">
          {step > 0 && step < 6 && (
            <button
              onClick={() => setStep(step - 1)}
              className="p-2 -ml-2 text-sky-700 hover:bg-sky-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex-1" />
          {step === 0 && (
             <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              Stand Splash · FENASOJA 2026
            </span>
          )}
        </div>
      </div>

      <main className="flex-1 flex flex-col pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
