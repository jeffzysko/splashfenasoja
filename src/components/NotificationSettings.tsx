import { Link } from "@tanstack/react-router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Volume2, VolumeX, Moon, Settings2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useNotifPrefs } from "@/hooks/useNotifPrefs";
import { cn } from "@/lib/utils";
import { NotifPrefsForm } from "@/components/NotifPrefsForm";

export function NotificationSettings() {
  const [open, setOpen] = useState(false);
  const { prefs, update } = useNotifPrefs();
  const SoundIcon = prefs.soundEnabled ? Volume2 : VolumeX;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative p-2 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Configurações de notificação"
          title="Configurações de notificação"
        >
          <SoundIcon
            className={cn("w-5 h-5", prefs.soundEnabled && "text-primary")}
          />
          {prefs.quietEnabled && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-secondary flex items-center justify-center border-2 border-background">
              <Moon className="w-1.5 h-1.5 text-secondary-foreground" />
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-secondary">
            <Settings2 className="w-5 h-5 text-primary" />
            Notificações
          </SheetTitle>
          <SheetDescription>
            Personalize quando, como e com qual som você quer ser avisado.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-6">
          <NotifPrefsForm prefs={prefs} onChange={update} compact />

          <div className="mt-6 pt-4 border-t border-border">
            <Switch className="hidden" />
            <Link
              to="/admin/settings/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <div>
                <div className="text-sm font-bold text-secondary">Página completa</div>
                <div className="text-xs text-muted-foreground">
                  Veja todos os ajustes em tela cheia
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
