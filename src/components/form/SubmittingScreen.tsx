import { useEffect } from "react";
import { useFormStore } from "@/store/useFormStore";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScreenContainer } from "./ScreenContainer";
import { calcScore, normalizeWhatsapp } from "@/lib/leads";

/**
 * Gera um UUID v4 válido compatível com Chrome 88+.
 * crypto.randomUUID() só existe no Chrome 92+, mas
 * crypto.getRandomValues() existe desde Chrome 37.
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: UUID v4 via crypto.getRandomValues() (Chrome 37+)
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version 4 and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Último fallback: UUID v4 sem crypto (muito improvável de chegar aqui)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const SubmittingScreen = () => {
  const { data, feiraId, feiraNome, setStep, setSubmitted } = useFormStore();

  useEffect(() => {
    const submit = async () => {
      try {
        const { score, temperatura } = calcScore({
          prazo_compra: data.prazo_compra,
          orcamento: data.orcamento,
          email: data.email,
          tamanho_quintal: data.tamanho_quintal,
        });

        const leadId = generateUUID();

        const params = new URLSearchParams(window.location.search);

        // Tenta via Edge Function (captura IP + rate limiting)
        // Fallback para insert direto se a função não estiver disponível
        let useEdgeFunction = true;
        let result: { leadId: string; score: number; temperatura: "quente" | "morno" | "frio" } | null = null;

        if (useEdgeFunction) {
          const { data: fnData, error: fnError } = await supabase.functions.invoke("submit-lead", {
            body: {
              id: leadId,
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
              evento: feiraNome || "Evento Splash",
              feira_id: feiraId || null,
              utm_source: params.get("utm_source"),
              utm_medium: params.get("utm_medium"),
              utm_campaign: params.get("utm_campaign"),
              user_agent: navigator.userAgent,
            },
          });

          if (fnError) {
            // Rate limit excedido
            if (fnError.message?.includes("429") || (fnData as any)?.error === "RATE_LIMIT_EXCEEDED") {
              toast.error("Muitas tentativas. Aguarde alguns minutos.", { duration: 6000 });
              setStep(5);
              return;
            }
            // Duplicata detectada
            if ((fnData as any)?.error === "LEAD_DUPLICATE" || fnError.message?.includes("409")) {
              setSubmitted({ leadId: "", score: 0, temperatura: "frio", isDuplicate: true });
              setTimeout(() => setStep(7), 300);
              return;
            }
            // Edge Function não disponível → fallback para insert direto
            console.warn("Edge Function indisponível, usando fallback direto:", fnError);
            useEdgeFunction = false;
          } else {
            result = { leadId: (fnData as any).leadId, score: (fnData as any).score, temperatura: (fnData as any).temperatura };
          }
        }

        // Fallback: insert direto (sem captura de IP)
        if (!useEdgeFunction || !result) {
          const { error } = await supabase.from("leads").insert({
            id: leadId,
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
            evento: feiraNome || "Evento Splash",
            feira_id: feiraId || null,
            utm_source: params.get("utm_source"),
            utm_medium: params.get("utm_medium"),
            utm_campaign: params.get("utm_campaign"),
            user_agent: navigator.userAgent,
          });

          if (error) {
            if (error.code === "P0002" || error.message?.includes("LEAD_DUPLICATE")) {
              setSubmitted({ leadId: "", score: 0, temperatura: "frio", isDuplicate: true });
              setTimeout(() => setStep(7), 300);
              return;
            }
            throw error;
          }
          result = { leadId, score, temperatura };
        }

        setSubmitted({ leadId: result.leadId, score: result.score, temperatura: result.temperatura });
        setTimeout(() => setStep(7), 700);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Algo deu errado";
        console.error("Erro ao salvar lead:", err);
        toast.error(`Não conseguimos salvar: ${msg}. Tenta de novo?`, { duration: 5000 });
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

