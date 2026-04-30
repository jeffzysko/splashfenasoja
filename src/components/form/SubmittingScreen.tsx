import { useEffect } from "react";
import { useFormStore } from "@/store/useFormStore";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SubmittingScreen = () => {
  const { data, setStep } = useFormStore();

  useEffect(() => {
    const submit = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const { error } = await supabase.from("leads").insert({
          nome: data.nome,
          whatsapp: data.whatsapp,
          email: data.email || null,
          cidade: data.cidade,
          estado: data.estado,
          tamanho_quintal: data.tamanho_quintal,
          prazo_compra: data.prazo_compra,
          orcamento: data.orcamento,
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          user_agent: navigator.userAgent,
        });
        if (error) throw error;
        setTimeout(() => setStep(7), 800);
      } catch (err) {
        console.error("Erro ao salvar lead:", err);
        toast.error("Ops, algo deu errado. Tenta de novo?");
        setStep(5);
      }
    };
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-16 h-16 text-accent animate-spin mb-6" />
      <h2 className="text-2xl font-bold text-secondary mb-2">Quase lá...</h2>
      <p className="text-muted-foreground">Salvando seus dados com segurança 🔒</p>
    </div>
  );
};
