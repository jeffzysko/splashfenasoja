import { useFormStore } from "@/store/useFormStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const SuccessScreen = () => {
  const { data, reset } = useFormStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-accent" />
      </div>
      <h1 className="text-3xl font-bold text-secondary mb-4 max-w-sm">
        Prontinho, {data.nome.split(" ")[0]}! 🎉
      </h1>
      <p className="text-lg text-secondary mb-2 max-w-md">
        Em instantes você recebe o catálogo no WhatsApp.
      </p>
      <p className="text-muted-foreground mb-8 max-w-md">
        Um consultor da Splash vai te chamar pra tirar dúvidas e montar uma proposta sob medida.
      </p>
      <Button
        onClick={reset}
        size="lg"
        variant="outline"
        className="border-secondary text-secondary rounded-2xl h-[56px] px-8"
      >
        Cadastrar outro lead
      </Button>
    </div>
  );
};
