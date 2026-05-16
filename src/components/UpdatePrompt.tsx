import { useEffect, useState, useCallback } from "react";
import { APP_VERSION } from "@/lib/appVersion";
import { RefreshCw, Sparkles, X, Zap } from "lucide-react";

/**
 * Faz polling em /version.json e mostra um banner quando a versão
 * publicada difere da que está rodando no cliente.
 *
 * - Polling a cada 60s + ao voltar para a aba (visibilitychange).
 * - "Atualizar agora" limpa TODO o cache ANTES de recarregar (corrigido).
 * - "Mais tarde" esconde até a próxima checagem encontrar nova versão.
 */

type Phase = "idle" | "clearing" | "reloading";

const PHASE_MESSAGES: Record<Phase, string> = {
  idle: "Atualize para receber as últimas melhorias.",
  clearing: "Limpando cache local…",
  reloading: "Recarregando o app…",
};

export function UpdatePrompt() {
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { version?: string };
      if (data.version && data.version !== APP_VERSION) {
        setLatest(data.version);
      }
    } catch {
      // silencioso — rede instável não deve bloquear o app
    }
  }, []);

  useEffect(() => {
    check();
    const id = window.setInterval(check, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  const reload = async () => {
    setPhase("clearing");
    try {
      // 1. Limpar TODOS os caches do SW (AWAIT obrigatório antes de recarregar)
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // 2. Desregistrar todos os service workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      // segue para reload mesmo se a limpeza falhar
    }
    setPhase("reloading");
    // 3. Pequeno delay para o usuário ver "Recarregando…" e o SW terminar
    await new Promise((r) => setTimeout(r, 300));
    // 4. Hard reload — ignora cache do browser também
    window.location.href =
      window.location.origin +
      window.location.pathname.replace(/\?.*$/, "") +
      "?nocache=" +
      Date.now();
  };

  const show = latest && latest !== dismissed;
  if (!show) return null;

  const busy = phase !== "idle";
  const message = PHASE_MESSAGES[phase];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={busy}
      className="fixed left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-md px-3 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
    >
      <div className="pointer-events-auto bg-secondary text-secondary-foreground rounded-2xl shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--secondary)_50%,transparent)] border border-white/10 overflow-hidden">
        {/* Linha 1: ícone + texto + fechar */}
        <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            {busy ? (
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">
              {busy ? "Atualizando…" : "Nova versão disponível"}
            </p>
            <p className="text-[11px] opacity-80 leading-snug mt-0.5">
              {message}
            </p>
          </div>
          {!busy && (
            <button
              onClick={() => setDismissed(latest)}
              aria-label="Adiar atualização"
              className="w-7 h-7 -mt-0.5 -mr-1 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 active:scale-95 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Barra de progresso quando ocupado */}
        {busy && (
          <div className="h-1 bg-white/10 overflow-hidden">
            <div className="h-full w-1/3 bg-primary animate-[slide_1.2s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Ações */}
        {!busy && (
          <div className="flex items-stretch gap-2 px-3 pb-3">
            <button
              onClick={() => setDismissed(latest)}
              className="flex-1 h-10 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 active:scale-[0.98] transition"
            >
              Mais tarde
            </button>
            <button
              onClick={reload}
              className="flex-[1.5] h-10 rounded-xl text-xs font-black uppercase tracking-wide bg-primary text-primary-foreground active:scale-[0.98] transition flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Atualizar agora
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
