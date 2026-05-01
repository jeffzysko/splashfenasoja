import { useEffect, useState } from "react";
// canvas-confetti é carregado dinamicamente apenas quando uma venda é registrada
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Phone,
  MessageSquare,
  Copy,
  Mail,
  CheckCircle2,
  User,
  Clock,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { TEMP_BADGE, LABELS, formatWhatsappBR, calcScore, TAMANHO_OPTIONS, PRAZO_OPTIONS, ORCAMENTO_OPTIONS, type Temperatura } from "@/lib/leads";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export type LeadStatus = "novo" | "contatado" | "qualificado" | "vendido" | "perdido" | "descartado";

export type LeadDetail = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  cidade: string;
  estado: string;
  tamanho_quintal: string;
  prazo_compra: string;
  orcamento: string;
  score: number;
  temperatura: Temperatura;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
};

export function useLeadDetail(id: string | null) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLead(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message || "Não foi possível carregar o lead.");
          setLead(null);
        } else {
          setLead(data as LeadDetail);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { lead, setLead, loading, error };
}

type Props = {
  lead: LeadDetail;
  onUpdate?: (lead: LeadDetail) => void;
  onDeleted?: () => void;
};

export function LeadDetailView({ lead, onUpdate, onDeleted }: Props) {
  const [current, setCurrent] = useState<LeadDetail>(lead);
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingField, setSavingField] = useState<null | "tamanho_quintal" | "prazo_compra" | "orcamento">(null);
  const { user } = useSupabaseAuth();

  const TAMANHO_VALUES = TAMANHO_OPTIONS.map((o) => o.value as string);
  const PRAZO_VALUES = PRAZO_OPTIONS.map((o) => o.value as string);
  const ORCAMENTO_VALUES = ORCAMENTO_OPTIONS.map((o) => o.value as string);

  const updateQualification = async (
    field: "tamanho_quintal" | "prazo_compra" | "orcamento",
    value: string
  ) => {
    // Validação: o valor precisa pertencer ao enum correspondente.
    const allowed =
      field === "tamanho_quintal"
        ? TAMANHO_VALUES
        : field === "prazo_compra"
          ? PRAZO_VALUES
          : ORCAMENTO_VALUES;
    if (!allowed.includes(value)) {
      toast.error("Valor inválido para este campo.");
      return;
    }

    const prev = current;
    const draft = { ...current, [field]: value };
    // Recalcula score/temperatura porque os 3 campos influenciam.
    const { score, temperatura } = calcScore({
      tamanho_quintal: draft.tamanho_quintal,
      prazo_compra: draft.prazo_compra,
      orcamento: draft.orcamento,
      email: draft.email,
    });
    const next = { ...draft, score, temperatura };

    setSavingField(field);
    setCurrent(next);
    onUpdate?.(next);

    const { error } = await supabase
      .from("leads")
      .update({ [field]: value, score, temperatura })
      .eq("id", current.id);

    setSavingField(null);

    if (error) {
      setCurrent(prev);
      onUpdate?.(prev);
      toast.error("Erro ao salvar alteração.");
      return;
    }
    toast.success("Atualizado!");
  };

  const deleteLead = async () => {
    setDeleting(true);
    const { error } = await supabase.from("leads").delete().eq("id", current.id);
    setDeleting(false);
    if (error) {
      toast.error("Erro ao excluir lead.");
      return;
    }
    toast.success("Lead excluído.");
    onDeleted?.();
  };

  useEffect(() => {
    setCurrent(lead);
    setNotes(lead.notes || "");
  }, [lead]);

  const dirty = (notes || "") !== (current.notes || "");

  const fireSaleConfetti = async () => {
    const { default: confetti } = await import("canvas-confetti");
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#22c55e", "#fbbf24", "#3b82f6", "#ec4899", "#f97316"];

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors,
      zIndex: 9999,
    });

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        zIndex: 9999,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  };

  const updateStatus = async (newStatus: LeadStatus) => {
    const prev = current.status;
    const next = { ...current, status: newStatus };
    setCurrent(next);
    onUpdate?.(next);

    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", current.id);

    if (error) {
      toast.error("Erro ao atualizar status.");
      const reverted = { ...current, status: prev };
      setCurrent(reverted);
      onUpdate?.(reverted);
    } else {
      if (newStatus === "vendido" && prev !== "vendido") {
        toast.success("🏆 Parabéns! Venda registrada!");
        fireSaleConfetti();
      } else {
        toast.success(`Status alterado para ${newStatus}`);
      }
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({ notes })
      .eq("id", current.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar nota.");
      return;
    }
    const next = { ...current, notes };
    setCurrent(next);
    onUpdate?.(next);
    toast.success("Notas salvas!");
  };

  const openWhatsApp = () => {
    const firstName = current.nome.split(" ")[0];
    const sellerName =
      user?.user_metadata?.display_name || user?.email?.split("@")[0] || "da Splash";
    const text = `Oi ${firstName}, aqui é ${sellerName} da Splash! Vi que você visitou nosso stand na FENASOJA e gostaria de saber mais sobre piscinas de fibra. Posso te ajudar?`;
    window.open(
      `https://wa.me/${current.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  const copyToClipboard = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success("Copiado!");
  };

  const badge = TEMP_BADGE[current.temperatura];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center p-6 bg-card border border-border rounded-[32px] shadow-sm relative overflow-hidden">
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center font-black text-3xl mb-4 border-4",
            badge.className
          )}
        >
          {current.nome.charAt(0)}
        </div>
        <h1 className="text-2xl font-black text-secondary leading-tight">{current.nome}</h1>
        <p className="text-muted-foreground font-bold text-sm flex items-center gap-1 mt-1">
          {current.cidade}/{current.estado}
        </p>
        <div
          className={cn(
            "mt-4 text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest",
            badge.className
          )}
        >
          {current.temperatura} • {current.score} Pontos
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={openWhatsApp}
          className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-black py-7 rounded-2xl shadow-xl flex gap-3 text-lg"
        >
          <Phone className="w-6 h-6 fill-current" /> WhatsApp
        </Button>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Qualificação
        </h3>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          <InfoRow
            label="Espaço"
            value={
              LABELS.tamanho_quintal[
                current.tamanho_quintal as keyof typeof LABELS.tamanho_quintal
              ] || current.tamanho_quintal
            }
          />
          <InfoRow
            label="Prazo"
            value={
              LABELS.prazo_compra[current.prazo_compra as keyof typeof LABELS.prazo_compra] ||
              current.prazo_compra
            }
          />
          <InfoRow
            label="Orçamento"
            value={
              LABELS.orcamento[current.orcamento as keyof typeof LABELS.orcamento] ||
              current.orcamento
            }
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <User className="w-4 h-4" /> Contato
        </h3>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">
                WhatsApp
              </p>
              <p className="font-bold text-secondary">{formatWhatsappBR(current.whatsapp)}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-xl h-10 w-10 shrink-0"
              onClick={() => copyToClipboard(formatWhatsappBR(current.whatsapp))}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          {current.email && (
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">
                  E-mail
                </p>
                <p className="font-bold text-secondary break-all">{current.email}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-xl h-10 w-10"
                  onClick={() => copyToClipboard(current.email!)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <a href={`mailto:${current.email}`}>
                  <Button size="icon" variant="ghost" className="rounded-xl h-10 w-10">
                    <Mail className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Status do Atendimento
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <StatusButton
            active={current.status === "novo"}
            label="Novo"
            color="bg-blue-500"
            onClick={() => updateStatus("novo")}
          />
          <StatusButton
            active={current.status === "contatado"}
            label="Contatado"
            color="bg-amber-500"
            onClick={() => updateStatus("contatado")}
          />
          <StatusButton
            active={current.status === "qualificado"}
            label="Qualificado"
            color="bg-green-500"
            onClick={() => updateStatus("qualificado")}
          />
          <StatusButton
            active={current.status === "vendido"}
            label="🏆 Vendido"
            color="bg-emerald-600"
            onClick={() => updateStatus("vendido")}
          />
          <StatusButton
            active={current.status === "perdido"}
            label="💔 Perdido"
            color="bg-red-500"
            onClick={() => updateStatus("perdido")}
          />
          <StatusButton
            active={current.status === "descartado"}
            label="Descartado"
            color="bg-slate-500"
            onClick={() => updateStatus("descartado")}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Notas Internas
          </h3>
          {dirty && !saving && (
            <span className="text-[10px] font-bold text-amber-600 italic">
              Alterações não salvas
            </span>
          )}
        </div>
        <Textarea
          placeholder="Anote detalhes da conversa aqui..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[120px] rounded-2xl bg-card border-border focus-visible:ring-primary focus-visible:border-primary text-base py-4"
        />
        <Button
          onClick={saveNotes}
          disabled={!dirty || saving}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-6 rounded-2xl shadow-md disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
            </>
          ) : (
            "Salvar Notas"
          )}
        </Button>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Zona de Perigo
        </h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground font-black py-6 rounded-2xl"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir Lead
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir este lead?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é permanente. O lead <strong>{current.nome}</strong> e todas as
                suas notas serão removidos definitivamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteLead}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
              >
                Excluir definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <footer className="pt-6 border-t border-border/50 text-center space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-2">
          <Clock className="w-3 h-3" /> Capturado em{" "}
          {format(new Date(current.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
        <p className="text-[10px] font-bold text-muted-foreground">
          Lead ID: {current.id.slice(0, 8).toUpperCase()}
        </p>
      </footer>
    </div>
  );
}

export function LeadDetailLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Carregando lead...
      </p>
    </div>
  );
}

export function LeadDetailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <p className="font-bold text-secondary">Não foi possível carregar o lead</p>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-2">
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 flex justify-between items-center">
      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
        {label}
      </span>
      <span className="font-bold text-secondary text-right">{value}</span>
    </div>
  );
}

function StatusButton({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "py-3 rounded-xl font-black text-sm transition-all border-2",
        active
          ? cn("text-white border-transparent shadow-lg scale-100", color)
          : "bg-card border-border text-muted-foreground scale-95 opacity-70"
      )}
    >
      {label}
    </button>
  );
}
