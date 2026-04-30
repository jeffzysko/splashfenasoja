import { Button } from "@/components/ui/button";
import { useFormStore } from "@/store/useFormStore";
import { Logo } from "@/components/Logo";

export const WelcomeScreen = () => {
  const { setStep } = useFormStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <Logo height={64} className="mb-3" />
      <span className="inline-block bg-accent/10 text-secondary text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-10">
        FENASOJA 2026
      </span>
      <h1 className="text-3xl font-bold text-secondary mb-4 max-w-sm">
        Bora descobrir a piscina ideal pro seu quintal?
      </h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        São 4 perguntinhas. Em menos de 1 minuto a gente já manda o catálogo pro seu WhatsApp.
      </p>
      <Button
        onClick={() => setStep(1)}
        size="lg"
        className="w-full max-w-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg rounded-2xl shadow-lg transition-all active:scale-95"
      >
        Bora começar
      </Button>
    </div>
  );
};
