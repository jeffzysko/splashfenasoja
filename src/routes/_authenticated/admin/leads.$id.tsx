import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  LeadDetailView,
  LeadDetailLoading,
  LeadDetailError,
  useLeadDetail,
} from "@/components/leads/LeadDetailView";

export const Route = createFileRoute("/_authenticated/admin/leads/$id")({
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { id } = Route.useParams();
  const { lead, setLead, loading, error } = useLeadDetail(id);

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

      {loading && <LeadDetailLoading />}
      {!loading && error && (
        <LeadDetailError message={error} onRetry={() => window.location.reload()} />
      )}
      {!loading && !error && !lead && (
        <div className="text-center py-20">
          <p className="text-muted-foreground font-bold">Lead não encontrado.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/admin/leads">Voltar para a lista</Link>
          </Button>
        </div>
      )}
      {!loading && !error && lead && <LeadDetailView lead={lead} onUpdate={setLead} />}
    </div>
  );
}
