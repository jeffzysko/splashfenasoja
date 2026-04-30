import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ScreenContainerProps {
  children: ReactNode;
  /** Mostrar como tela cheia centralizada (Welcome, Submitting, Success) */
  centered?: boolean;
}

/**
 * Wrapper com animação suave de entrada/saída usado por todas as telas
 * do formulário. Mantém o ritmo entre passos consistente.
 */
export const ScreenContainer = ({ children, centered = false }: ScreenContainerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={
        centered
          ? "flex-1 flex flex-col items-center justify-center p-6 text-center w-full max-w-md mx-auto"
          : "p-6 max-w-md mx-auto w-full"
      }
    >
      {children}
    </motion.div>
  );
};
