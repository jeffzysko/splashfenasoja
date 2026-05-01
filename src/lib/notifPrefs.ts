import type { Temperatura } from "@/lib/leads";

export type NotifPrefs = {
  soundEnabled: boolean;
  toastEnabled: boolean;
  temperaturas: Record<Temperatura, boolean>;
  /** Modo "Não perturbe": silencia toast + som dentro da janela. */
  quietEnabled: boolean;
  /** Horas (0-23). Se start <= end: janela do mesmo dia. Se start > end: cruza meia-noite. */
  quietStart: number;
  quietEnd: number;
};

const KEY = "notif_prefs_v1";

export const DEFAULT_PREFS: NotifPrefs = {
  soundEnabled: false,
  toastEnabled: true,
  temperaturas: { quente: true, morno: true, frio: false },
  quietEnabled: false,
  quietStart: 20,
  quietEnd: 8,
};

export function loadPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // Migra valor antigo "notifSound" se existir
      const legacy = localStorage.getItem("notifSound");
      if (legacy === "on") return { ...DEFAULT_PREFS, soundEnabled: true };
      return DEFAULT_PREFS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed, temperaturas: { ...DEFAULT_PREFS.temperaturas, ...(parsed.temperaturas || {}) } };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: NotifPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  // Mantém a chave legada em sync para retrocompat
  localStorage.setItem("notifSound", p.soundEnabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent("notif-prefs-changed"));
}

export function isInQuietHours(p: NotifPrefs, now = new Date()): boolean {
  if (!p.quietEnabled) return false;
  const h = now.getHours();
  const { quietStart: s, quietEnd: e } = p;
  if (s === e) return false;
  if (s < e) return h >= s && h < e; // janela no mesmo dia
  return h >= s || h < e; // cruza meia-noite
}

export function shouldNotify(p: NotifPrefs, temperatura: Temperatura): {
  toast: boolean;
  sound: boolean;
} {
  if (!p.temperaturas[temperatura]) return { toast: false, sound: false };
  const quiet = isInQuietHours(p);
  return {
    toast: p.toastEnabled && !quiet,
    sound: p.soundEnabled && !quiet,
  };
}
