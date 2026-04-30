import { useFormStore, type LeadData } from "@/store/useFormStore";

type OptionField = "tamanho_quintal" | "prazo_compra" | "orcamento";

interface OptionScreenProps {
  title: string;
  subtitle: string;
  options: { value: string; label: string; hint?: string }[];
  field: OptionField;
  nextStep: number;
}

export const OptionScreen = ({
  title,
  subtitle,
  options,
  field,
  nextStep,
}: OptionScreenProps) => {
  const { data, updateData, setStep } = useFormStore();
  const selected = data[field];

  const choose = (value: string) => {
    updateData({ [field]: value } as Partial<LeadData>);
    setTimeout(() => setStep(nextStep), 200);
  };

  return (
    <div className="p-6 max-w-md mx-auto w-full">
      <h2 className="text-2xl font-bold text-secondary mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{subtitle}</p>
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => choose(opt.value)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all active:scale-[0.98] ${
              selected === opt.value
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="font-bold text-secondary text-lg">{opt.label}</div>
            {opt.hint && (
              <div className="text-muted-foreground text-sm mt-1">{opt.hint}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
