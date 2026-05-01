import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLeads } from "@/lib/leadsRealtime";
import { getAdjacentLeadIds } from "@/lib/leadsNavigation";
import {
  LeadDetailView,
  LeadDetailLoading,
  LeadDetailError,
  type LeadDetail,
} from "@/components/leads/LeadDetailView";

export const Route = createFileRoute("/_authenticated/admin/leads/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error) throw error;
    return data as LeadDetail;
  },
  staleTime: 2 * 60_000,
  gcTime: 10 * 60_000,
  pendingMs: 0,
  pendingComponent: PendingDetail,
  errorComponent: ErrorDetail,
  component: LeadDetailPage,
});

function PendingDetail() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/admin/leads">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h2 className="text-xl font-extrabold text-secondary tracking-tight">Detalhes do Lead</h2>
      </div>
      <LeadDetailLoading />
    </div>
  );
}

function ErrorDetail({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/admin/leads">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h2 className="text-xl font-extrabold text-secondary tracking-tight">Detalhes do Lead</h2>
      </div>
      <LeadDetailError
        message={error?.message || "Erro ao carregar."}
        onRetry={() => router.invalidate()}
      />
    </div>
  );
}

function LeadDetailPage() {
  const initial = Route.useLoaderData();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail>(initial);
  useEffect(() => {
    setLead(initial);
  }, [initial]);

  // Vizinhos vindos da lista visível persistida.
  const nav = useMemo(() => getAdjacentLeadIds(initial.id), [initial.id]);

  const goTo = (id: string | null) => {
    if (!id) return;
    router.navigate({ to: "/admin/leads/$id", params: { id } });
  };

  // Atalhos de teclado: ← → para anterior/próximo, Esc volta para a lista.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignora quando o foco está em campos editáveis (não atrapalha edição).
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          t.isContentEditable
        ) {
          return;
        }
      }
      if (e.key === "ArrowLeft" && nav.prev) {
        e.preventDefault();
        goTo(nav.prev);
      } else if (e.key === "ArrowRight" && nav.next) {
        e.preventDefault();
        goTo(nav.next);
      } else if (e.key === "Escape") {
        router.navigate({ to: "/admin/leads" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.prev, nav.next]);

  // Swipe horizontal para alternar leads no mobile.
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    // Threshold: distância horizontal forte, vertical baixa, tempo curto.
    const HORIZ = 60;
    const VERT_TOL = 50;
    if (dt > 600) return;
    if (Math.abs(dx) < HORIZ) return;
    if (Math.abs(dy) > VERT_TOL) return;
    if (dx < 0 && nav.next) goTo(nav.next);
    else if (dx > 0 && nav.prev) goTo(nav.prev);
  };

  // Realtime: aplica UPDATE/DELETE deste lead vindos de outras abas/usuários
  useEffect(() => {
    const unsub = subscribeLeads((event, payload) => {
      if (event === "UPDATE") {
        const next = payload.new as Partial<LeadDetail> & { id: string };
        if (next.id !== initial.id) return;
        setLead((prev) => ({ ...prev, ...(next as LeadDetail) }));
      } else if (event === "DELETE") {
        const old = payload.old as { id: string };
        if (old.id !== initial.id) return;
        router.navigate({ to: "/admin/leads" });
      }
    });
    return () => unsub();
  }, [initial.id, router]);

  const handleDeleted = () => {
    router.invalidate();
    router.navigate({ to: "/admin/leads" });
  };

  const hasNav = nav.index >= 0 && nav.total > 0;

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
          <Link to="/admin/leads">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h2 className="text-xl font-extrabold text-secondary tracking-tight min-w-0 truncate">
          Detalhes do Lead
        </h2>
        {hasNav && (
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <span
              className="hidden xs:inline text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground tabular-nums px-1"
              aria-live="polite"
            >
              {nav.index + 1} / {nav.total}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10"
              disabled={!nav.prev}
              onClick={() => goTo(nav.prev)}
              aria-label="Lead anterior (←)"
              title="Anterior (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10"
              disabled={!nav.next}
              onClick={() => goTo(nav.next)}
              aria-label="Próximo lead (→)"
              title="Próximo (→)"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
      <LeadDetailView lead={lead} onUpdate={setLead} onDeleted={handleDeleted} />
    </div>
  );
}
