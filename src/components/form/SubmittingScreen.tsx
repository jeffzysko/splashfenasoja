import { useEffect } from "react";
import { useFormStore } from "@/store/useFormStore";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScreenContainer } from "./ScreenContainer";

export const SubmittingScreen = () => {
  const { data, setStep } = useFormStore();

  useEffect(() => {
    const submit = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const { error } = await supabase.from("leads").insert({
          nome: data.nome.trim(),
          whatsapp: data.whatsapp,
          email: data.email?.trim() || null,
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
    <ScreenContainer centered>
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-accent/20 blur-2xl animate-pulse" />
        <Loader2 className="relative w-16 h-16 text-accent animate-spin" />
      </div>
      <h2 className="text-2xl font-extrabold text-secondary mb-2">Quase lá...</h2>
      <p className="text-muted-foreground">Salvando seus dados com segurança 🔒</p>
    </ScreenContainer>
  );
};
