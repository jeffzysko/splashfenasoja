import React from "react";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo-quintalideal.png";

interface LogoQuintalIdealProps {
  className?: string;
  height?: number;
}

/**
 * Logo Quintal Ideal — usado no topo do painel admin e na tela de login.
 * O formulário público continua com o logo Splash.
 */
export const LogoQuintalIdeal: React.FC<LogoQuintalIdealProps> = ({
  className,
  height = 36,
}) => {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden",
        className,
      )}
      style={{ height }}
    >
      <img
        src={logoUrl}
        alt="Quintal Ideal"
        className="h-full w-auto block object-contain"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
};
