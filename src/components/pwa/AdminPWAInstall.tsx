import { useEffect, useState } from "react";
import { Download, X, Share, MoreVertical } from "lucide-react";

/**
 * Banner de instalação do PWA admin.
 *
 * Android/Chrome → captura `beforeinstallprompt` e oferece instalação nativa.
 * iOS/Safari     → detecta que o app não está em modo standalone e exibe
 *                  instruções de "Adicionar à Tela de Início".
 *
 * Comportamento:
 * - Não aparece se já estiver rodando como PWA (standalone).
 * - Pode ser dispensado pelo usuário (dismissal persiste na sessão).
 * - Posicionado acima do bottom nav, igual ao UpdatePrompt.
 */

const DISMISS_KEY = "splash_admin_pwa_dismissed";

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInStandaloneMode() {
  return (
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function AdminPWAInstall() {
  const [installEvent, setInstallEvent] =
    useState<Event & { prompt?: () => Promise<void> } | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Já é PWA ou usuário já dispensou nesta sessão
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
      return;
    }

    // Android/Chrome: captura o evento nativo
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as Event & { prompt?: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS/Safari: sem beforeinstallprompt — mostra instrução manual
    if (isIOS() && !isInStandaloneMode()) {
      // Pequeno delay para não aparecer imediatamente ao carregar a página
      const t = window.setTimeout(() => setShowIOS(true), 3_000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        window.clearTimeout(t);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    setInstallEvent(null);
    setShowIOS(false);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  const install = async () => {
    if (!installEvent?.prompt) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
    } catch { /* user cancelled */ }
    setInstallEvent(null);
    setInstalling(false);
  };

  // Nada a mostrar
  const visible = !dismissed && (!!installEvent || showIOS);
  if (!visible) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[99] w-[calc(100%-1.5rem)] max-w-md px-3 pointer-events-none sm:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
    >
      <div className="pointer-events-auto bg-secondary text-secondary-foreground rounded-2xl shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--secondary)_50%,transparent)] border border-white/10 overflow-hidden">

        {/* Cabeçalho */}
        <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Instalar Splash Admin</p>
            <p className="text-[11px] opacity-75 leading-snug mt-0.5">
              {showIOS
                ? "Adicione à tela de início para acesso rápido."
                : "Acesso direto sem abrir o navegador."}
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dispensar"
            className="w-7 h-7 -mt-0.5 -mr-1 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 active:scale-95 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* iOS: instruções passo a passo */}
        {showIOS && (
          <div className="px-4 pb-3.5 space-y-2">
            <div className="bg-white/10 rounded-xl p-3 space-y-2 text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center shrink-0 text-[9px] font-black">1</div>
                <span className="flex items-center gap-1">
                  Toque em <Share className="w-3.5 h-3.5 inline opacity-90" /> <strong>Compartilhar</strong> no Safari
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center shrink-0 text-[9px] font-black">2</div>
                <span>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center shrink-0 text-[9px] font-black">3</div>
                <span>Confirme tocando em <strong>Adicionar</strong></span>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="w-full h-9 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 active:scale-[0.98] transition"
            >
              Entendido
            </button>
          </div>
        )}

        {/* Android: botão de instalação nativa */}
        {installEvent && !showIOS && (
          <div className="flex items-stretch gap-2 px-3 pb-3">
            <button
              onClick={dismiss}
              className="flex-1 h-10 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 active:scale-[0.98] transition"
            >
              Agora não
            </button>
            <button
              onClick={install}
              disabled={installing}
              className="flex-[2] h-10 rounded-xl text-xs font-black uppercase tracking-wide bg-primary text-primary-foreground active:scale-[0.98] transition flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {installing ? (
                <span>Instalando…</span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Instalar app
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
