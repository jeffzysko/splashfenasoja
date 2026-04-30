import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Altura em px. Largura é proporcional. */
  height?: number;
}

/**
 * Logo Splash Piscinas — wordmark "splash" em azul-marinho com gota laranja
 * substituindo o pingo do "i". Renderizado em SVG para ficar nítido em
 * qualquer tamanho.
 */
export const Logo: React.FC<LogoProps> = ({ className, height = 56 }) => {
  return (
    <svg
      role="img"
      aria-label="Splash Piscinas"
      viewBox="0 0 280 80"
      height={height}
      className={cn("select-none", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="62"
        fontFamily="ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif"
        fontSize="64"
        fontWeight="800"
        letterSpacing="-2"
        fill="var(--splash-navy)"
      >
        splash
      </text>
      {/* Gota laranja sobre o "i" (posicionada acima da letra) */}
      <path
        d="M150 18 c-5 -10 -14 -16 -14 -22 c0 -7 6 -12 14 -12 c8 0 14 5 14 12 c0 6 -9 12 -14 22z"
        transform="translate(0 0)"
        fill="var(--splash-orange)"
      />
    </svg>
  );
};
