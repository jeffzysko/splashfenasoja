import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  staleTime: 2 * 60_000, // dados frescos por 2min — evita refetch ao revisitar
  gcTime: 10 * 60_000, // mantém em memória por 10min após sair da rota
  pendingMs: 0,
  pendingComponent: PendingDetail,
  errorComponent: ErrorDetail,
  component: LeadDetailPage,
});

function PendingDetail() {
  return (
    <div className="space-y-6 pb-20">
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
    <div className="space-y-6 pb-20">
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

  const handleDeleted = () => {
    router.invalidate();
    router.navigate({ to: "/admin/leads" });
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-right-4 duration-400">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/admin/leads">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h2 className="text-xl font-extrabold text-secondary tracking-tight">Detalhes do Lead</h2>
      </div>
      <LeadDetailView lead={lead} onUpdate={setLead} onDeleted={handleDeleted} />
    </div>
  );
}
