import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Altura em px. Largura é proporcional. */
  height?: number;
}

/**
 * Logo Splash Piscinas Oficial
 */
export const Logo: React.FC<LogoProps> = ({
  className,
  height = 56,
}) => {
  return (
    <div className={cn("relative inline-block overflow-hidden", className)} style={{ height }}>
      <img 
        src="/logo_splash.svg" 
        alt="Splash Piscinas"
        className="h-full w-auto block object-contain"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
};
