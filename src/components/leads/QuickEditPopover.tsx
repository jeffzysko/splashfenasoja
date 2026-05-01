import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2, Check } from "lucide-react";
import {
  TAMANHO_OPTIONS,
  PRAZO_OPTIONS,
  ORCAMENTO_OPTIONS,
  calcScore,
} from "@/lib/leads";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tamanhoValues = TAMANHO_OPTIONS.map((o) => o.value) as [string, ...string[]];
const prazoValues = PRAZO_OPTIONS.map((o) => o.value) as [string, ...string[]];
const orcamentoValues = ORCAMENTO_OPTIONS.map((o) => o.value) as [string, ...string[]];

type QField = "tamanho_quintal" | "prazo_compra" | "orcamento";

const FIELD_LABEL: Record<QField, string> = {
  tamanho_quintal: "Tamanho da piscina",
  prazo_compra: "Quando quer instalar",
  orcamento: "Valor de investimento",
};

const FIELD_OPTIONS: Record<QField, ReadonlyArray<{ value: string; label: string }>> = {
  tamanho_quintal: TAMANHO_OPTIONS,
  prazo_compra: PRAZO_OPTIONS,
  orcamento: ORCAMENTO_OPTIONS,
};

const schema = z.object({
  tamanho_quintal: z.enum(tamanhoValues),
  prazo_compra: z.enum(prazoValues),
  orcamento: z.enum(orcamentoValues),
});

export type QuickEditValues = z.infer<typeof schema>;

type Props = {
  leadId: string;
  initial: QuickEditValues;
  email?: string | null;
  onSaved?: (next: QuickEditValues & { score: number; temperatura: "quente" | "morno" | "frio" }) => void;
  className?: string;
  triggerless?: boolean;
  trigger?: React.ReactNode;
};

