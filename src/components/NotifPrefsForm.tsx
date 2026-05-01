import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Volume2, Moon, Play } from "lucide-react";
import {
  SOUND_OPTIONS,
  soundUrl,
  type NotifPrefs,
  type NotifSound,
} from "@/lib/notifPrefs";
import { TEMP_BADGE, type Temperatura } from "@/lib/leads";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;

const TEMPS: Temperatura[] = ["quente", "morno", "frio"];

function previewSound(s: NotifSound) {
  const url = soundUrl(s);
  if (!url) return;
  try {
    const a = new Audio(url);
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

type Props = {
  prefs: NotifPrefs;
  onChange: (patch: Partial<NotifPrefs>) => void;
  compact?: boolean;
};

export function NotifPrefsForm({ prefs, onChange, compact }: Props) {
  const anyNotif = prefs.toastEnabled || prefs.soundEnabled;
  const noTempSelected = !Object.values(prefs.temperaturas).some(Boolean);

  return (
    <div className={cn("space-y-6", !compact && "space-y-8")}>
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
            onChange={(v) => onChange({ toastEnabled: v })}
          />
          <Row
            icon={<Volume2 className="w-4 h-4" />}
            title="Som de alerta"
            desc="Toca um som quando chega lead"
            checked={prefs.soundEnabled}
            onChange={(v) => onChange({ soundEnabled: v })}
          />
        </div>
      </section>

      {/* Temperaturas + Sons */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Disparar para quais leads
        </h3>
        <div className="grid gap-2">
          {TEMPS.map((t) => {
            const active = prefs.temperaturas[t];
            const badge = TEMP_BADGE[t];
            const currentSound = prefs.sons[t];
            return (
              <div
                key={t}
                className={cn(
                  "rounded-2xl border-2 transition-all overflow-hidden",
                  active
                    ? "border-primary/40 bg-primary/[0.03]"
                    : "border-border bg-muted/30 opacity-80"
                )}
              >
                <div className="flex items-center justify-between gap-3 p-3">
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
                  <Switch
                    checked={active}
                    onCheckedChange={(v) =>
                      onChange({ temperaturas: { [t]: v } as Partial<NotifPrefs["temperaturas"]> as NotifPrefs["temperaturas"] })
                    }
                  />
                </div>
                {active && prefs.soundEnabled && (
                  <div className="px-3 pb-3 pt-1 flex items-center gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">
                      Som
                    </Label>
                    <Select
                      value={currentSound}
                      onValueChange={(v) =>
                        onChange({
                          sons: { [t]: v as NotifSound } as Partial<NotifPrefs["sons"]> as NotifPrefs["sons"],
                        })
                      }
                    >
                      <SelectTrigger className="h-9 rounded-xl flex-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOUND_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => previewSound(currentSound)}
                      className="w-9 h-9 rounded-xl border border-border bg-card text-primary hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors"
                      aria-label="Tocar prévia do som"
                      title="Tocar prévia"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {noTempSelected && anyNotif && (
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
            onCheckedChange={(v) => onChange({ quietEnabled: v })}
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
            Silencia toast e som dentro do horário escolhido. Os leads continuam
            aparecendo no sino normalmente.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">
                Início
              </Label>
              <Select
                value={String(prefs.quietStart)}
                onValueChange={(v) => onChange({ quietStart: Number(v) })}
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
                onValueChange={(v) => onChange({ quietEnd: Number(v) })}
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
