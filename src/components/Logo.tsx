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
    <div className={cn("relative inline-block", className)} style={{ height }}>
      <img 
        src="/logo-splash.svg" 
        alt="Splash Piscinas"
        className="h-full w-auto block"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
};