export function QuickEditPopover({
  leadId,
  initial,
  email,
  onSaved,
  className,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<QuickEditValues>(initial);
  const [baseline, setBaseline] = useState<QuickEditValues>(initial);
  const [saving, setSaving] = useState(false);
  // Último valor que ESTE popover salvou para cada campo. Persistente entre
  // aberturas. O badge "Salvo" só aparece quando o valor atual do servidor
  // (initial[f]) ainda é igual ao último valor salvo aqui — se o lead for
  // alterado externamente, o badge some automaticamente.
  const [lastSaved, setLastSaved] = useState<Record<QField, string | null>>({
    tamanho_quintal: null,
    prazo_compra: null,
    orcamento: null,
  });

  // Sincroniza baseline quando o lead muda externamente.
  useEffect(() => {
    setBaseline(initial);
    if (!open) setValues(initial);
  }, [initial.tamanho_quintal, initial.prazo_compra, initial.orcamento]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirtyFields: QField[] = (
    ["tamanho_quintal", "prazo_compra", "orcamento"] as QField[]
  ).filter((f) => values[f] !== baseline[f]);
  const dirty = dirtyFields.length > 0;
  const blocking = saving || dirty;

  // Badge "Salvo" derivado: somente para campos não modificados localmente
  // E cujo valor atual do servidor bate com o último valor salvo por aqui.
  const savedFields: Record<QField, boolean> = {
    tamanho_quintal:
      values.tamanho_quintal === baseline.tamanho_quintal &&
      lastSaved.tamanho_quintal !== null &&
      lastSaved.tamanho_quintal === initial.tamanho_quintal,
    orcamento:
      values.orcamento === baseline.orcamento &&
      lastSaved.orcamento !== null &&
      lastSaved.orcamento === initial.orcamento,
    prazo_compra:
      values.prazo_compra === baseline.prazo_compra &&
      lastSaved.prazo_compra !== null &&
      lastSaved.prazo_compra === initial.prazo_compra,
  };

  // Confirmação ao sair da página enquanto há alterações não salvas / salvamento em andamento.
  useEffect(() => {
    if (!blocking) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [blocking]);

  const recordSaved = (data: QuickEditValues, fields: QField[]) => {
    if (fields.length === 0) return;
    setLastSaved((prev) => {
      const next = { ...prev };
      for (const f of fields) next[f] = data[f];
      return next;
    });
  };

  const discardChanges = () => {
    setValues(baseline);
  };

  const tryClose = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    if (saving) {
      toast.info("Aguarde o salvamento concluir antes de fechar.");
      return;
    }
    if (dirty) {
      const labels = dirtyFields.map((f) => `• ${FIELD_LABEL[f]}`).join("\n");
      const ok = window.confirm(
        `Você tem alterações não salvas em:\n\n${labels}\n\nDeseja descartar essas alterações e fechar?`
      );
      if (!ok) return;
      discardChanges();
    }
    setOpen(false);
  };

  const handleSave = async () => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.[0] as QField | undefined;
      if (path && FIELD_LABEL[path]) {
        const allowed = FIELD_OPTIONS[path].map((o) => o.label).join(", ");
        toast.error(`"${FIELD_LABEL[path]}" inválido`, {
          description: `Selecione uma opção válida: ${allowed}.`,
        });
      } else {
        toast.error("Valores inválidos.", {
          description: issue?.message ?? "Revise os campos selecionados.",
        });
      }
      return;
    }

    setSaving(true);
    const { score, temperatura } = calcScore({
      tamanho_quintal: parsed.data.tamanho_quintal,
      prazo_compra: parsed.data.prazo_compra,
      orcamento: parsed.data.orcamento,
      email: email ?? null,
    });

    const changed = [...dirtyFields];

    const { error } = await supabase
      .from("leads")
      .update({
        tamanho_quintal: parsed.data.tamanho_quintal,
        prazo_compra: parsed.data.prazo_compra,
        orcamento: parsed.data.orcamento,
        score,
        temperatura,
      })
      .eq("id", leadId);

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar alterações.", {
        description: error.message || "Tente novamente em instantes.",
      });
      return;
    }

    toast.success("Lead atualizado!", {
      description: "Tamanho, investimento e prazo sincronizados.",
    });
    setBaseline(parsed.data);
    recordSaved(parsed.data, changed);
    onSaved?.({ ...parsed.data, score, temperatura });
  };

  return (
    <Popover open={open} onOpenChange={tryClose}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cn(
              "w-9 h-9 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center justify-center transition-colors",
              className
            )}
            aria-label="Edição rápida do lead"
            title="Edição rápida"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 rounded-2xl"
        align="end"
        onClick={(e) => e.stopPropagation()}
        onEscapeKeyDown={(e) => {
          if (blocking) {
            e.preventDefault();
            tryClose(false);
          }
        }}
        onPointerDownOutside={(e) => {
          if (blocking) {
            e.preventDefault();
            tryClose(false);
          }
        }}
        onInteractOutside={(e) => {
          if (blocking) {
            e.preventDefault();
            tryClose(false);
          }
        }}
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-extrabold text-secondary">Edição rápida</h4>
            <p className="text-[11px] text-muted-foreground font-semibold">
              Atualize qualificação em segundos.
            </p>
          </div>

          <Field label="Tamanho da piscina" saved={savedFields.tamanho_quintal}>
            <Select
              value={values.tamanho_quintal}
              onValueChange={(v) => setValues((s) => ({ ...s, tamanho_quintal: v }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TAMANHO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.emoji} {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Valor de investimento" saved={savedFields.orcamento}>
            <Select
              value={values.orcamento}
              onValueChange={(v) => setValues((s) => ({ ...s, orcamento: v }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ORCAMENTO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.emoji} {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Quando quer instalar" saved={savedFields.prazo_compra}>
            <Select
              value={values.prazo_compra}
              onValueChange={(v) => setValues((s) => ({ ...s, prazo_compra: v }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PRAZO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.emoji} {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => tryClose(false)}
              disabled={saving}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Field({
  label,
  saved,
  children,
}: {
  label: string;
  saved?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {saved && (
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider animate-in fade-in zoom-in-95"
          >
            <Check className="w-2.5 h-2.5" /> Salvo
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
