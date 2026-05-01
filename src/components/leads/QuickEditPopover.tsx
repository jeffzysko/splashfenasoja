import { useState } from "react";
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
import { Pencil, Loader2 } from "lucide-react";
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

const FIELD_LABEL: Record<"tamanho_quintal" | "prazo_compra" | "orcamento", string> = {
  tamanho_quintal: "Tamanho da piscina",
  prazo_compra: "Quando quer instalar",
  orcamento: "Valor de investimento",
};

const FIELD_OPTIONS: Record<"tamanho_quintal" | "prazo_compra" | "orcamento", ReadonlyArray<{ value: string; label: string }>> = {
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
  /** Quando true, renderiza só o conteúdo (sem trigger). Útil para inline. */
  triggerless?: boolean;
  /** Trigger customizado (ex.: ícone diferente). */
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
  const [saving, setSaving] = useState(false);

  const dirty =
    values.tamanho_quintal !== initial.tamanho_quintal ||
    values.prazo_compra !== initial.prazo_compra ||
    values.orcamento !== initial.orcamento;

  const handleSave = async () => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      // Mensagem rica: identifica o campo e as opções esperadas.
      const issue = parsed.error.issues[0];
      const path = issue?.path?.[0] as keyof typeof FIELD_LABEL | undefined;
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
    onSaved?.({ ...parsed.data, score, temperatura });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        // Impede que o clique vaze para o <Link> do card pai
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-extrabold text-secondary">Edição rápida</h4>
            <p className="text-[11px] text-muted-foreground font-semibold">
              Atualize qualificação em segundos.
            </p>
          </div>

          <Field label="Tamanho da piscina">
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

          <Field label="Valor de investimento">
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

          <Field label="Quando quer instalar">
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
              onClick={() => {
                setValues(initial);
                setOpen(false);
              }}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
