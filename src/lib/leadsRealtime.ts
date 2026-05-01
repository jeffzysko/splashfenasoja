/**
 * Broadcaster Realtime único para a tabela `leads`.
 *
 * Antes: cada componente (Dashboard, NotificationBell, lista de Leads)
 * abria seu próprio canal Supabase Realtime — 3 conexões WS, 3 listeners
 * independentes, mais bandwidth e mais CPU em mobile.
 *
 * Agora: um único canal compartilhado faz fan-out para N assinantes.
 * Se ninguém estiver escutando, o canal é desligado automaticamente.
 */
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type AnyLead = Record<string, unknown> & { id: string };
type Event = "INSERT" | "UPDATE" | "DELETE";
type Listener = (event: Event, payload: RealtimePostgresChangesPayload<AnyLead>) => void;

const listeners = new Set<Listener>();
let channel: ReturnType<typeof supabase.channel> | null = null;

function ensureChannel() {
  if (channel) return;
  channel = supabase
    .channel("leads-shared")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "leads" },
      (p) => listeners.forEach((cb) => cb("INSERT", p as never))
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "leads" },
      (p) => listeners.forEach((cb) => cb("UPDATE", p as never))
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "leads" },
      (p) => listeners.forEach((cb) => cb("DELETE", p as never))
    )
    .subscribe();
}

function teardownIfIdle() {
  if (listeners.size === 0 && channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}

export function subscribeLeads(cb: Listener): () => void {
  listeners.add(cb);
  ensureChannel();
  return () => {
    listeners.delete(cb);
    teardownIfIdle();
  };
}
