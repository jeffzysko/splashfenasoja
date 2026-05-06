import { useFormStore } from "@/store/useFormStore";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin, Ruler } from "lucide-react";
import { ScreenContainer } from "./ScreenContainer";
import { LABELS, TEMP_BADGE } from "@/lib/leads";

const SiWhatsapp = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
    <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02ZM12.04 20.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.27-4.39c0-4.54 3.7-8.24 8.27-8.24 2.21 0 4.28.86 5.84 2.42a8.18 8.18 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.26 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.41-.42-.56-.43-.14-.01-.31-.01-.47-.01a.9.9 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.16 1.74 2.65 4.21 3.71.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
  </svg>
);

export const SuccessScreen = () => {
  const { data, submitted, reset, feiraWhatsapp, feiraNome } = useFormStore();
  const firstName = data.nome.split(" ")[0] || "amigo(a)";
  const badge = TEMP_BADGE[submitted.temperatura];
  const leadShort = submitted.leadId ? submitted.leadId.slice(0, 8).toUpperCase() : "—";

  const waMessage = encodeURIComponent(
    `Oi Splash! Acabei de preencher o formulário no evento ${feiraNome || ""}. Quero receber o catálogo de piscinas de fibra. Meu nome é ${firstName}.`,
  );
  // Usa o WhatsApp da feira; se não tiver, oculta o botão
  const waNumber = feiraWhatsapp ? feiraWhatsapp.replace(/\D/g, "") : null;
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : null;

  // Tela alternativa para lead duplicado
  if (submitted.isDuplicate) {
    return (
      <ScreenContainer centered>
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-5 animate-in zoom-in-50 fade-in duration-500">
          <CheckCircle2 className="w-12 h-12 text-blue-500" strokeWidth={2.2} />
        </div>
        <h1 className="text-[28px] leading-tight font-extrabold text-secondary mb-2 max-w-sm tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
          Você já está no nosso sistema!
        </h1>
        <p className="text-base text-muted-foreground mb-8 max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500 delay-250">
          Em breve um especialista da Splash entrará em contato com você pelo WhatsApp.
        </p>
        <div className="w-full max-w-sm space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-350">
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer" className="block">
              <Button
                size="lg"
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white h-[60px] rounded-2xl text-lg font-bold shadow-lg gap-2"
              >
                <SiWhatsapp />
                Chamar especialista agora!
              </Button>
            </a>
          )}
          <button
            onClick={reset}
            className="w-full text-secondary hover:text-primary text-sm font-bold py-3 transition-colors"
          >
            Cadastrar outro visitante
          </button>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer centered>
      <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center mb-5 shadow-[0_12px_40px_-12px_color-mix(in_oklab,var(--accent)_55%,transparent)] animate-in zoom-in-50 fade-in duration-500 delay-100 fill-mode-forwards">
        <CheckCircle2 className="w-12 h-12 text-accent" strokeWidth={2.2} />
      </div>

      <h1 className="text-[30px] leading-tight font-extrabold text-secondary mb-2 max-w-sm tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500 delay-250">
        Pronto, {firstName}! 🎉
      </h1>
      <p className="text-base text-muted-foreground mb-6 max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500 delay-350">
        Logo mais um especialista da {feiraNome || "Splash"} irá te chamar no WhatsApp.
      </p>

      <div className="w-full max-w-sm bg-card border-2 border-border rounded-2xl p-5 mb-6 text-left animate-in fade-in slide-in-from-bottom-3 duration-500 delay-450">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Lead nº {leadShort}
          </span>
          <span
            className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-secondary">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            {data.cidade} <span className="text-muted-foreground">/ {data.estado}</span>
          </div>
          <div className="flex items-center gap-2 text-secondary">
            <Ruler className="w-4 h-4 text-muted-foreground shrink-0" />
            Quintal: {LABELS.tamanho_quintal[data.tamanho_quintal] ?? data.tamanho_quintal}
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-550">
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer" className="block">
            <Button
              size="lg"
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white h-[60px] rounded-2xl text-lg font-bold shadow-lg gap-2"
            >
              <SiWhatsapp />
              Chamar especialista agora!
            </Button>
          </a>
        )}

        <button
          onClick={reset}
          className="w-full text-secondary hover:text-primary text-sm font-bold py-3 transition-colors"
        >
          Cadastrar outro visitante
        </button>

        <p className="text-xs text-muted-foreground pt-2">
          Algum vendedor da Splash já foi notificado e vai te chamar logo logo.
        </p>
      </div>
    </ScreenContainer>
  );
};
