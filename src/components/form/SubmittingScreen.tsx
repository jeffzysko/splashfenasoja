import { useEffect } from "react";
import { useFormStore } from "@/store/useFormStore";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScreenContainer } from "./ScreenContainer";
import { calcScore, normalizeWhatsapp } from "@/lib/leads";

export const SubmittingScreen = () => {
  const { data, setStep, setSubmitted } = useFormStore();

  useEffect(() => {
    const submit = async () => {
      try {
        const { score, temperatura } = calcScore({
          prazo_compra: data.prazo_compra,
          orcamento: data.orcamento,
          email: data.email,
          tamanho_quintal: data.tamanho_quintal,
        });

        const params = new URLSearchParams(window.location.search);
        const { data: inserted, error } = await supabase
          .from("leads")
          .insert({
            nome: data.nome.trim(),
            whatsapp: normalizeWhatsapp(data.whatsapp),
            email: data.email?.trim() || null,
            cidade: data.cidade,
            estado: data.estado,
            tamanho_quintal: data.tamanho_quintal,
            prazo_compra: data.prazo_compra,
            orcamento: data.orcamento,
            score,
            temperatura,
            evento: "FENASOJA 2026",
            utm_source: params.get("utm_source"),
            utm_medium: params.get("utm_medium"),
            utm_campaign: params.get("utm_campaign"),
            user_agent: navigator.userAgent,
          })
          .select("id")
          .single();
        if (error) throw error;

        setSubmitted({ leadId: inserted.id, score, temperatura });
        setTimeout(() => setStep(7), 700);
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
      <h2 className="text-2xl font-extrabold text-secondary mb-2">
        Preparando seu material...
      </h2>
      <p className="text-muted-foreground">Salvando seus dados com segurança 🔒</p>
    </ScreenContainer>
  );
};
