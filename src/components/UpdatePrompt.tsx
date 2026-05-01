import { useEffect, useState, useCallback } from "react";
import { APP_VERSION } from "@/lib/appVersion";
import { RefreshCw, X } from "lucide-react";

/**
 * Faz polling em /version.json e mostra um banner quando a versão
 * publicada difere da que está rodando no cliente.
 *
 * - Polling a cada 60s + ao voltar para a aba (visibilitychange).
 * - "Atualizar" recarrega a página com cache-bust e tenta limpar caches.
 * - "Adiar" esconde até a próxima checagem encontrar nova versão.
 */
export function UpdatePrompt() {
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    setRefreshing(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      // segue para reload mesmo se a limpeza falhar
    }
    const url = new URL(window.location.href);
    url.searchParams.set("v", latest ?? String(Date.now()));
    window.location.replace(url.toString());
  };

  const show = latest && latest !== dismissed;
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-md px-3 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
    >
      <div className="pointer-events-auto bg-secondary text-secondary-foreground rounded-2xl shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--secondary)_50%,transparent)] border border-white/10 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <RefreshCw className={`w-4 h-4 text-primary ${refreshing ? "animate-spin" : ""}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Nova versão disponível</p>
          <p className="text-[11px] opacity-80 leading-tight mt-0.5">
            Atualize para receber as últimas melhorias.
          </p>
        </div>
        <button
          onClick={reload}
          disabled={refreshing}
          className="bg-primary text-primary-foreground rounded-xl px-3 h-9 text-xs font-black uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-60"
        >
          Atualizar
        </button>
        <button
          onClick={() => setDismissed(latest)}
          aria-label="Adiar atualização"
          className="w-8 h-8 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 active:scale-95 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
