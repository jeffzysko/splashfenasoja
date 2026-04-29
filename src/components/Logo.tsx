import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  dotClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({ className, dotClassName }) => {
  return (
    <div className={cn("flex items-baseline font-extrabold tracking-tighter", className)}>
      <span>splash</span>
      <span className={cn("text-orange-500 ml-[-2px] relative", dotClassName)}>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 inline-block translate-y-[2px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
      </span>
    </div>
  );
};
