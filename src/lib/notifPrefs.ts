import { supabase } from "@/integrations/supabase/client";
import type { Temperatura } from "@/lib/leads";

export type NotifSound = "ding" | "chime" | "pop" | "alert" | "soft" | "none";

export const SOUND_OPTIONS: { value: NotifSound; label: string; url: string | null }[] = [
  { value: "ding",  label: "Ding (padrão)",  url: "https://cdn.gpteng.co/ding.mp3" },
  { value: "chime", label: "Sino suave",     url: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg" },
  { value: "pop",   label: "Pop",            url: "https://actions.google.com/sounds/v1/cartoon/pop.ogg" },
  { value: "alert", label: "Alerta forte",   url: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg" },
  { value: "soft",  label: "Toque discreto", url: "https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg" },
  { value: "none",  label: "Sem som",        url: null },
];

export function soundUrl(s: NotifSound): string | null {
  return SOUND_OPTIONS.find((o) => o.value === s)?.url ?? null;
}

export type NotifPrefs = {
  soundEnabled: boolean;
  toastEnabled: boolean;
  temperaturas: Record<Temperatura, boolean>;
  sons: Record<Temperatura, NotifSound>;
  /** Modo "Não perturbe": silencia toast + som dentro da janela. */
  quietEnabled: boolean;
  /** Horas (0-23). Se start <= end: janela do mesmo dia. Se start > end: cruza meia-noite. */
  quietStart: number;
  quietEnd: number;
};

const KEY = "notif_prefs_v2";

export const DEFAULT_PREFS: NotifPrefs = {
  soundEnabled: false,
  toastEnabled: true,
  temperaturas: { quente: true, morno: true, frio: false },
  sons: { quente: "alert", morno: "ding", frio: "soft" },
  quietEnabled: false,
  quietStart: 20,
  quietEnd: 8,
};

function mergeDefaults(parsed: Partial<NotifPrefs>): NotifPrefs {
  return {
    ...DEFAULT_PREFS,
    ...parsed,
    temperaturas: { ...DEFAULT_PREFS.temperaturas, ...(parsed.temperaturas || {}) },
    sons: { ...DEFAULT_PREFS.sons, ...(parsed.sons || {}) },
  };
}

export function loadPrefs(): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // Migra do v1 (notif_prefs_v1) e da chave legada notifSound
      const v1 = localStorage.getItem("notif_prefs_v1");
      if (v1) {
        try { return mergeDefaults(JSON.parse(v1)); } catch { /* ignore */ }
      }
      const legacy = localStorage.getItem("notifSound");
      if (legacy === "on") return { ...DEFAULT_PREFS, soundEnabled: true };
      return DEFAULT_PREFS;
    }
    return mergeDefaults(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: NotifPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  localStorage.setItem("notifSound", p.soundEnabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent("notif-prefs-changed"));
}

/* ---------- Supabase sync (per-user) ---------- */

type Row = {
  user_id: string;
  sound_enabled: boolean;
  toast_enabled: boolean;
  notif_quente: boolean;
  notif_morno: boolean;
  notif_frio: boolean;
  sound_quente: string;
  sound_morno: string;
  sound_frio: string;
  quiet_enabled: boolean;
  quiet_start: number;
  quiet_end: number;
};

function rowToPrefs(r: Row): NotifPrefs {
  const validSound = (s: string): NotifSound =>
    (SOUND_OPTIONS.find((o) => o.value === s)?.value ?? "ding") as NotifSound;
  return {
    soundEnabled: r.sound_enabled,
    toastEnabled: r.toast_enabled,
    temperaturas: { quente: r.notif_quente, morno: r.notif_morno, frio: r.notif_frio },
    sons: {
      quente: validSound(r.sound_quente),
      morno: validSound(r.sound_morno),
      frio: validSound(r.sound_frio),
    },
    quietEnabled: r.quiet_enabled,
    quietStart: r.quiet_start,
    quietEnd: r.quiet_end,
  };
}

function prefsToRow(userId: string, p: NotifPrefs): Row {
  return {
    user_id: userId,
    sound_enabled: p.soundEnabled,
    toast_enabled: p.toastEnabled,
    notif_quente: p.temperaturas.quente,
    notif_morno: p.temperaturas.morno,
    notif_frio: p.temperaturas.frio,
    sound_quente: p.sons.quente,
    sound_morno: p.sons.morno,
    sound_frio: p.sons.frio,
    quiet_enabled: p.quietEnabled,
    quiet_start: p.quietStart,
    quiet_end: p.quietEnd,
  };
}

export async function fetchPrefs(userId: string): Promise<NotifPrefs> {
  const { data, error } = await supabase
    .from("user_notif_prefs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return loadPrefs();
  const prefs = rowToPrefs(data as Row);
  // Espelha em localStorage para resposta instantânea no próximo load
  savePrefs(prefs);
  return prefs;
}

export async function persistPrefs(userId: string, p: NotifPrefs): Promise<void> {
  savePrefs(p); // local sempre primeiro para feedback imediato
  const row = prefsToRow(userId, p);
  await supabase.from("user_notif_prefs").upsert(row, { onConflict: "user_id" });
}

/* ---------- Quiet hours ---------- */

export function isInQuietHours(p: NotifPrefs, now = new Date()): boolean {
  if (!p.quietEnabled) return false;
  const h = now.getHours();
  const { quietStart: s, quietEnd: e } = p;
  if (s === e) return false;
  if (s < e) return h >= s && h < e;
  return h >= s || h < e;
}

export function shouldNotify(p: NotifPrefs, temperatura: Temperatura): {
  toast: boolean;
  sound: boolean;
  soundUrl: string | null;
} {
  if (!p.temperaturas[temperatura]) return { toast: false, sound: false, soundUrl: null };
  const quiet = isInQuietHours(p);
  return {
    toast: p.toastEnabled && !quiet,
    sound: p.soundEnabled && !quiet,
    soundUrl: soundUrl(p.sons[temperatura]),
  };
}
