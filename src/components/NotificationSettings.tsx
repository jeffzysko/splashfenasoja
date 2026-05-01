import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Volume2, VolumeX, Bell, Moon } from "lucide-react";
import { loadPrefs, savePrefs, type NotifPrefs } from "@/lib/notifPrefs";
import type { Temperatura } from "@/lib/leads";
import { TEMP_BADGE } from "@/lib/leads";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function NotificationSettings() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>(() => loadPrefs());

  useEffect(() => {
    if (open) setPrefs(loadPrefs());
  }, [open]);

  const update = (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
  };

  const toggleTemp = (t: Temperatura) => {
    const next = {
      ...prefs,
      temperaturas: { ...prefs.temperaturas, [t]: !prefs.temperaturas[t] },
    };
    setPrefs(next);
    savePrefs(next);
  };

  const anyNotif = prefs.toastEnabled || prefs.soundEnabled;
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
            Personalize quando e como você quer ser avisado.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Canais */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Canais
            </h3>
            <div className="bg-muted/40 rounded-2xl divide-y divide-border">
              <Row
                icon={<Bell className="w-4 h-4" />}
                title="Toast na tela"
                desc="Notificação visual no canto da tela"
                checked={prefs.toastEnabled}
                onChange={(v) => update({ toastEnabled: v })}
              />
              <Row
                icon={<Volume2 className="w-4 h-4" />}
                title="Som de alerta"
                desc="Toca um ding quando chega lead"
                checked={prefs.soundEnabled}
                onChange={(v) => update({ soundEnabled: v })}
              />
            </div>
          </section>

          {/* Temperaturas */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Disparar para quais leads
            </h3>
            <div className="grid gap-2">
              {(["quente", "morno", "frio"] as Temperatura[]).map((t) => {
                const active = prefs.temperaturas[t];
                const badge = TEMP_BADGE[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTemp(t)}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 rounded-2xl border-2 transition-all text-left",
                      active
                        ? "border-primary/40 bg-primary/[0.03]"
                        : "border-border bg-muted/30 opacity-70"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "text-xs font-extrabold px-2 py-0.5 rounded-full border",
                          badge.className
                        )}
                      >
                        {badge.label}
                      </span>
                      <span className="text-sm font-bold text-secondary capitalize">
                        Leads {t}s
                      </span>
                    </div>
                    <Switch checked={active} onCheckedChange={() => toggleTemp(t)} />
                  </button>
                );
              })}
            </div>
            {!Object.values(prefs.temperaturas).some(Boolean) && anyNotif && (
              <p className="text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 font-semibold">
                ⚠️ Nenhuma temperatura selecionada — você não receberá nada.
              </p>
            )}
          </section>

          {/* Quiet hours */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Não perturbe
              </h3>
              <Switch
                checked={prefs.quietEnabled}
                onCheckedChange={(v) => update({ quietEnabled: v })}
              />
            </div>
            <div
              className={cn(
                "rounded-2xl border-2 p-4 transition-all",
                prefs.quietEnabled
                  ? "border-secondary/30 bg-secondary/[0.03]"
                  : "border-border bg-muted/30 opacity-60"
              )}
            >
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Silencia toast e som dentro do horário escolhido. Os leads
                continuam aparecendo no sino normalmente.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">
                    Início
                  </Label>
                  <Select
                    value={String(prefs.quietStart)}
                    onValueChange={(v) => update({ quietStart: Number(v) })}
                    disabled={!prefs.quietEnabled}
                  >
                    <SelectTrigger className="h-11 rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {fmt(h)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">
                    Fim
                  </Label>
                  <Select
                    value={String(prefs.quietEnd)}
                    onValueChange={(v) => update({ quietEnd: Number(v) })}
                    disabled={!prefs.quietEnabled}
                  >
                    <SelectTrigger className="h-11 rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {fmt(h)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {prefs.quietEnabled && (
                <p className="text-[11px] text-muted-foreground mt-3 font-semibold">
                  <Moon className="w-3 h-3 inline mr-1" />
                  Silenciado das <strong>{fmt(prefs.quietStart)}</strong> às{" "}
                  <strong>{fmt(prefs.quietEnd)}</strong>
                  {prefs.quietStart > prefs.quietEnd && " (cruza meia-noite)"}
                </p>
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold text-secondary">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
