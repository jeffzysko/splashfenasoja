import type { ReactNode } from "react";

interface ScreenContainerProps {
  children: ReactNode;
  centered?: boolean;
}

export const ScreenContainer = ({ children, centered = false }: ScreenContainerProps) => {
  return (
    <div
      className={
        centered
          ? "flex-1 flex flex-col items-center justify-center p-6 text-center w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards"
          : "p-6 max-w-md mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards"
      }
    >
      {children}
    </div>
  );
};