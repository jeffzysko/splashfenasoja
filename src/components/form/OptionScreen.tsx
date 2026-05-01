import { useFormStore, type LeadData } from "@/store/useFormStore";
import { ScreenContainer } from "./ScreenContainer";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type OptionField = "tamanho_quintal" | "prazo_compra" | "orcamento";

interface OptionScreenProps {
  title: string;
  subtitle: string;
  options: { value: string; label: string; hint?: string; emoji?: string }[];
  field: OptionField;
  nextStep: number;
  validation?: {
    required?: boolean;
    options?: string[];
  };
}

export const OptionScreen = ({
  title,
  subtitle,
  options,
  field,
  nextStep,
  validation,
}: OptionScreenProps) => {
  const { data, updateData, setStep } = useFormStore();
  const selected = data[field];

  const choose = (value: string) => {
    if (validation?.options && !validation.options.includes(value)) {
      console.error(`Valor inválido selecionado para ${field}: ${value}`);
      return;
    }
    updateData({ [field]: value } as Partial<LeadData>);
    setTimeout(() => setStep(nextStep), 240);
  };

  return (
    <ScreenContainer>
      <h2 className="text-[28px] leading-tight font-extrabold text-secondary mb-2 tracking-tight">
        {title}
      </h2>
      <p className="text-muted-foreground mb-7">{subtitle}</p>
      <div className="space-y-3">
        {options.map((opt, i) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => choose(opt.value)}
              className={cn(
                "w-full text-left p-5 rounded-2xl border-2 transition-all active:scale-[0.98] flex items-center gap-3",
                "animate-in fade-in slide-in-from-bottom-2 fill-mode-forwards",
                isSelected
                  ? "border-primary bg-primary/5 shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--primary)_40%,transparent)]"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
              )}
              style={{ animationDelay: `${i * 50}ms`, animationDuration: '400ms' }}
            >
              {opt.emoji && <span className="text-2xl shrink-0">{opt.emoji}</span>}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-secondary text-lg leading-tight">
                  {opt.label}
                </div>
                {opt.hint && (
                  <div className="text-muted-foreground text-sm mt-0.5">{opt.hint}</div>
                )}
              </div>
              <div
                className={cn(
                  "w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                )}
              >
                {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>
    </ScreenContainer>
  );
};