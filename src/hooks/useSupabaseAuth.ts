import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook que mantém estado reativo da sessão de auth do Supabase.
 * IMPORTANTE: registra o listener ANTES de chamar getSession() pra evitar
 * race condition (recomendação oficial).
 */
export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Listener primeiro
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    // 2) Depois pega a sessão atual
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? (null as User | null),
    loading,
    isAuthenticated: !!session,
  };
}
