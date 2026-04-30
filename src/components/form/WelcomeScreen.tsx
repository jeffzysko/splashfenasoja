import { Button } from "@/components/ui/button";
import { useFormStore } from "@/store/useFormStore";
import { Logo } from "@/components/Logo";
import { ScreenContainer } from "./ScreenContainer";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export const WelcomeScreen = () => {
  const { setStep } = useFormStore();

  return (
    <ScreenContainer centered>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-6"
      >
        <Logo height={72} />
      </motion.div>

      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-[11px] font-bold uppercase tracking-[0.12em] px-3 py-1.5 rounded-full mb-8"
      >
        <Sparkles className="w-3 h-3" />
        FENASOJA 2026
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="text-[34px] leading-[1.1] font-extrabold text-secondary mb-4 max-w-sm tracking-tight"
      >
        Bora descobrir a piscina ideal pro seu quintal?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="text-lg text-muted-foreground mb-10 max-w-md"
      >
        São <strong className="text-secondary">4 perguntinhas</strong>. Em menos de
        1 minuto a gente já manda o catálogo pro seu WhatsApp.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="w-full max-w-xs"
      >
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
      </motion.div>
    </ScreenContainer>
  );
};
