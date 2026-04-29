import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useFormStore } from "@/store/useFormStore";
import { Logo } from "@/components/Logo";

export const WelcomeScreen = () => {
  const { setStep } = useFormStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <Logo className="text-4xl mb-12" />
      <h1 className="text-3xl font-bold text-sky-950 mb-4 max-w-sm">
        Bora descobrir a piscina ideal pro seu quintal?
      </h1>
      <p className="text-lg text-sky-700 mb-8 max-w-md">
        São 4 perguntinhas. Em menos de 1 minuto a gente já manda o catálogo pro seu WhatsApp.
      </p>
      <Button 
        onClick={() => setStep(1)}
        size="lg" 
        className="w-full max-w-xs bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 text-lg rounded-2xl shadow-lg transition-all active:scale-95"
      >
        Bora começar
      </Button>
    </div>
  );
};
