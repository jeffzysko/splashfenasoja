import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_PREFS,
  fetchPrefs,
  loadPrefs,
  persistPrefs,
  type NotifPrefs,
} from "@/lib/notifPrefs";

/**
 * Hook centralizado de preferências de notificação.
 * - Carrega instantâneo via localStorage.
 * - Sincroniza com Supabase (per-user) em background.
 * - Persiste alterações no Supabase + localStorage.
 * - Escuta evento `notif-prefs-changed` para refletir mudanças entre componentes.
 */
export function useNotifPrefs() {
  const [prefs, setPrefs] = useState<NotifPrefs>(() => loadPrefs());
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Descobre user atual e busca prefs no Supabase
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) {
        setHydrated(true);
        return;
      }
      fetchPrefs(uid).then((p) => {
        if (!cancelled) {
          setPrefs(p);
          setHydrated(true);
        }
      });
    });
    return () => { cancelled = true; };
  }, []);

  // Sync entre componentes (sheet, página, sino)
  useEffect(() => {
    const handler = () => setPrefs(loadPrefs());
    window.addEventListener("notif-prefs-changed", handler);
    return () => window.removeEventListener("notif-prefs-changed", handler);
  }, []);

  const update = useCallback(
    async (patch: Partial<NotifPrefs>) => {
      const next: NotifPrefs = {
        ...prefs,
        ...patch,
        temperaturas: { ...prefs.temperaturas, ...(patch.temperaturas || {}) },
        sons: { ...prefs.sons, ...(patch.sons || {}) },
      };
      setPrefs(next);
      if (userId) {
        await persistPrefs(userId, next);
      }
    },
    [prefs, userId]
  );

  const reset = useCallback(async () => {
    setPrefs(DEFAULT_PREFS);
    if (userId) await persistPrefs(userId, DEFAULT_PREFS);
  }, [userId]);

  return { prefs, update, reset, hydrated, userId };
}
