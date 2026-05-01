import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import {
  TAMANHO_OPTIONS,
  PRAZO_OPTIONS,
  ORCAMENTO_OPTIONS,
  calcScore,
} from "@/lib/leads";
import {
  useLeadDetail,
  LeadDetailLoading,
  LeadDetailError,
  type LeadDetail,
} from "@/components/leads/LeadDetailView";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/leads/$id/edit")({
  component: LeadEditPage,
});

function LeadEditPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const { lead, loading, error } = useLeadDetail(id);
  const [form, setForm] = useState<LeadDetail | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) setForm(lead);
  }, [lead]);

  const handleChange = <K extends keyof LeadDetail>(key: K, val: LeadDetail[K]) => {
    setForm((f) => (f ? { ...f, [key]: val } : f));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);

    const { score, temperatura } = calcScore({
      prazo_compra: form.prazo_compra,
      orcamento: form.orcamento,
      email: form.email,
      tamanho_quintal: form.tamanho_quintal,
    });

    const { error } = await supabase
      .from("leads")
      .update({
        nome: form.nome,
        whatsapp: form.whatsapp,
        email: form.email || null,
        cidade: form.cidade,
        estado: form.estado,
        tamanho_quintal: form.tamanho_quintal,
        prazo_compra: form.prazo_compra,
        orcamento: form.orcamento,
        score,
        temperatura,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Lead atualizado!");
    // Invalida o cache do router pra que a página de detalhe recarregue com os dados frescos
    await router.invalidate();
    navigate({ to: "/admin/leads/$id", params: { id }, from: "/" });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/admin/leads/$id" params={{ id }} from="/">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h2 className="text-xl font-extrabold text-secondary tracking-tight">Editar Lead</h2>
      </div>

      {loading && <LeadDetailLoading />}
      {!loading && error && <LeadDetailError message={error} />}

      {!loading && !error && form && (
        <div className="space-y-5">
          <Field label="Nome">
            <Input
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              className="h-12 rounded-xl border-2"
            />
          </Field>

          <Field label="WhatsApp">
            <Input
              value={form.whatsapp}
              onChange={(e) => handleChange("whatsapp", e.target.value)}
              className="h-12 rounded-xl border-2"
            />
          </Field>

          <Field label="E-mail">
            <Input
              type="email"
              value={form.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              className="h-12 rounded-xl border-2"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cidade">
              <Input
                value={form.cidade}
                onChange={(e) => handleChange("cidade", e.target.value)}
                className="h-12 rounded-xl border-2"
              />
            </Field>
            <Field label="Estado">
              <Input
                value={form.estado}
                onChange={(e) => handleChange("estado", e.target.value.toUpperCase().slice(0, 2))}
                className="h-12 rounded-xl border-2 uppercase"
                maxLength={2}
              />
            </Field>
          </div>

          <OptionsField
            label="Tamanho do quintal"
            options={TAMANHO_OPTIONS.map((o) => ({ value: o.value, label: `${o.emoji} ${o.label}` }))}
            value={form.tamanho_quintal}
            onChange={(v) => handleChange("tamanho_quintal", v)}
          />

          <OptionsField
            label="Prazo de compra"
            options={PRAZO_OPTIONS.map((o) => ({ value: o.value, label: `${o.emoji} ${o.label}` }))}
            value={form.prazo_compra}
            onChange={(v) => handleChange("prazo_compra", v)}
          />

          <OptionsField
            label="Orçamento"
            options={ORCAMENTO_OPTIONS.map((o) => ({ value: o.value, label: `${o.emoji} ${o.label}` }))}
            value={form.orcamento}
            onChange={(v) => handleChange("orcamento", v)}
          />

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 rounded-2xl text-lg font-black shadow-lg"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" /> Salvar alterações
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-secondary font-bold uppercase text-[11px] tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function OptionsField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "text-left px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all",
              value === opt.value
                ? "bg-primary/10 border-primary text-secondary"
                : "bg-card border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Field>
  );
}
