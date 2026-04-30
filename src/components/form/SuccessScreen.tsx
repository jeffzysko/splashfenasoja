import { useFormStore } from "@/store/useFormStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { ScreenContainer } from "./ScreenContainer";

export const SuccessScreen = () => {
  const { data, reset } = useFormStore();
  const firstName = data.nome.split(" ")[0] || "amigo(a)";

  return (
    <ScreenContainer centered>
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-accent/15 flex items-center justify-center mb-6 shadow-[0_12px_40px_-12px_color-mix(in_oklab,var(--accent)_55%,transparent)]"
      >
        <CheckCircle2 className="w-14 h-14 text-accent" strokeWidth={2.2} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[32px] leading-tight font-extrabold text-secondary mb-3 max-w-sm tracking-tight"
      >
        Prontinho, {firstName}! 🎉
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-secondary mb-2 max-w-md"
      >
        Em instantes você recebe o catálogo no WhatsApp.
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground mb-10 max-w-md"
      >
        Um consultor da Splash vai te chamar pra tirar dúvidas e montar uma
        proposta sob medida.
      </motion.p>
      <Button
        onClick={reset}
        size="lg"
        variant="outline"
        className="border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground rounded-2xl h-[56px] px-8 font-bold"
      >
        Cadastrar outro lead
      </Button>
    </ScreenContainer>
  );
};
