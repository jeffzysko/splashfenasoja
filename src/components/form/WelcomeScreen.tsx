import { Button } from "@/components/ui/button";
import { useFormStore } from "@/store/useFormStore";
import { Logo } from "@/components/Logo";
import { ScreenContainer } from "./ScreenContainer";
import { Sparkles } from "lucide-react";

export const WelcomeScreen = () => {
  const { setStep } = useFormStore();

  return (
    <ScreenContainer centered>
      <div className="mb-6 animate-in fade-in zoom-in duration-500 fill-mode-forwards">
        <Logo height={72} />
      </div>

      <span className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1.5 rounded-full mb-8 animate-in fade-in slide-in-from-bottom-2 duration-400 delay-150 fill-mode-forwards">
        <Sparkles className="w-3 h-3" />
        FENASOJA 2026
      </span>

      <h1 className="text-[34px] leading-[1.1] font-extrabold text-secondary mb-4 max-w-sm tracking-tight animate-in fade-in slide-in-from-bottom-3 duration-500 delay-250 fill-mode-forwards">
        Bora descobrir a piscina ideal pro seu quintal?
      </h1>

      <p className="text-lg text-muted-foreground mb-10 max-w-md animate-in fade-in slide-in-from-bottom-3 duration-500 delay-350 fill-mode-forwards">
        São <strong className="text-secondary">4 perguntinhas</strong>. Em menos de
        1 minuto a gente já manda o catálogo pro seu WhatsApp.
      </p>

      <div className="w-full max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-500 delay-450 fill-mode-forwards">
        <Button
          onClick={() => setStep(1)}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-7 text-lg rounded-2xl shadow-[0_10px_30px_-8px_color-mix(in_oklab,var(--primary)_55%,transparent)] transition-all active:scale-[0.97]"
        >
          Bora começar 🏊
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          🔒 Seus dados ficam só com a Splash. Sem spam.
        </p>
      </div>
    </ScreenContainer>
  );
};