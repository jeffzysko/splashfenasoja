import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Altura em px. Largura é proporcional. */
  height?: number;
  /** Variante de cor. */
  variant?: "navy" | "white";
}

/**
 * Logo Splash Piscinas — wordmark "splash" com gota laranja sobre o "i".
 * SVG vetorial: nítido em qualquer tamanho.
 */
export const Logo: React.FC<LogoProps> = ({
  className,
  height = 56,
  variant = "navy",
}) => {
  const wordColor =
    variant === "white" ? "oklch(1 0 0)" : "var(--splash-navy)";

  return (
    <svg
      role="img"
      aria-label="Splash Piscinas"
      viewBox="0 0 320 96"
      height={height}
      className={cn("select-none", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gota laranja substituindo o pingo do "i" do wordmark "splash" */}
      <path
        d="M205 6 C 205 16 218 22 218 32 C 218 39.7 212.2 45 205 45 C 197.8 45 192 39.7 192 32 C 192 22 205 16 205 6 Z"
        fill="var(--splash-orange)"
      />
      <text
        x="0"
        y="78"
        fontFamily="ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif"
        fontSize="78"
        fontWeight="900"
        letterSpacing="-3"
        fill={wordColor}
      >
        splash
      </text>
    </svg>
  );
};
