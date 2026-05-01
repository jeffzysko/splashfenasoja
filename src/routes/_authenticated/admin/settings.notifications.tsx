import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Cloud, CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotifPrefsForm } from "@/components/NotifPrefsForm";
import { useNotifPrefs } from "@/hooks/useNotifPrefs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings/notifications")({
  component: NotifSettingsPage,
});

function NotifSettingsPage() {
  const { prefs, update, reset, hydrated, userId } = useNotifPrefs();

  const handleReset = async () => {
    await reset();
    toast.success("Preferências restauradas para o padrão.");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/admin">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-extrabold text-secondary tracking-tight">
              Notificações
            </h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Suas preferências por dispositivo e conta
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="h-9 rounded-xl text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Restaurar padrão
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 text-xs">
        {!hydrated ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground font-medium">
              Sincronizando preferências…
            </span>
          </>
        ) : userId ? (
          <>
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-secondary">
              Sincronizado na nuvem
            </span>
            <span className="text-muted-foreground">
              · disponível em qualquer dispositivo onde você fizer login
            </span>
          </>
        ) : (
          <>
            <CloudOff className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-secondary">
              Apenas neste dispositivo
            </span>
          </>
        )}
      </div>

      <div className="bg-card border border-border rounded-3xl p-5 sm:p-6">
        <NotifPrefsForm prefs={prefs} onChange={update} />
      </div>
    </div>
  );
}
